FROM python:3.12-slim

WORKDIR /app

# Configuration de l'environnement Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Installation des dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY . .

# Exposition du port Cloud Run (défaut: 8080)
EXPOSE 8080

# Lancement de FastAPI avec Uvicorn
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}
