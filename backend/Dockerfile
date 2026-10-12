FROM python:3.12-slim

WORKDIR /app

# Configuration de l'environnement Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

# Création d'un utilisateur non-root pour Hugging Face Spaces
RUN useradd -m -u 1000 user && \
    mkdir -p /home/user/app && \
    chown -R user:user /home/user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

# Installation des dépendances
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY --chown=user:user . .

USER user

# Port Hugging Face Spaces
EXPOSE 7860

# Lancement de FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
