# Python FastAPI NLP & Paper Extraction Microservice

This microservice provides document extraction (PyMuPDF), linguistic analysis (spaCy), dense vector embeddings (sentence-transformers), and cosine similarity comparison (scikit-learn) for the **AI-Powered Research Gap Discovery Platform**.

## Architecture & Technology Stack

- **Framework**: FastAPI (Asynchronous Python 3.10+)
- **PDF Extraction**: PyMuPDF (`fitz`) with section boundary detection and page-number retention
- **Linguistic Processing**: spaCy (`en_core_web_sm`)
- **Semantic Representation**: `sentence-transformers` (`all-MiniLM-L6-v2`)
- **Matrix Operations**: `scikit-learn` (Cosine Similarity, TF-IDF, Sparse Clustering)
- **Communication**: JSON over HTTP REST APIs consumed by the Node.js Express backend adapter

## Setup Instructions

### 1. Create and Activate Virtual Environment
```bash
cd nlp_service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Required Dependencies
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 3. Start the FastAPI Service
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The interactive API documentation is available at `http://localhost:8000/docs`.

### 4. Run Pytest Suite
```bash
pytest test_nlp.py -v
```

## Node.js Express Dual-Mode Adapter

The Express backend includes an intelligent adapter (`server/services/nlpAdapter.ts`):
- When this FastAPI service is running at `http://127.0.0.1:8000`, the platform delegates heavy PDF layout analysis and vector matrix operations directly to FastAPI.
- When this service is offline or in environments where Python dependencies are not installed, the platform's native Node.js adapter executes parsing, semantic matching, and Google Gemini API processing, with real status indicators (`nlpEngine: "fastapi"` vs `"native-adapter"`).
