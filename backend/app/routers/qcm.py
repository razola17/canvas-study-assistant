"""
Router QCM - Génération et gestion des QCM
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import json

from app.database import get_db, Course, Fiche, QCM, QCMSession
from app.gemini_service import generate_qcm as ai_generate_qcm

router = APIRouter()


class QCMGenerateRequest(BaseModel):
    course_id: int
    fiche_id: Optional[int] = None
    nb_questions: int = 10
    difficulty: str = "medium"  # easy, medium, hard
    topic: Optional[str] = None


class QCMAnswerRequest(BaseModel):
    qcm_id: int
    answers: dict  # {question_id: selected_label}
    time_spent: Optional[int] = None  # en secondes


@router.post("/generate")
async def generate_qcm(
    request: QCMGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Génère un QCM pour un cours avec Gemini AI"""
    # Récupérer le cours
    result = await db.execute(select(Course).where(Course.id == request.course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")

    if not course.content and not course.syllabus:
        raise HTTPException(
            status_code=400,
            detail="Le cours n'a pas de contenu. Synchronisez d'abord le cours."
        )

    # Récupérer la fiche si spécifiée
    fiche_content = None
    if request.fiche_id:
        fiche_result = await db.execute(select(Fiche).where(Fiche.id == request.fiche_id))
        fiche = fiche_result.scalar_one_or_none()
        if fiche:
            fiche_content = fiche.content

    # Valider les paramètres
    nb_questions = max(5, min(30, request.nb_questions))
    if request.difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="Difficulté invalide (easy/medium/hard)")

    # Générer le QCM
    try:
        questions = await ai_generate_qcm(
            course_name=course.name,
            course_content=course.content or course.syllabus or "",
            nb_questions=nb_questions,
            difficulty=request.difficulty,
            topic=request.topic,
            fiche_content=fiche_content
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Gemini: {str(e)}")

    if not questions:
        raise HTTPException(status_code=500, detail="Impossible de générer le QCM. Réessayez.")

    # Sauvegarder le QCM
    topic_title = f" - {request.topic}" if request.topic else ""
    qcm = QCM(
        course_id=request.course_id,
        fiche_id=request.fiche_id,
        title=f"QCM {course.name}{topic_title}",
        questions=questions,
        nb_questions=len(questions),
        difficulty=request.difficulty,
        topic=request.topic
    )
    db.add(qcm)
    await db.commit()
    await db.refresh(qcm)

    return {
        "id": qcm.id,
        "title": qcm.title,
        "course_id": qcm.course_id,
        "nb_questions": qcm.nb_questions,
        "difficulty": qcm.difficulty,
        "topic": qcm.topic,
        "questions": qcm.questions,
        "created_at": qcm.created_at.isoformat()
    }


@router.get("/course/{course_id}")
async def list_qcm_for_course(course_id: int, db: AsyncSession = Depends(get_db)):
    """Liste tous les QCM d'un cours"""
    result = await db.execute(
        select(QCM).where(QCM.course_id == course_id).order_by(QCM.created_at.desc())
    )
    qcms = result.scalars().all()
    return [
        {
            "id": q.id,
            "title": q.title,
            "nb_questions": q.nb_questions,
            "difficulty": q.difficulty,
            "topic": q.topic,
            "created_at": q.created_at.isoformat()
        }
        for q in qcms
    ]


@router.get("/{qcm_id}")
async def get_qcm(qcm_id: int, db: AsyncSession = Depends(get_db)):
    """Récupère un QCM complet (sans les réponses pour le mode examen)"""
    result = await db.execute(select(QCM).where(QCM.id == qcm_id))
    qcm = result.scalar_one_or_none()
    if not qcm:
        raise HTTPException(status_code=404, detail="QCM non trouvé")

    # Masquer les réponses pour le mode examen
    questions_without_answers = []
    for q in qcm.questions:
        q_copy = dict(q)
        q_copy.pop("correct_answer", None)
        q_copy.pop("explanation", None)
        questions_without_answers.append(q_copy)

    return {
        "id": qcm.id,
        "title": qcm.title,
        "course_id": qcm.course_id,
        "nb_questions": qcm.nb_questions,
        "difficulty": qcm.difficulty,
        "topic": qcm.topic,
        "questions": questions_without_answers,
        "created_at": qcm.created_at.isoformat()
    }


@router.get("/{qcm_id}/with-answers")
async def get_qcm_with_answers(qcm_id: int, db: AsyncSession = Depends(get_db)):
    """Récupère un QCM avec les réponses (mode révision)"""
    result = await db.execute(select(QCM).where(QCM.id == qcm_id))
    qcm = result.scalar_one_or_none()
    if not qcm:
        raise HTTPException(status_code=404, detail="QCM non trouvé")

    return {
        "id": qcm.id,
        "title": qcm.title,
        "questions": qcm.questions
    }


@router.post("/submit")
async def submit_qcm(
    request: QCMAnswerRequest,
    db: AsyncSession = Depends(get_db)
):
    """Soumet les réponses d'un QCM et calcule le score"""
    result = await db.execute(select(QCM).where(QCM.id == request.qcm_id))
    qcm = result.scalar_one_or_none()
    if not qcm:
        raise HTTPException(status_code=404, detail="QCM non trouvé")

    # Calculer le score
    correct = 0
    total = len(qcm.questions)
    detailed_results = []

    for question in qcm.questions:
        q_id = str(question.get("id"))
        user_answer = request.answers.get(q_id)
        correct_answer = question.get("correct_answer")
        is_correct = user_answer == correct_answer

        if is_correct:
            correct += 1

        detailed_results.append({
            "question_id": q_id,
            "question": question.get("question"),
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "explanation": question.get("explanation", ""),
            "topic": question.get("topic", "")
        })

    score = (correct / total * 100) if total > 0 else 0

    # Sauvegarder la session
    session = QCMSession(
        qcm_id=request.qcm_id,
        answers=request.answers,
        score=score,
        time_spent=request.time_spent,
        completed=True
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "session_id": session.id,
        "score": round(score, 1),
        "correct": correct,
        "total": total,
        "time_spent": request.time_spent,
        "results": detailed_results,
        "grade": _get_grade(score)
    }


def _get_grade(score: float) -> str:
    """Retourne la mention en fonction du score"""
    if score >= 90:
        return "Excellent"
    elif score >= 75:
        return "Bien"
    elif score >= 60:
        return "Assez bien"
    elif score >= 50:
        return "Passable"
    else:
        return "Insuffisant"


@router.get("/sessions/{qcm_id}")
async def get_qcm_sessions(qcm_id: int, db: AsyncSession = Depends(get_db)):
    """Récupère l'historique des sessions d'un QCM"""
    result = await db.execute(
        select(QCMSession)
        .where(QCMSession.qcm_id == qcm_id)
        .order_by(QCMSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "score": s.score,
            "time_spent": s.time_spent,
            "created_at": s.created_at.isoformat()
        }
        for s in sessions
    ]


@router.delete("/{qcm_id}")
async def delete_qcm(qcm_id: int, db: AsyncSession = Depends(get_db)):
    """Supprime un QCM"""
    result = await db.execute(select(QCM).where(QCM.id == qcm_id))
    qcm = result.scalar_one_or_none()
    if not qcm:
        raise HTTPException(status_code=404, detail="QCM non trouvé")
    await db.delete(qcm)
    await db.commit()
    return {"success": True}
