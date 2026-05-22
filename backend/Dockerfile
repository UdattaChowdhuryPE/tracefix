FROM node:20-slim AS node-base
WORKDIR /app/runner
COPY runner/package*.json ./
RUN npm install
COPY runner/ ./

FROM python:3.11-slim
WORKDIR /app

# Install Node.js for the runner
RUN apt-get update && apt-get install -y curl git && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

COPY --from=node-base /app/runner /app/runner
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY agent/ ./agent/

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
