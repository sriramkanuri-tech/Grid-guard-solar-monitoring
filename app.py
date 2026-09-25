"""
Root entry point for Grid Guard Solar Monitoring FastAPI backend.
Allows running:
    python -m uvicorn app:app --reload --port 8000
directly from the repository root.
"""
import os
from backend.app import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app:app", host=host, port=port, reload=False)

