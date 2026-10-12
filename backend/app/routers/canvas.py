"""
Router Canvas - Connexion et configuration Canvas
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db, CanvasConfig
from app.canvas_client import CanvasClient

router = APIRouter()


class CanvasConfigRequest(BaseModel):
    domain: str  # ex: myschool.instructure.com
    access_token: str


class CanvasConfigResponse(BaseModel):
    id: int
    domain: str
    is_connected: bool


@router.post("/configure")
async def configure_canvas(
    config: CanvasConfigRequest,
    db: AsyncSession = Depends(get_db)
):
    """Configure la connexion Canvas avec le domaine et le token d'accès"""
    # Tester la connexion avant de sauvegarder
    client = CanvasClient(config.domain, config.access_token)
    try:
        profile = await client.test_connection()
        user_name = profile.get("name", "Utilisateur")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de se connecter à Canvas: {str(e)}"
        )

    # Sauvegarder ou mettre à jour la configuration
    result = await db.execute(select(CanvasConfig).limit(1))
    existing = result.scalar_one_or_none()

    if existing:
        existing.domain = config.domain
        existing.access_token = config.access_token
    else:
        db_config = CanvasConfig(
            domain=config.domain,
            access_token=config.access_token
        )
        db.add(db_config)

    await db.commit()

    return {
        "success": True,
        "message": f"Connexion réussie! Bienvenue, {user_name}",
        "user_name": user_name,
        "domain": config.domain
    }


@router.get("/status")
async def get_canvas_status(db: AsyncSession = Depends(get_db)):
    """Vérifie l'état de la connexion Canvas"""
    result = await db.execute(select(CanvasConfig).limit(1))
    config = result.scalar_one_or_none()

    if not config:
        return {"connected": False, "domain": None}

    # Vérifier que la connexion est toujours valide
    client = CanvasClient(config.domain, config.access_token)
    try:
        profile = await client.test_connection()
        return {
            "connected": True,
            "domain": config.domain,
            "user_name": profile.get("name", ""),
            "user_email": profile.get("primary_email", "")
        }
    except Exception:
        return {"connected": False, "domain": config.domain, "error": "Token invalide ou expiré"}


@router.delete("/disconnect")
async def disconnect_canvas(db: AsyncSession = Depends(get_db)):
    """Déconnecte Canvas en supprimant la configuration"""
    result = await db.execute(select(CanvasConfig).limit(1))
    config = result.scalar_one_or_none()
    if config:
        await db.delete(config)
        await db.commit()
    return {"success": True, "message": "Déconnecté de Canvas"}
