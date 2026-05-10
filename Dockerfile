FROM python:3.11-slim

WORKDIR /app

# Copy backend files
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Railway provides PORT env variable
ENV PORT=8000
EXPOSE 8000

# Start command using PORT from environment
CMD python -m uvicorn server:app --host 0.0.0.0 --port $PORT
