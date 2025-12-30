# Backend Dockerfile for TableChat
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy workspace config and backend project files
COPY pyproject.toml uv.lock ./
COPY backend/pyproject.toml backend/README.md ./backend/

# Install dependencies using uv (workspace mode)
RUN uv sync --frozen --project backend

# Copy application code
COPY backend/app ./backend/app

# Create data directory for SQLite
RUN mkdir -p /data && chmod 777 /data

# Expose port
EXPOSE 7888

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATABASE_PATH=/data/scinew.db

# Change to backend directory
WORKDIR /app/backend

# Use shell form to ensure data directory exists at runtime
CMD mkdir -p /data && uv run uvicorn app.main:app --host 0.0.0.0 --port 7888

