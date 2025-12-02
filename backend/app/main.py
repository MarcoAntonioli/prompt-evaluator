from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from .database import init_db
from .routers import prompts, stream

app = FastAPI(title="OCI LLM Comparison Demo", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Include routers
app.include_router(prompts.router)
app.include_router(stream.router)


@app.get("/")
def root():
    return {"message": "OCI LLM Comparison Demo API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
