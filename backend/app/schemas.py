from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class ModelResponseSchema(BaseModel):
    id: int
    model_name: str
    response_text: str
    time_to_first_token: float
    total_time: float
    created_at: datetime

    class Config:
        from_attributes = True


class PromptCreate(BaseModel):
    text: str


class PromptResponse(BaseModel):
    id: int
    text: str
    created_at: datetime
    model_responses: List[ModelResponseSchema] = []

    class Config:
        from_attributes = True


class PromptListItem(BaseModel):
    id: int
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


class StreamUpdate(BaseModel):
    model_name: str
    token: Optional[str] = None
    time_to_first_token: Optional[float] = None
    total_time: Optional[float] = None
    is_complete: bool = False
    error: Optional[str] = None

