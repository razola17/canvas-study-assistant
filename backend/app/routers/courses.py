"""
Router Courses - Extraction et gestion des cours Canvas
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db, CanvasConfig, Course
from app.canvas_client import CanvasClient

router = APIRouter()


async def get_canvas_client(db: AsyncSession) -> CanvasClient:
    """Récupère le client Canvas configuré"""
    result = await db.execute(select(CanvasConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=401,
            detail="Canvas non configuré. Veuillez d'abord connecter votre compte Canvas."
        )
    return CanvasClient(config.domain, config.access_token)


@router.get("/list")
async def list_courses(db: AsyncSession = Depends(get_db)):
    """Liste tous les cours sauvegardés en local"""
    result = await db.execute(select(Course).order_by(Course.synced_at.desc()))
    courses = result.scalars().all()
    return [
        {
            "id": c.id,
            "canvas_id": c.canvas_id,
            "name": c.name,
            "course_code": c.course_code,
            "description": c.description,
            "term": c.term,
            "synced_at": c.synced_at.isoformat() if c.synced_at else None,
            "has_content": bool(c.content),
            "content_length": len(c.content) if c.content else 0
        }
        for c in courses
    ]


@router.get("/available")
async def list_available_courses(db: AsyncSession = Depends(get_db)):
    """Liste les cours disponibles depuis Canvas (sans les sauvegarder)"""
    client = await get_canvas_client(db)
    try:
        canvas_courses = await client.get_courses()
        return [
            {
                "canvas_id": c.get("id"),
                "name": c.get("name", "Sans nom"),
                "course_code": c.get("course_code", ""),
                "enrollment_type": c.get("enrollments", [{}])[0].get("type", "") if c.get("enrollments") else "",
                "term": c.get("term", {}).get("name", "") if c.get("term") else "",
                "has_syllabus": bool(c.get("syllabus_body"))
            }
            for c in canvas_courses
            if c.get("name")  # Filtrer les cours sans nom
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Canvas: {str(e)}")


@router.post("/sync/{canvas_course_id}")
async def sync_course(
    canvas_course_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Synchronise un cours spécifique depuis Canvas"""
    client = await get_canvas_client(db)

    # Récupérer les infos du cours
    try:
        courses = await client.get_courses()
        course_data = next((c for c in courses if c.get("id") == canvas_course_id), None)
        if not course_data:
            raise HTTPException(status_code=404, detail="Cours non trouvé sur Canvas")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

    # Vérifier si le cours existe déjà en DB
    result = await db.execute(
        select(Course).where(Course.canvas_id == canvas_course_id)
    )
    course = result.scalar_one_or_none()

    syllabus = CanvasClient.clean_html(course_data.get("syllabus_body", "") or "")

    if not course:
        course = Course(
            canvas_id=canvas_course_id,
            name=course_data.get("name", ""),
            course_code=course_data.get("course_code", ""),
            description=CanvasClient.clean_html(course_data.get("public_description", "") or ""),
            syllabus=syllabus,
            term=course_data.get("term", {}).get("name", "") if course_data.get("term") else "",
            enrollment_type=course_data.get("enrollments", [{}])[0].get("type", "") if course_data.get("enrollments") else "",
        )
        db.add(course)
        await db.commit()
        await db.refresh(course)
    else:
        course.name = course_data.get("name", course.name)
        course.syllabus = syllabus

    # Lancer l'extraction du contenu en arrière-plan
    course_id = course.id
    background_tasks.add_task(
        extract_course_content_bg,
        course_id, canvas_course_id, client, db
    )

    return {
        "success": True,
        "course_id": course.id,
        "message": f"Cours '{course.name}' en cours de synchronisation...",
        "status": "syncing"
    }


async def extract_course_content_bg(
    course_id: int,
    canvas_course_id: int,
    client: CanvasClient,
    db: AsyncSession
):
    """Tâche d'arrière-plan pour extraire le contenu complet du cours"""
    try:
        content = await client.get_full_course_content(canvas_course_id)

        result = await db.execute(select(Course).where(Course.id == course_id))
        course = result.scalar_one_or_none()
        if course:
            course.content = content
            course.synced_at = datetime.utcnow()
            await db.commit()
    except Exception as e:
        print(f"Erreur extraction cours {course_id}: {e}")


@router.get("/{course_id}")
async def get_course(course_id: int, db: AsyncSession = Depends(get_db)):
    """Récupère les détails d'un cours sauvegardé"""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")

    return {
        "id": course.id,
        "canvas_id": course.canvas_id,
        "name": course.name,
        "course_code": course.course_code,
        "description": course.description,
        "syllabus": course.syllabus,
        "content": course.content,
        "term": course.term,
        "synced_at": course.synced_at.isoformat() if course.synced_at else None
    }


@router.delete("/{course_id}")
async def delete_course(course_id: int, db: AsyncSession = Depends(get_db)):
    """Supprime un cours sauvegardé"""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    await db.delete(course)
    await db.commit()
    return {"success": True}
