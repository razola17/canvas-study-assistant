"""
Router Export - Export PDF des fiches et QCM
"""
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import textwrap
import re

from app.database import get_db, Course, Fiche, QCM

router = APIRouter()


def clean_markdown(text: str) -> str:
    """Retire les marqueurs Markdown pour le PDF"""
    if not text:
        return ""
    # Headers
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Bold/Italic
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
    text = re.sub(r'_{1,3}(.*?)_{1,3}', r'\1', text)
    # Code
    text = re.sub(r'`{1,3}(.*?)`{1,3}', r'\1', text, flags=re.DOTALL)
    # Links
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    return text.strip()


def create_fiche_pdf(fiche: Fiche, course: Course) -> bytes:
    """Génère le PDF d'une fiche de révision"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    story = []

    # Style titre
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=20,
        textColor=colors.HexColor('#1a56db'),
        spaceAfter=10,
        alignment=TA_CENTER
    )
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#6b7280'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    heading2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1a56db'),
        spaceBefore=15,
        spaceAfter=8,
        borderPad=4,
    )
    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        leading=15,
        alignment=TA_JUSTIFY
    )
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontSize=10,
        leftIndent=20,
        spaceAfter=4,
        leading=14
    )

    # En-tête
    story.append(Paragraph(fiche.title, title_style))
    story.append(Paragraph(f"Cours: {course.name} | {course.course_code or ''}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1a56db')))
    story.append(Spacer(1, 0.5*cm))

    # Résumé
    if fiche.summary:
        story.append(Paragraph("📌 Résumé", heading2_style))
        story.append(Paragraph(clean_markdown(fiche.summary), body_style))
        story.append(Spacer(1, 0.3*cm))

    # Concepts clés
    if fiche.key_concepts:
        story.append(Paragraph("🔑 Concepts Clés", heading2_style))
        concepts = fiche.key_concepts if isinstance(fiche.key_concepts, list) else []
        for concept in concepts:
            story.append(Paragraph(f"• {concept}", bullet_style))
        story.append(Spacer(1, 0.3*cm))

    # Contenu principal (parser le Markdown basique)
    if fiche.content:
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph("📚 Contenu Détaillé", heading2_style))

        lines = fiche.content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                story.append(Spacer(1, 0.2*cm))
            elif line.startswith('# '):
                story.append(Paragraph(line[2:], heading2_style))
            elif line.startswith('## '):
                p_style = ParagraphStyle('H3', parent=styles['Heading3'], fontSize=12,
                                         textColor=colors.HexColor('#374151'), spaceBefore=10)
                story.append(Paragraph(line[3:], p_style))
            elif line.startswith('### '):
                p_style = ParagraphStyle('H4', parent=styles['Heading4'], fontSize=11,
                                         textColor=colors.HexColor('#4b5563'), spaceBefore=8)
                story.append(Paragraph(line[4:], p_style))
            elif line.startswith('- ') or line.startswith('* '):
                story.append(Paragraph(f"• {clean_markdown(line[2:])}", bullet_style))
            elif line.startswith('**') and line.endswith('**'):
                bold_style = ParagraphStyle('Bold', parent=body_style, fontSize=10)
                story.append(Paragraph(f"<b>{clean_markdown(line)}</b>", bold_style))
            else:
                story.append(Paragraph(clean_markdown(line), body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def create_qcm_pdf(qcm: QCM, course: Course, include_answers: bool = False) -> bytes:
    """Génère le PDF d'un QCM"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle('Title', parent=styles['Title'],
                                  fontSize=18, textColor=colors.HexColor('#1a56db'),
                                  alignment=TA_CENTER, spaceAfter=5)
    meta_style = ParagraphStyle('Meta', parent=styles['Normal'],
                                 fontSize=10, textColor=colors.HexColor('#6b7280'),
                                 alignment=TA_CENTER, spaceAfter=15)
    question_style = ParagraphStyle('Question', parent=styles['Normal'],
                                     fontSize=11, textColor=colors.HexColor('#111827'),
                                     spaceBefore=15, spaceAfter=8, fontName='Helvetica-Bold')
    option_style = ParagraphStyle('Option', parent=styles['Normal'],
                                   fontSize=10, leftIndent=15, spaceAfter=4)
    correct_style = ParagraphStyle('Correct', parent=styles['Normal'],
                                    fontSize=10, leftIndent=15, spaceAfter=4,
                                    textColor=colors.HexColor('#059669'))
    explanation_style = ParagraphStyle('Explanation', parent=styles['Normal'],
                                        fontSize=9, leftIndent=15, spaceAfter=8,
                                        textColor=colors.HexColor('#6b7280'),
                                        fontName='Helvetica-Oblique')

    difficulty_colors = {"easy": "#10b981", "medium": "#f59e0b", "hard": "#ef4444"}
    diff_color = difficulty_colors.get(qcm.difficulty, "#6b7280")

    story.append(Paragraph(qcm.title, title_style))
    story.append(Paragraph(
        f"Cours: {course.name} | {qcm.nb_questions} questions | "
        f"Difficulté: {qcm.difficulty.upper()}" +
        (f" | Thème: {qcm.topic}" if qcm.topic else ""),
        meta_style
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1a56db')))
    story.append(Spacer(1, 0.5*cm))

    # Questions
    for i, question in enumerate(qcm.questions, 1):
        story.append(Paragraph(
            f"Question {i}: {question.get('question', '')}",
            question_style
        ))

        correct = question.get("correct_answer", "")
        for option in question.get("options", []):
            label = option.get("label", "")
            text = option.get("text", "")
            if include_answers and label == correct:
                story.append(Paragraph(
                    f"✓ {label}. {text}",
                    correct_style
                ))
            else:
                story.append(Paragraph(f"○ {label}. {text}", option_style))

        if include_answers and question.get("explanation"):
            story.append(Paragraph(
                f"💡 {question.get('explanation', '')}",
                explanation_style
            ))

        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e5e7eb')))

    if include_answers:
        story.append(PageBreak())
        story.append(Paragraph("Tableau des réponses", title_style))
        story.append(Spacer(1, 0.5*cm))
        table_data = [["N°", "Réponse correcte", "Thème"]]
        for i, q in enumerate(qcm.questions, 1):
            table_data.append([str(i), q.get("correct_answer", ""), q.get("topic", "")])

        table = Table(table_data, colWidths=[1.5*cm, 4*cm, 10*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a56db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(table)

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


@router.get("/fiche/{fiche_id}")
async def export_fiche_pdf(fiche_id: int, db: AsyncSession = Depends(get_db)):
    """Exporte une fiche en PDF"""
    result = await db.execute(select(Fiche).where(Fiche.id == fiche_id))
    fiche = result.scalar_one_or_none()
    if not fiche:
        raise HTTPException(status_code=404, detail="Fiche non trouvée")

    course_result = await db.execute(select(Course).where(Course.id == fiche.course_id))
    course = course_result.scalar_one_or_none()

    pdf_bytes = create_fiche_pdf(fiche, course)

    filename = f"fiche_{fiche.title.replace(' ', '_')[:50]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/qcm/{qcm_id}")
async def export_qcm_pdf(
    qcm_id: int,
    include_answers: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Exporte un QCM en PDF (avec ou sans réponses)"""
    result = await db.execute(select(QCM).where(QCM.id == qcm_id))
    qcm = result.scalar_one_or_none()
    if not qcm:
        raise HTTPException(status_code=404, detail="QCM non trouvé")

    course_result = await db.execute(select(Course).where(Course.id == qcm.course_id))
    course = course_result.scalar_one_or_none()

    pdf_bytes = create_qcm_pdf(qcm, course, include_answers=include_answers)

    suffix = "_avec_reponses" if include_answers else ""
    filename = f"qcm_{qcm.title.replace(' ', '_')[:40]}{suffix}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
