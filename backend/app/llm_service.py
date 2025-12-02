import os
import time
from typing import Dict, Optional, Callable
from langchain_oci import OCIGenAI
from langchain_core.callbacks import BaseCallbackHandler


class TimingCallbackHandler(BaseCallbackHandler):
    """Callback handler to track timing metrics"""

    def __init__(self):
        self.first_token_time: Optional[float] = None
        self.start_time = time.time()
        self.first_token_received = False

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        """Called when a new token is generated"""
        if not self.first_token_received:
            self.first_token_time = time.time() - self.start_time
            self.first_token_received = True


class LLMService:
    """Service for managing OCI LLM interactions"""

    def __init__(self):
        self.compartment_id = os.getenv("COMPARTMENT_OCID")
        if not self.compartment_id:
            raise ValueError("COMPARTMENT_OCID environment variable is required")

        # Service endpoint (adjust region as needed)
        self.service_endpoint = os.getenv(
            "OCI_SERVICE_ENDPOINT",
            "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com",
        )

        # Initialize models
        self.models = {
            "cohere": self._init_model("cohere", os.getenv("OCI_COHERE_MODEL_ID")),
            "gemini": self._init_model("gemini", os.getenv("OCI_GEMINI_MODEL_ID")),
            "grok": self._init_model("grok", os.getenv("OCI_GROK_MODEL_ID")),
            "llama": self._init_model("llama", os.getenv("OCI_LLAMA_MODEL_ID")),
        }

    def _init_model(
        self, model_name: str, model_id: Optional[str]
    ) -> Optional[OCIGenAI]:
        """Initialize a single OCI model"""
        if not model_id:
            print(
                f"Warning: {model_name} model ID not provided, skipping initialization"
            )
            return None

        try:
            return OCIGenAI(
                model_id=model_id,
                # service_endpoint=self.service_endpoint,
                compartment_id=self.compartment_id,
                is_stream=True,
                # model_kwargs={"temperature": 0.7, "max_tokens": 1000},
            )
        except Exception as e:
            print(f"Error initializing {model_name} model: {e}")
            return None

    def generate_with_metrics(
        self,
        model_name: str,
        prompt: str,
        stream_callback: Optional[Callable[[str, Dict], None]] = None,
    ) -> tuple[str, float, float]:
        """
        Generate response with timing metrics

        Returns:
            tuple: (response_text, time_to_first_token, total_time)
        """
        model = self.models.get(model_name)
        if not model:
            raise ValueError(f"Model {model_name} is not available")

        callback_handler = TimingCallbackHandler()
        start_time = time.time()

        try:
            # Stream the response
            response_parts = []
            for chunk in model.stream(prompt, callbacks=[callback_handler]):
                if hasattr(chunk, "content"):
                    token = chunk.content
                else:
                    token = str(chunk)

                response_parts.append(token)

                # Call stream callback if provided
                if stream_callback:
                    metrics = {
                        "time_to_first_token": callback_handler.first_token_time,
                        "elapsed_time": time.time() - start_time,
                    }
                    stream_callback(token, metrics)

            response_text = "".join(response_parts)
            end_time = time.time()
            total_time = end_time - start_time

            # Ensure we have time_to_first_token
            time_to_first_token = callback_handler.first_token_time
            if time_to_first_token is None:
                # If no tokens were streamed, set to total_time
                time_to_first_token = total_time

            return response_text, time_to_first_token, total_time

        except Exception as e:
            raise Exception(f"Error generating response from {model_name}: {str(e)}")

    def get_available_models(self) -> list[str]:
        """Get list of available model names"""
        return [name for name, model in self.models.items() if model is not None]
