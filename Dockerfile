# ===============================================================
# Grid Guard Solar Monitoring - Production FastAPI Backend
# Optimized for Google Cloud Run / Container Deployments
# ===============================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app

# Install system dependencies (curl for health check, build tools if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy application source code and model artifacts
COPY backend /app/backend
COPY ml-server /app/ml-server
COPY app.py /app/app.py

# Expose standard Cloud Run port
EXPOSE 8080

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Launch uvicorn listening on 0.0.0.0 and Cloud Run's dynamic $PORT
CMD exec uvicorn app:app --host 0.0.0.0 --port ${PORT}
