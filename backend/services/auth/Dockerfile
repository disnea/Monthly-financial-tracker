FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY services/auth/requirements.txt ./services/auth/
RUN pip install --no-cache-dir -r services/auth/requirements.txt

# Copy shared code (changes less frequently)
COPY shared/ ./shared/

# Copy service code (changes most frequently)
COPY services/auth/ ./services/auth/

ENV PYTHONPATH=/app

# Use --reload for hot-reloading in development
CMD ["uvicorn", "services.auth.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
