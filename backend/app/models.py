from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    model_responses = relationship("ModelResponse", back_populates="prompt", cascade="all, delete-orphan")


class ModelResponse(Base):
    __tablename__ = "model_responses"

    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    model_name = Column(String, nullable=False)  # 'cohere', 'gemini', 'grok', 'llama'
    response_text = Column(Text, nullable=False)
    time_to_first_token = Column(Float, nullable=False)  # in seconds
    total_time = Column(Float, nullable=False)  # in seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    prompt = relationship("Prompt", back_populates="model_responses")

