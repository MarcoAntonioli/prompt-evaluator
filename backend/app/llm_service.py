import os
import time
import httpx
from typing import Dict, Optional, Callable, Union
from langchain_oci import ChatOCIGenAI
from langchain_openai import ChatOpenAI
from oci_openai import OciUserPrincipalAuth


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

        # Model registry - maps model key to model_id (without oci/ prefix)
        # Only includes models that have environment variables set
        self.model_registry = {}

        # xAI Grok Models
        self._add_model_if_configured("xai.grok-4", "OCI_XAI_GROK_4_MODEL_ID")
        self._add_model_if_configured(
            "xai.grok-4-fast-reasoning", "OCI_XAI_GROK_4_FAST_REASONING_MODEL_ID"
        )
        self._add_model_if_configured(
            "xai.grok-4-fast-non-reasoning",
            "OCI_XAI_GROK_4_FAST_NON_REASONING_MODEL_ID",
        )
        self._add_model_if_configured("xai.grok-3", "OCI_XAI_GROK_3_MODEL_ID")
        self._add_model_if_configured("xai.grok-3-fast", "OCI_XAI_GROK_3_FAST_MODEL_ID")
        self._add_model_if_configured("xai.grok-3-mini", "OCI_XAI_GROK_3_MINI_MODEL_ID")
        self._add_model_if_configured(
            "xai.grok-3-mini-fast", "OCI_XAI_GROK_3_MINI_FAST_MODEL_ID"
        )

        # Meta Llama Models
        self._add_model_if_configured(
            "meta.llama-4-maverick-17b-128e-instruct-fp8",
            "OCI_META_LLAMA_4_MAVERICK_17B_128E_INSTRUCT_FP8_MODEL_ID",
        )
        self._add_model_if_configured(
            "meta.llama-4-scout-17b-16e-instruct",
            "OCI_META_LLAMA_4_SCOUT_17B_16E_INSTRUCT_MODEL_ID",
        )
        self._add_model_if_configured(
            "meta.llama-3.3-70b-instruct", "OCI_META_LLAMA_3_3_70B_INSTRUCT_MODEL_ID"
        )
        self._add_model_if_configured(
            "meta.llama-3.1-405b-instruct", "OCI_META_LLAMA_3_1_405B_INSTRUCT_MODEL_ID"
        )

        # Cohere Models
        self._add_model_if_configured(
            "cohere.command-latest", "OCI_COHERE_COMMAND_LATEST_MODEL_ID"
        )
        self._add_model_if_configured(
            "cohere.command-a-03-2025", "OCI_COHERE_COMMAND_A_03_2025_MODEL_ID"
        )
        self._add_model_if_configured(
            "cohere.command-plus-latest", "OCI_COHERE_COMMAND_PLUS_LATEST_MODEL_ID"
        )

        # Google Gemini Models
        self._add_model_if_configured(
            "google.gemini-2.5-pro", "OCI_GOOGLE_GEMINI_2_5_PRO_MODEL_ID"
        )
        self._add_model_if_configured(
            "google.gemini-2.5-flash", "OCI_GOOGLE_GEMINI_2_5_FLASH_MODEL_ID"
        )
        self._add_model_if_configured(
            "google.gemini-2.5-flash-lite", "OCI_GOOGLE_GEMINI_2_5_FLASH_LITE_MODEL_ID"
        )

        # Initialize models lazily (on-demand)
        self.models: Dict[str, Optional[Union[ChatOCIGenAI, ChatOpenAI]]] = {}

    def _add_model_if_configured(self, model_key: str, env_var_name: str):
        """Add model to registry if environment variable is set"""
        model_id = os.getenv(env_var_name)
        if model_id:
            # Remove 'oci/' prefix if present
            if model_id.startswith("oci/"):
                model_id = model_id[4:]
            self.model_registry[model_key] = model_id

    def _init_model(
        self, model_key: str, model_id: str
    ) -> Optional[Union[ChatOCIGenAI, ChatOpenAI]]:
        """Initialize a single OCI model"""
        if not model_id:
            print(
                f"Warning: {model_key} model ID not provided, skipping initialization"
            )
            return None

        try:
            # Use ChatOpenAI with OciUserPrincipalAuth for xAI Grok models
            if model_key.startswith("xai."):
                return ChatOpenAI(
                    model=model_id,  # Use model_id directly without oci/ prefix
                    api_key="OCI",
                    base_url="https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/20231130/actions/v1",
                    http_client=httpx.Client(
                        auth=OciUserPrincipalAuth(profile_name="DEFAULT"),
                        headers={"CompartmentId": self.compartment_id},
                    ),
                    temperature=0.7,
                    streaming=True,
                )
            else:
                # Use ChatOCIGenAI for other models (Llama, Cohere)
                return ChatOCIGenAI(
                    model_id=model_id,  # Use model_id directly without oci/ prefix
                    compartment_id=self.compartment_id,
                    is_stream=True,
                )
        except Exception as e:
            print(f"Error initializing {model_key} model: {e}")
            return None

    def _get_or_init_model(
        self, model_key: str
    ) -> Optional[Union[ChatOCIGenAI, ChatOpenAI]]:
        """Get model instance, initializing if needed"""
        if model_key not in self.models:
            model_id = self.model_registry.get(model_key)
            if model_id:
                self.models[model_key] = self._init_model(model_key, model_id)
            else:
                self.models[model_key] = None
        return self.models.get(model_key)

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
        model = self._get_or_init_model(model_name)
        if not model:
            raise ValueError(f"Model {model_name} is not available")

        start_time = time.time()
        first_token_time = None
        first_token_received = False

        try:
            # Convert prompt to messages format for ChatOCIGenAI
            messages = [{"role": "user", "content": prompt}]

            # Stream the response
            response_parts = []
            for chunk in model.stream(messages):
                # Track time to first token
                if not first_token_received:
                    first_token_time = time.time() - start_time
                    first_token_received = True

                if hasattr(chunk, "content"):
                    token = chunk.content
                else:
                    token = str(chunk)

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
        """Get list of available model keys from registry"""
        return list(self.model_registry.keys())

    def get_model_registry(self) -> Dict[str, str]:
        """Get the full model registry"""
        return self.model_registry.copy()
