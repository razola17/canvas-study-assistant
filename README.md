# Canvas Study Assistant 🎓

Une application web complète pour **extraire vos cours Canvas Instructure**, générer des **fiches de révision** et des **QCM** grâce à l'IA Google Gemini.

## ✨ Fonctionnalités

- 📚 **Extraction automatique** des cours Canvas (modules, pages, devoirs)
- 📝 **Fiches de révision** générées par IA (Gemini) avec concepts clés et résumés  
- ✅ **QCM personnalisables** : nombre de questions, difficulté (facile/moyen/difficile), thème
- 📊 **Correction interactive** avec explications détaillées
- 📄 **Export PDF** des fiches et QCM (avec ou sans réponses)
- 💾 **Sauvegarde locale** (SQLite) de tous vos cours et résultats
- ⏱️ **Chronomètre** lors des QCM

## 🚀 Démarrage rapide

### Prérequis
- Python 3.10+
- Node.js 18+
- Une clé API [Google Gemini](https://aistudio.google.com/app/apikey) (gratuite)
- Un token d'accès Canvas (dans Compte → Paramètres → Tokens d'accès)

### Installation & Lancement

1. **Double-cliquez sur `start.bat`** — cela installe tout automatiquement et lance l'application

2. **Ou manuellement :**

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Editez .env et ajoutez GEMINI_API_KEY=votre_cle
uvicorn main:app --reload --port 8000

# Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
```

3. Ouvrez **http://localhost:5173** dans votre navigateur

### Configuration

Créez `backend/.env` :
```
GEMINI_API_KEY=votre_cle_api_gemini
```

## 🏗️ Architecture

```
canvas-study-assistant/
├── backend/                    # FastAPI Python
│   ├── main.py                 # Point d'entrée
│   ├── app/
│   │   ├── database.py         # Modèles SQLite
│   │   ├── canvas_client.py    # Client API Canvas
│   │   ├── gemini_service.py   # Service IA Gemini
│   │   └── routers/
│   │       ├── canvas.py       # Connexion Canvas
│   │       ├── courses.py      # Gestion des cours
│   │       ├── fiches.py       # Fiches de révision
│   │       ├── qcm.py          # QCM & scoring
│   │       └── export.py       # Export PDF
│   └── requirements.txt
├── frontend/                   # React TypeScript
│   └── src/
│       ├── api.ts              # Client API typé
│       ├── pages/
│       │   ├── SetupPage.tsx   # Configuration Canvas
│       │   ├── CoursesPage.tsx # Liste des cours
│       │   ├── CoursePage.tsx  # Détail d'un cours
│       │   ├── FichePage.tsx   # Lecture d'une fiche
│       │   ├── QCMPage.tsx     # Passage d'un QCM
│       │   └── QCMResultPage.tsx # Résultats
│       └── components/
│           ├── Layout.tsx
│           └── QCMGeneratorModal.tsx
└── start.bat                   # Lancement Windows
```

## 📖 Utilisation

1. **Connexion Canvas** : Entrez votre domaine et token d'accès
2. **Importer un cours** : Cliquez "Importer depuis Canvas" → Sélectionnez vos cours
3. **Générer une fiche** : Ouvrez un cours → "Générer une fiche"
4. **Créer un QCM** : "Créer un QCM" → Configurez les paramètres → Gemini génère les questions
5. **Passer le QCM** : Répondez aux questions avec le chronomètre
6. **Voir les résultats** : Score, mention, corrigé détaillé avec explications
7. **Exporter en PDF** : Fiches et QCM téléchargeables
