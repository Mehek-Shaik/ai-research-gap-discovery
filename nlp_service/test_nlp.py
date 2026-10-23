"""
Unit and integration tests for FastAPI NLP microservice
Run with: pytest test_nlp.py
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    """Verify health endpoint responds with operational status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "engines" in data

def test_spacy_analyze_endpoint():
    """Verify linguistic analysis and tokenization endpoint."""
    sample_text = (
        "Federated learning enables edge devices to collaboratively train machine learning models "
        "while keeping training data decentralized. However, non-IID data distribution remains a severe bottleneck."
    )
    response = client.post("/spacy-analyze", json={"text": sample_text})
    assert response.status_code == 200
    data = response.json()
    assert "token_count" in data
    assert "sentence_count" in data
    assert data["sentence_count"] >= 1

def test_compare_papers_endpoint():
    """Verify cross-paper semantic similarity calculation."""
    papers_payload = {
        "papers": [
            {
                "id": "p1",
                "title": "Federated Learning Optimization",
                "abstract": "We study communication efficiency in decentralized edge networks.",
                "methodology": "Quantized gradients with asynchronous aggregation.",
                "limitations": "High packet loss degrades convergence."
            },
            {
                "id": "p2",
                "title": "Bio-Signal Transformers on Wearables",
                "abstract": "We analyze energy consumption for ECG anomaly detection.",
                "methodology": "4-bit integer quantization on microcontrollers.",
                "limitations": "Motion artifacts degrade sensitivity."
            }
        ]
    }
    response = client.post("/compare-papers", json=papers_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["papers_count"] == 2
    assert len(data["similarity_matrix"]) == 2
    # Self-similarity should be 1.0 (or close to 1.0)
    assert abs(data["similarity_matrix"][0]["similarities"][0] - 1.0) < 0.05
