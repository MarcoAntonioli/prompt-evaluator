from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from ..database import get_db
from ..models import Prompt
from ..schemas import PromptCreate, PromptResponse, PromptListItem

# Model registry mapping - maps model keys to their environment variable names
# This is used to determine which models are available based on env vars
MODEL_ENV_MAP = {
    # xAI Grok Models
    "xai.grok-4": "OCI_XAI_GROK_4_MODEL_ID",
    "xai.grok-4-fast-reasoning": "OCI_XAI_GROK_4_FAST_REASONING_MODEL_ID",
    "xai.grok-4-fast-non-reasoning": "OCI_XAI_GROK_4_FAST_NON_REASONING_MODEL_ID",
    "xai.grok-3": "OCI_XAI_GROK_3_MODEL_ID",
    "xai.grok-3-fast": "OCI_XAI_GROK_3_FAST_MODEL_ID",
    "xai.grok-3-mini": "OCI_XAI_GROK_3_MINI_MODEL_ID",
    "xai.grok-3-mini-fast": "OCI_XAI_GROK_3_MINI_FAST_MODEL_ID",
    # Meta Llama Models
    "meta.llama-4-maverick-17b-128e-instruct-fp8": "OCI_META_LLAMA_4_MAVERICK_17B_128E_INSTRUCT_FP8_MODEL_ID",
    "meta.llama-4-scout-17b-16e-instruct": "OCI_META_LLAMA_4_SCOUT_17B_16E_INSTRUCT_MODEL_ID",
    "meta.llama-3.3-70b-instruct": "OCI_META_LLAMA_3_3_70B_INSTRUCT_MODEL_ID",
    "meta.llama-3.1-405b-instruct": "OCI_META_LLAMA_3_1_405B_INSTRUCT_MODEL_ID",
    # Cohere Models
    "cohere.command-latest": "OCI_COHERE_COMMAND_LATEST_MODEL_ID",
    "cohere.command-a-03-2025": "OCI_COHERE_COMMAND_A_03_2025_MODEL_ID",
    "cohere.command-plus-latest": "OCI_COHERE_COMMAND_PLUS_LATEST_MODEL_ID",
    # Google Gemini Models
    "google.gemini-2.5-pro": "OCI_GOOGLE_GEMINI_2_5_PRO_MODEL_ID",
    "google.gemini-2.5-flash": "OCI_GOOGLE_GEMINI_2_5_FLASH_MODEL_ID",
    "google.gemini-2.5-flash-lite": "OCI_GOOGLE_GEMINI_2_5_FLASH_LITE_MODEL_ID",
}


def get_available_model_registry():
    """Get model registry based on environment variables"""
    import os

    registry = {}
    for model_key, env_var in MODEL_ENV_MAP.items():
        model_id = os.getenv(env_var)
        if model_id:
            # Remove 'oci/' prefix if present
            if model_id.startswith("oci/"):
                model_id = model_id[4:]
            registry[model_key] = model_id
    return registry


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
    # Return all models from MODEL_ENV_MAP, regardless of whether env vars are set
    # This allows users to see all available models in the UI
    organized = {"xAI Grok": [], "Meta Llama": [], "Cohere": [], "Google Gemini": []}

    for model_key in MODEL_ENV_MAP.keys():
        if model_key.startswith("xai."):
            organized["xAI Grok"].append(model_key)
        elif model_key.startswith("meta."):
            organized["Meta Llama"].append(model_key)
        elif model_key.startswith("cohere."):
            organized["Cohere"].append(model_key)
        elif model_key.startswith("google."):
            organized["Google Gemini"].append(model_key)

    return organized
