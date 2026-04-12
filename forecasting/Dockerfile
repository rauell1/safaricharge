FROM python:3.11-slim
WORKDIR /app

# Install OS-level deps for numpy/scipy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libgfortran5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "pv_load_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
