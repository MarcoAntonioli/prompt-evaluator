from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Load environment variables from .env file
load_dotenv()

from .database import init_db
from .routers import prompts, stream

# Global variable to store LiteLLM proxy process
litellm_process = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage LiteLLM proxy lifecycle"""
    global litellm_process

    # Start LiteLLM proxy
    litellm_port = os.getenv("LITELLM_PORT", "4000")
    config_path = Path(__file__).parent.parent / "config.yaml"

    if not config_path.exists():
        raise FileNotFoundError(
            f"LiteLLM config file not found at {config_path}. "
            "Please ensure config.yaml exists in the backend directory."
        )

    print(f"Starting LiteLLM proxy on port {litellm_port}...")

    try:
        # Start LiteLLM proxy server
        litellm_process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "litellm",
                "--config",
                str(config_path),
                "--port",
                litellm_port,
                "--host",
                "0.0.0.0",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        # Wait a moment for the server to start
        import time

        time.sleep(2)

        # Check if process is still running
        if litellm_process.poll() is not None:
            stdout, stderr = litellm_process.communicate()
            raise RuntimeError(
                f"LiteLLM proxy failed to start.\n"
                f"STDOUT: {stdout}\n"
                f"STDERR: {stderr}"
            )

        print(f"LiteLLM proxy started successfully on port {litellm_port}")

    except Exception as e:
        print(f"Error starting LiteLLM proxy: {e}")
        if litellm_process:
            litellm_process.terminate()
        raise

    yield

    # Shutdown LiteLLM proxy
    if litellm_process:
        print("Shutting down LiteLLM proxy...")
        litellm_process.terminate()
        try:
            litellm_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            litellm_process.kill()
        print("LiteLLM proxy stopped")


app = FastAPI(title="OCI LLM Comparison Demo", version="1.0.0", lifespan=lifespan)

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
