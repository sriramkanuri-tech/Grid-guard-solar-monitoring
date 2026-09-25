"""
Root entry point for Grid Guard Solar Monitoring FastAPI backend.
Allows running:
    python -m uvicorn app:app --reload --port 8000
directly from the repository root.
"""
from backend.app import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
