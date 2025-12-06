#!/usr/bin/env python3
"""
Generate LiteLLM config.yaml from environment variables
"""
import os
import yaml
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get OCI credentials from environment
oci_credentials_base = {
    "drop_params": True,  # Automatically drop unsupported parameters
    "oci_user": os.getenv("OCI_USER_OCID"),
    "oci_fingerprint": os.getenv("OCI_FINGERPRINT"),
    "oci_tenancy": os.getenv("OCI_TENANCY_OCID"),
    "oci_region": os.getenv("OCI_REGION", "us-chicago-1"),
    "oci_key_file": os.getenv("OCI_KEY_FILE"),
    "oci_compartment_id": os.getenv("OCI_COMPARTMENT_ID"),
    "oci_serving_mode": "ON_DEMAND",  # Optional: ON_DEMAND or DEDICATED
}

# Verify required credentials
required = [
    "oci_user",
    "oci_fingerprint",
    "oci_tenancy",
    "oci_key_file",
    "oci_compartment_id",
]
missing = [key for key in required if not oci_credentials_base.get(key)]
if missing:
    raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

# Define all models
models = [
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

# Build config structure
# Each model needs both model_name and model in litellm_params
config = {
    "model_list": [
        {
            "model_name": model,
            "litellm_params": {
                **oci_credentials_base,
                "model": model,  # Explicitly set the model parameter
            },
        }
        for model in models
    ],
}

# Write config.yaml
config_path = Path(__file__).parent / "config.yaml"
with open(config_path, "w") as f:
    yaml.dump(config, f, default_flow_style=False, sort_keys=False)

print(f"Generated config.yaml at {config_path}")
print(f"Configured {len(models)} models")
