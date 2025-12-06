# OCI LLM Comparison Demo

A web application that compares multiple Large Language Models (LLMs) hosted on Oracle Cloud Infrastructure (OCI), including Cohere, Gemini, Grok, and Llama. The application measures and visualizes performance metrics including time to first token and total generation time.

## Features

- **Real-time Model Comparison**: Submit a prompt and watch all models generate responses simultaneously
- **Performance Metrics**: Track time to first token and total generation time for each model
- **Beautiful Visualizations**: Interactive charts comparing model performance
- **History**: View all past prompts and their results
- **Streaming Responses**: Real-time streaming of model responses using Server-Sent Events (SSE)

## Architecture

- **Backend**: FastAPI (Python) with SQLAlchemy for database management
- **Frontend**: React with Vite, React Router, and Recharts for visualizations
- **Database**: SQLite for storing prompts and responses
- **LLM Integration**: Uses LiteLLM proxy for OpenAI-compatible API access to OCI Generative AI models

## Prerequisites

- Python 3.9+
- Node.js 16+
- OCI account with access to Generative AI models
- OCI API credentials (user OCID, fingerprint, tenancy OCID, private key file, compartment OCID)

## Setup

### Backend Setup

1. Install `uv` if you haven't already:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# Or using pip: pip install uv
```

2. Navigate to the backend directory:
```bash
cd backend
```

3. Install dependencies using `uv`:
```bash
uv sync
```

4. Create a `.env` file in the `backend` directory:
```bash
cp .env.example .env
```

5. Edit `.env` with your OCI credentials:
   - `OCI_USER_OCID`: Your OCI user OCID (**required**)
   - `OCI_FINGERPRINT`: Your OCI API key fingerprint (**required**)
   - `OCI_TENANCY_OCID`: Your OCI tenancy OCID (**required**)
   - `OCI_REGION`: Your OCI region (default: `us-chicago-1`, **optional**)
   - `OCI_KEY_FILE`: Absolute path to your OCI API private key file (**required**)
     - Example: `/Users/yourname/.oci/oci_api_key.pem`
     - **Note**: Use absolute paths (the `~` tilde is not expanded by LiteLLM)
   - `OCI_COMPARTMENT_ID`: Your OCI compartment OCID (**required**)
   - `DATABASE_URL`: Database URL (**optional**, defaults to SQLite)
   - `LITELLM_PORT`: Port for LiteLLM proxy (**optional**, defaults to `4000`)

   **Note**: All models are configured in `config.yaml` and available automatically. No need to configure individual model IDs.

6. Ensure your OCI API key file has appropriate permissions:
```bash
chmod 600 /path/to/your/oci_api_key.pem
```

7. Run the backend server using `uv`:
```bash
uv run uvicorn app.main:app --reload --port 8000
```

   The LiteLLM proxy will start automatically on port 4000 (or the port specified in `LITELLM_PORT`). The FastAPI server runs on port 8000.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

1. **Home Page**: Enter a prompt in the text area and click "Compare Models"
2. **Real-time View**: Watch as all models generate responses simultaneously
3. **Statistics**: After completion, view performance metrics and charts
4. **History**: Navigate to the History page to see all past prompts
5. **Details**: Click on any prompt in the history to view detailed results

## API Endpoints

- `POST /api/prompts` - Submit a new prompt
- `GET /api/prompts` - Get all prompts
- `GET /api/prompts/{prompt_id}` - Get detailed results for a prompt
- `GET /api/prompts/{prompt_id}/stream` - Stream real-time updates (SSE)
- `GET /api/prompts/models/registry` - Get available models organized by provider

## Available Models

All models are configured via LiteLLM and use the `oci/` prefix:

**xAI Grok Models:**
- `oci/xai.grok-4`
- `oci/xai.grok-4-fast-reasoning`
- `oci/xai.grok-4-fast-non-reasoning`
- `oci/xai.grok-3`
- `oci/xai.grok-3-fast`
- `oci/xai.grok-3-mini`
- `oci/xai.grok-3-mini-fast`
- `oci/xai.grok-code-fast-1`

**Meta Llama Models:**
- `oci/meta.llama-4-maverick-17b-128e-instruct-fp8`
- `oci/meta.llama-4-scout-17b-16e-instruct`
- `oci/meta.llama-3.3-70b-instruct`
- `oci/meta.llama-3.2-90b-vision-instruct`
- `oci/meta.llama-3.1-405b-instruct`

**Cohere Models:**
- `oci/cohere.command-latest`
- `oci/cohere.command-a-03-2025`
- `oci/cohere.command-plus-latest`

**Google Gemini Models:**
- `oci/google.gemini-2.5-pro`
- `oci/google.gemini-2.5-flash`
- `oci/google.gemini-2.5-flash-lite`

## Environment Variables

- `OCI_USER_OCID`: Your OCI user OCID (required)
- `OCI_FINGERPRINT`: Your OCI API key fingerprint (required)
- `OCI_TENANCY_OCID`: Your OCI tenancy OCID (required)
- `OCI_REGION`: OCI region (optional, defaults to `us-chicago-1`)
- `OCI_KEY_FILE`: Absolute path to OCI API private key file (required)
- `OCI_COMPARTMENT_ID`: Your OCI compartment OCID (required)
- `DATABASE_URL`: Database connection URL (optional, defaults to SQLite)
- `LITELLM_PORT`: Port for LiteLLM proxy (optional, defaults to `4000`)

## How It Works

The application uses **LiteLLM** as a proxy server that provides OpenAI API compatibility for all OCI Generative AI models. This approach:

1. **Simplifies Authentication**: OCI credentials are configured once in `config.yaml` and environment variables
2. **Unified API**: All models are accessed through the standard OpenAI SDK format
3. **Automatic Proxy**: LiteLLM proxy starts automatically when the FastAPI app starts
4. **Streaming Support**: Full support for streaming responses with metrics tracking

The LiteLLM proxy runs embedded within the FastAPI application and handles all OCI authentication and model routing automatically.

## Notes

- Make sure your OCI credentials are properly configured in the `.env` file
- The OCI API private key file must exist at the path specified in `OCI_KEY_FILE`
- Use absolute paths for `OCI_KEY_FILE` (the `~` tilde is not expanded)
- The LiteLLM proxy starts automatically on app startup
- Model IDs are configured in `config.yaml` - no need to set individual model environment variables

## Troubleshooting

If the LiteLLM proxy fails to start:
- Check that `config.yaml` exists in the `backend` directory
- Verify all required environment variables are set in `.env`
- Ensure the OCI API key file path is correct and accessible
- Check that the proxy port (default 4000) is not already in use
