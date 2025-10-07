# apps/api/Dockerfile
FROM python:3.11-slim

# system deps required for bcrypt and other wheels
RUN apt-get update && apt-get install -y \
    gcc libffi-dev libssl-dev build-essential curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy requirements and install first for layer caching
COPY requirements.txt .

# upgrade pip and install dependencies
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# copy application code
COPY . .

# expose port 8000
EXPOSE 8000

# run the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
