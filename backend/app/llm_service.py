import os
import time
from typing import Dict, Optional, Callable
from openai import OpenAI


class LLMService:
    """Service for managing OCI LLM interactions via LiteLLM proxy"""

    def __init__(self, proxy_base_url: str = None):
        """
        Initialize LLM service with LiteLLM proxy

        Args:
            proxy_base_url: Base URL for LiteLLM proxy (default: http://localhost:4000/v1)
        """
        # Get proxy URL from environment or use default
        proxy_port = os.getenv("LITELLM_PORT", "4000")
        self.proxy_base_url = proxy_base_url or f"http://localhost:{proxy_port}/v1"

        # Initialize OpenAI client pointing to LiteLLM proxy
        self.client = OpenAI(
            api_key="sk-any-string",  # Required by client but not validated by LiteLLM
            base_url=self.proxy_base_url,
        )

        # Model registry - all available OCI models via LiteLLM
        # Using LiteLLM naming format: oci/model-name
        self.model_registry = {
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
        }

    def generate_with_metrics(
        self,
        model_name: str,
        prompt: str,
        stream_callback: Optional[Callable[[str, Dict], None]] = None,
    ) -> tuple[str, float, float]:
        """
        Generate response with timing metrics using OpenAI-compatible API via LiteLLM

        Args:
            model_name: Model name in LiteLLM format (e.g., "oci/xai.grok-4")
            prompt: Input prompt text
            stream_callback: Optional callback function for streaming tokens

        Returns:
            tuple: (response_text, time_to_first_token, total_time)
        """
        if model_name not in self.model_registry:
            raise ValueError(f"Model {model_name} is not available in registry")

        start_time = time.time()
        first_token_time = None
        first_token_received = False

        try:
            # Convert prompt to messages format
            messages = [{"role": "user", "content": prompt}]

            # Stream the response using OpenAI SDK
            response_parts = []
            stream = self.client.chat.completions.create(
                model=model_name,
                messages=messages,
                stream=True,
                temperature=0.7,
            )

            for chunk in stream:
                # Track time to first token
                if not first_token_received:
                    first_token_time = time.time() - start_time
                    first_token_received = True

                # Extract content from chunk
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if hasattr(delta, "content") and delta.content:
                        token = delta.content
                        response_parts.append(token)

                        # Call stream callback if provided
                        if stream_callback:
                            metrics = {
                                "time_to_first_token": first_token_time,
                                "elapsed_time": time.time() - start_time,
                            }
                            stream_callback(token, metrics)

            response_text = "".join(response_parts)
            end_time = time.time()
            total_time = end_time - start_time

            # Ensure we have time_to_first_token
            if first_token_time is None:
                # If no tokens were streamed, set to total_time
                first_token_time = total_time

            return response_text, first_token_time, total_time

        except Exception as e:
            raise Exception(f"Error generating response from {model_name}: {str(e)}")

    def get_available_models(self) -> list[str]:
        """Get list of available model names from registry"""
        return sorted(list(self.model_registry))

    def get_model_registry(self) -> Dict[str, str]:
        """Get the full model registry (for compatibility)"""
        # Return dict mapping model name to itself (no model IDs needed with LiteLLM)
        return {model: model for model in self.model_registry}
