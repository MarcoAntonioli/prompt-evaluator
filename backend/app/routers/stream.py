from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db, SessionLocal
from ..models import Prompt, ModelResponse
from ..schemas import StreamUpdate
from ..llm_service import LLMService
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from queue import Queue
from threading import Thread

router = APIRouter(prefix="/api/prompts", tags=["stream"])
llm_service = LLMService()
executor = ThreadPoolExecutor(max_workers=4)


def convert_to_litellm_model_name(display_name: str) -> str:
    """Convert display model name (e.g., 'xai.grok-4') to LiteLLM format (e.g., 'oci/xai.grok-4')"""
    if display_name.startswith("oci/"):
        return display_name
    return f"oci/{display_name}"


def generate_with_streaming(
    model_name: str, prompt_text: str, prompt_id: int, update_queue: Queue
):
    """Generate response with streaming updates sent to queue"""
    db_session = SessionLocal()

    def stream_callback(token: str, metrics: dict):
        """Callback for streaming tokens"""
        # Convert LiteLLM model name back to display name for frontend
        display_name = (
            model_name.replace("oci/", "")
            if model_name.startswith("oci/")
            else model_name
        )
        update = StreamUpdate(
            model_name=display_name,
            token=token,
            time_to_first_token=metrics.get("time_to_first_token"),
            total_time=metrics.get("elapsed_time"),
            is_complete=False,
        )
        update_queue.put(update.dict())

    try:
        response_text, time_to_first_token, total_time = (
            llm_service.generate_with_metrics(
                model_name, prompt_text, stream_callback=stream_callback
            )
        )

        # Convert LiteLLM model name back to display name for database and frontend
        display_name = (
            model_name.replace("oci/", "")
            if model_name.startswith("oci/")
            else model_name
        )

        # Save to database
        model_response = ModelResponse(
            prompt_id=prompt_id,
            model_name=display_name,
            response_text=response_text,
            time_to_first_token=time_to_first_token,
            total_time=total_time,
        )
        db_session.add(model_response)
        db_session.commit()

        # Send completion update
        completion_update = StreamUpdate(
            model_name=display_name,
            time_to_first_token=time_to_first_token,
            total_time=total_time,
            is_complete=True,
        )
        update_queue.put(completion_update.dict())

    except Exception as e:
        # Convert LiteLLM model name back to display name for frontend
        display_name = (
            model_name.replace("oci/", "")
            if model_name.startswith("oci/")
            else model_name
        )
        error_update = StreamUpdate(
            model_name=display_name, is_complete=True, error=str(e)
        )
        update_queue.put(error_update.dict())
    finally:
        db_session.close()


async def stream_generator(
    prompt_id: int,
    prompt_text: str,
    db: Session,
    selected_models: Optional[List[str]] = None,
):
    """Generator function for SSE streaming"""
    # Get available models
    all_available_models = llm_service.get_available_models()

    if not all_available_models:
        yield f"data: {json.dumps({'error': 'No models available'})}\n\n"
        return

    # Filter to selected models if provided, otherwise use all available
    if selected_models:
        # Convert display names to LiteLLM model names
        litellm_model_names = [
            convert_to_litellm_model_name(m) for m in selected_models
        ]
        available_models = [m for m in litellm_model_names if m in all_available_models]
        # Create mapping from display names to LiteLLM names for tracking
        display_to_litellm = {
            name: convert_to_litellm_model_name(name) for name in selected_models
        }
        expected_display_names = selected_models
    else:
        available_models = all_available_models
        # Create mapping from LiteLLM names to display names
        display_to_litellm = {m.replace("oci/", ""): m for m in all_available_models}
        expected_display_names = [m.replace("oci/", "") for m in all_available_models]

    # Create a shared queue for all model updates
    update_queue = Queue()

    # Start all model generations in separate threads
    threads = []
    for model_name in available_models:
        thread = Thread(
            target=generate_with_streaming,
            args=(model_name, prompt_text, prompt_id, update_queue),
        )
        thread.start()
        threads.append(thread)

    # Track completed models using display names
    completed_models = set()

    try:
        # Stream updates as they arrive
        while len(completed_models) < len(expected_display_names):
            try:
                # Get update from queue with timeout
                update = update_queue.get(timeout=0.1)

                # Send update via SSE
                yield f"data: {json.dumps(update)}\n\n"

                # Check if this model is complete
                if update.get("is_complete"):
                    # Use display name for tracking
                    completed_models.add(update.get("model_name"))

            except Exception:
                # Timeout or empty queue, continue checking
                await asyncio.sleep(0.05)
                continue

    finally:
        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=5)


@router.get("/{prompt_id}/stream")
async def stream_prompt(
    prompt_id: int,
    db: Session = Depends(get_db),
    models: Optional[List[str]] = Query(None, description="List of model names to run"),
):
    """Stream real-time updates as models generate responses"""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    return StreamingResponse(
        stream_generator(prompt_id, prompt.text, db, selected_models=models),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
