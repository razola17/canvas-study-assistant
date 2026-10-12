"""
Router Fiches - Génération et gestion des fiches de révision
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, Course, Fiche
from app.gemini_service import generate_fiche

router = APIRouter()


@router.post("/generate/{course_id}")
async def generate_fiche_for_course(
    course_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Génère une fiche de révision pour un cours avec Gemini AI"""
    # Récupérer le cours
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")

    if not course.content and not course.syllabus:
        raise HTTPException(
            status_code=400,
            detail="Le cours n'a pas encore de contenu extrait. Synchronisez d'abord le cours."
        )

    # Générer la fiche avec Gemini
    try:
        fiche_data = await generate_fiche(
            course_name=course.name,
            course_content=course.content or "",
            syllabus=course.syllabus or ""
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Gemini: {str(e)}")

    # Sauvegarder la fiche
    fiche = Fiche(
        course_id=course_id,
        title=fiche_data.get("title", f"Fiche - {course.name}"),
        content=fiche_data.get("content", ""),
        summary=fiche_data.get("summary", ""),
        key_concepts=fiche_data.get("key_concepts", [])
    )
    db.add(fiche)
    await db.commit()
    await db.refresh(fiche)

    return {
        "id": fiche.id,
        "course_id": fiche.course_id,
        "title": fiche.title,
        "content": fiche.content,
        "summary": fiche.summary,
        "key_concepts": fiche.key_concepts,
        "created_at": fiche.created_at.isoformat()
    }


@router.get("/course/{course_id}")
async def get_fiches_for_course(course_id: int, db: AsyncSession = Depends(get_db)):
    """Liste toutes les fiches d'un cours"""
    result = await db.execute(
        select(Fiche).where(Fiche.course_id == course_id).order_by(Fiche.created_at.desc())
    )
    fiches = result.scalars().all()
    return [
        {
            "id": f.id,
            "title": f.title,
            "summary": f.summary,
            "key_concepts": f.key_concepts,
            "created_at": f.created_at.isoformat()
        }
        for f in fiches
    ]


@router.get("/{fiche_id}")
async def get_fiche(fiche_id: int, db: AsyncSession = Depends(get_db)):
    """Récupère une fiche complète"""
    result = await db.execute(select(Fiche).where(Fiche.id == fiche_id))
    fiche = result.scalar_one_or_none()
    if not fiche:
        raise HTTPException(status_code=404, detail="Fiche non trouvée")

    return {
        "id": fiche.id,
        "course_id": fiche.course_id,
        "title": fiche.title,
        "content": fiche.content,
        "summary": fiche.summary,
        "key_concepts": fiche.key_concepts,
        "created_at": fiche.created_at.isoformat()
    }


@router.delete("/{fiche_id}")
async def delete_fiche(fiche_id: int, db: AsyncSession = Depends(get_db)):
    """Supprime une fiche"""
    result = await db.execute(select(Fiche).where(Fiche.id == fiche_id))
    fiche = result.scalar_one_or_none()
    if not fiche:
        raise HTTPException(status_code=404, detail="Fiche non trouvée")
    await db.delete(fiche)
    await db.commit()
    return {"success": True}
