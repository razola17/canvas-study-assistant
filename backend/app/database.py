"""
Database configuration and models using SQLAlchemy + aiosqlite
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON, Boolean, ForeignKey
from datetime import datetime

import os

DB_DIR = "/tmp" if (os.getenv("K_SERVICE") or os.getenv("FUNCTION_TARGET") or os.getenv("SPACE_ID")) else "."
DATABASE_URL = f"sqlite+aiosqlite:///{DB_DIR}/canvas_study.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


class CanvasConfig(Base):
    """Configuration de la connexion Canvas"""
    __tablename__ = "canvas_config"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, nullable=False)  # ex: myschool.instructure.com
    access_token = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Course(Base):
    """Cours extrait depuis Canvas"""
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    canvas_id = Column(Integer, unique=True, nullable=False)
    name = Column(String, nullable=False)
    course_code = Column(String)
    description = Column(Text)
    syllabus = Column(Text)
    content = Column(Text)  # Contenu combiné de tous les modules/pages
    enrollment_type = Column(String)
    term = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    synced_at = Column(DateTime)


class Fiche(Base):
    """Fiche de révision générée par l'IA"""
    __tablename__ = "fiches"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # Markdown structuré
    summary = Column(Text)
    key_concepts = Column(JSON)  # Liste des concepts clés
    created_at = Column(DateTime, default=datetime.utcnow)


class QCM(Base):
    """QCM généré par l'IA"""
    __tablename__ = "qcm"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    fiche_id = Column(Integer, ForeignKey("fiches.id"), nullable=True)
    title = Column(String, nullable=False)
    questions = Column(JSON, nullable=False)  # Liste de questions avec options et réponses
    nb_questions = Column(Integer, default=10)
    difficulty = Column(String, default="medium")  # easy, medium, hard
    topic = Column(String)  # Thème spécifique optionnel
    created_at = Column(DateTime, default=datetime.utcnow)


class QCMSession(Base):
    """Session de passage d'un QCM"""
    __tablename__ = "qcm_sessions"

    id = Column(Integer, primary_key=True, index=True)
    qcm_id = Column(Integer, ForeignKey("qcm.id"), nullable=False)
    answers = Column(JSON)  # Réponses de l'utilisateur
    score = Column(Float)  # Score en pourcentage
    time_spent = Column(Integer)  # Temps en secondes
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


async def init_db():
    """Initialise la base de données"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


_db_initialized = False

async def get_db():
    """Dépendance FastAPI pour la session DB"""
    global _db_initialized
    if not _db_initialized:
        await init_db()
        _db_initialized = True
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
