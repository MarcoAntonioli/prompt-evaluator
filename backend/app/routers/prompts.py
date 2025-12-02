from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Prompt
from ..schemas import PromptCreate, PromptResponse, PromptListItem

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

