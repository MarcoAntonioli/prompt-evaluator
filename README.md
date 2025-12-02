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
- **LLM Integration**: Uses `langchain_oci` for OCI model integration

## Prerequisites

- Python 3.8+
- Node.js 16+
- OCI account with access to Generative AI models
- Compartment OCID and model IDs for the models you want to use

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

4. Create a `.env` file in the `backend` directory (copy from `.env.example`):
```bash
cp .env.example .env
```

5. Edit `.env` with your OCI credentials. Open the `.env` file and replace the placeholder values:
   - `COMPARTMENT_OCID`: Your OCI compartment OCID (required)
   - `OCI_COHERE_MODEL_ID`: Cohere model ID (optional, comment out if not using)
   - `OCI_GEMINI_MODEL_ID`: Gemini model ID (optional, comment out if not using)
   - `OCI_GROK_MODEL_ID`: Grok model ID (optional, comment out if not using)
   - `OCI_LLAMA_MODEL_ID`: Llama model ID (optional, comment out if not using)
   - `OCI_SERVICE_ENDPOINT`: OCI service endpoint (optional, has default)
   - `DATABASE_URL`: Database URL (optional, defaults to SQLite)

   **Note**: You need at least one model configured. Comment out models you don't want to use by adding `#` at the start of the line.

6. Run the backend server using `uv`:
```bash
uv run uvicorn app.main:app --reload --port 8000
```

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

## Environment Variables

- `COMPARTMENT_OCID`: Your OCI compartment OCID (required)
- `OCI_COHERE_MODEL_ID`: Cohere model ID
- `OCI_GEMINI_MODEL_ID`: Gemini model ID
- `OCI_GROK_MODEL_ID`: Grok model ID
- `OCI_LLAMA_MODEL_ID`: Llama model ID
- `OCI_SERVICE_ENDPOINT`: OCI service endpoint (optional, has default)
- `DATABASE_URL`: Database connection URL (optional, defaults to SQLite)

## Notes

- Make sure your OCI credentials are properly configured (via OCI config file or environment variables)
- The application requires at least one model to be configured
- Model IDs may vary depending on your OCI region and available models

