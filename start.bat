@echo off
echo ============================================
echo  Canvas Study Assistant - Demarrage
echo ============================================
echo.

REM Verifier que Python est installe
python --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Python n'est pas installe
    pause
    exit /b 1
)

REM Verifier que Node.js est installe
node --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Node.js n'est pas installe
    pause
    exit /b 1
)

REM Creer le virtualenv si necessaire
if not exist "backend\venv" (
    echo Creation de l'environnement virtuel Python...
    python -m venv backend\venv
)

REM Activer le venv et installer les dependances backend
echo Installation des dependances backend...
call backend\venv\Scripts\activate.bat
pip install -r backend\requirements.txt -q

REM Verifier le fichier .env
if not exist "backend\.env" (
    echo.
    echo ATTENTION: Le fichier backend\.env n'existe pas !
    echo Copiez backend\.env.example vers backend\.env
    echo et ajoutez votre cle API Gemini.
    echo.
    copy backend\.env.example backend\.env
    echo Fichier .env cree. Editez-le et ajoutez votre GEMINI_API_KEY
    pause
)

REM Demarrer le backend en arriere-plan
echo.
echo Demarrage du backend (port 8000)...
start "Canvas Study Backend" cmd /c "cd backend && venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

REM Attendre que le backend demarre
timeout /t 3 /nobreak >nul

REM Demarrer le frontend
echo Demarrage du frontend (port 5173)...
cd frontend
start "Canvas Study Frontend" cmd /c "npm run dev"
cd ..

echo.
echo ============================================
echo  Application demarree !
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo  API Docs: http://localhost:8000/docs
echo ============================================
echo.
echo Ouverture du navigateur...
timeout /t 2 /nobreak >nul
start http://localhost:5173

pause
