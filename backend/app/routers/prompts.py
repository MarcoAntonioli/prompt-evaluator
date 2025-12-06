from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from ..database import get_db
from ..models import Prompt
from ..schemas import PromptCreate, PromptResponse, PromptListItem
from ..llm_service import LLMService

# Initialize LLM service to get available models
llm_service = LLMService()

# Model registry - using LiteLLM naming format (oci/model-name)
# All models are available via LiteLLM config.yaml
MODEL_LIST = [
    # xAI Grok Models
    "oci/xai.grok-4",
    "oci/xai.grok-4-fast-reasoning",
    "oci/xai.grok-4-fast-non-reasoning",
    "oci/xai.grok-3",
    "oci/xai.grok-3-fast",
    "oci/xai.grok-3-mini",
    "oci/xai.grok-3-mini-fast",
    "oci/xai.grok-code-fast-1",
    # Meta Llama Models
    "oci/meta.llama-4-maverick-17b-128e-instruct-fp8",
    "oci/meta.llama-4-scout-17b-16e-instruct",
    "oci/meta.llama-3.3-70b-instruct",
    "oci/meta.llama-3.2-90b-vision-instruct",
    "oci/meta.llama-3.1-405b-instruct",
    # Cohere Models
    "oci/cohere.command-latest",
    "oci/cohere.command-a-03-2025",
    "oci/cohere.command-plus-latest",
    # Google Gemini Models
    "oci/google.gemini-2.5-pro",
    "oci/google.gemini-2.5-flash",
    "oci/google.gemini-2.5-flash-lite",
]


router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.post("", response_model=PromptResponse, status_code=201)
async def create_prompt(prompt: PromptCreate, db: Session = Depends(get_db)):
    """Create a new prompt record (responses are generated via streaming endpoint)"""
    # Create prompt record
    db_prompt = Prompt(text=prompt.text)
    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)

    return db_prompt


@router.get("", response_model=List[PromptListItem])
def get_prompts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all prompts"""
    prompts = db.query(Prompt).offset(skip).limit(limit).all()
    return prompts


@router.get("/{prompt_id}", response_model=PromptResponse)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    """Get a specific prompt with all model responses"""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt


@router.get("/models/registry")
def get_model_registry() -> Dict[str, List[str]]:
    """Get the model registry organized by provider"""
    # Return all models from MODEL_LIST, organized by provider
    organized = {"xAI Grok": [], "Meta Llama": [], "Cohere": [], "Google Gemini": []}

    for model_name in MODEL_LIST:
        # Remove 'oci/' prefix for display
        display_name = model_name.replace("oci/", "")

        if model_name.startswith("oci/xai."):
            organized["xAI Grok"].append(display_name)
        elif model_name.startswith("oci/meta."):
            organized["Meta Llama"].append(display_name)
        elif model_name.startswith("oci/cohere."):
            organized["Cohere"].append(display_name)
        elif model_name.startswith("oci/google."):
            organized["Google Gemini"].append(display_name)

    return organized
