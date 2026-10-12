"""
Canvas Study Assistant - Main FastAPI Application
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.database import init_db
from app.routers import canvas, courses, fiches, qcm, export

load_dotenv()

app = FastAPI(
    title="Canvas Study Assistant",
    description="Extrait vos cours Canvas et génère des fiches de révision et QCM avec l'IA",
    version="1.0.0"
)

# CORS pour le frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://smartlearner-575f3.web.app",
        "https://smartlearner-575f3.firebaseapp.com",
    ],
    allow_origin_regex=r"https://.*\.web\.app|https://.*\.firebaseapp\.com|https://.*\.onrender\.com|http://localhost:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await init_db()

# Inclure tous les routeurs
app.include_router(canvas.router, prefix="/api/canvas", tags=["Canvas"])
app.include_router(courses.router, prefix="/api/courses", tags=["Cours"])
app.include_router(fiches.router, prefix="/api/fiches", tags=["Fiches"])
app.include_router(qcm.router, prefix="/api/qcm", tags=["QCM"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])

@app.get("/")
async def root():
    return {"message": "Canvas Study Assistant API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Point d'entrée Firebase Cloud Functions (2nd Gen)
try:
    from firebase_functions import https_fn, options
    from a2wsgi import ASGIMiddleware

    wsgi_app = ASGIMiddleware(app)

    @https_fn.on_request(
        cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post", "put", "delete", "options"]),
        memory=512,
        timeout_sec=120
    )
    def api(req: https_fn.Request) -> https_fn.Response:
        return https_fn.Response.from_app(wsgi_app, req.environ)
except ImportError:
    pass
