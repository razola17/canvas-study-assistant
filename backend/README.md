# Canvas Study Assistant - Backend

## Configuration

1. Créez un fichier `.env` dans ce dossier :

```env
GEMINI_API_KEY=votre_cle_api_gemini
```

2. Installez les dépendances :
```bash
pip install -r requirements.txt
```

3. Lancez le serveur :
```bash
uvicorn main:app --reload --port 8000
```

L'API sera disponible sur `http://localhost:8000`
La documentation interactive : `http://localhost:8000/docs`
