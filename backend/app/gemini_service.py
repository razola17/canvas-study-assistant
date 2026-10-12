"""
Gemini AI Service - Génère fiches et QCM avec Google Gemini
"""
import json
import re
import os
import google.generativeai as genai
from typing import Optional


def get_gemini_client():
    """Initialise le client Gemini"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY non défini dans les variables d'environnement")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


async def generate_fiche(
    course_name: str,
    course_content: str,
    syllabus: str = ""
) -> dict:
    """
    Génère une fiche de révision structurée pour un cours
    
    Returns:
        dict avec title, content (markdown), summary, key_concepts
    """
    model = get_gemini_client()

    # Limiter le contenu pour éviter les dépassements de tokens
    max_content_length = 15000
    combined_content = f"Syllabus:\n{syllabus}\n\nContenu du cours:\n{course_content}"
    if len(combined_content) > max_content_length:
        combined_content = combined_content[:max_content_length] + "\n...[contenu tronqué]"

    prompt = f"""Tu es un expert pédagogique. Génère une fiche de révision complète et structurée pour le cours suivant.

COURS: {course_name}

CONTENU DU COURS:
{combined_content}

Génère une fiche de révision en français avec le format JSON suivant (réponds UNIQUEMENT avec le JSON, sans texte avant ou après):
{{
  "title": "Titre de la fiche",
  "summary": "Résumé en 2-3 phrases du cours",
  "key_concepts": ["concept1", "concept2", "concept3", ...],
  "content": "# Titre\\n\\n## Résumé général\\n[résumé]\\n\\n## Concepts clés\\n[liste des concepts avec explications]\\n\\n## Points importants\\n[les points essentiels à retenir]\\n\\n## Formules / Définitions\\n[si applicable]\\n\\n## Applications pratiques\\n[exemples concrets]"
}}

Le champ "content" doit être du Markdown bien structuré avec des titres, listes à puces, et mises en évidence des points clés."""

    response = model.generate_content(prompt)
    text = response.text.strip()

    # Extraire le JSON de la réponse
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    # Fallback si le JSON n'est pas parseable
    return {
        "title": f"Fiche - {course_name}",
        "summary": "Fiche générée automatiquement",
        "key_concepts": [],
        "content": text
    }


async def generate_qcm(
    course_name: str,
    course_content: str,
    nb_questions: int = 10,
    difficulty: str = "medium",
    topic: Optional[str] = None,
    fiche_content: Optional[str] = None
) -> list:
    """
    Génère un QCM avec des questions à choix multiples
    
    Args:
        course_name: Nom du cours
        course_content: Contenu du cours
        nb_questions: Nombre de questions (5-30)
        difficulty: easy | medium | hard
        topic: Thème spécifique optionnel
        fiche_content: Contenu de la fiche si disponible
        
    Returns:
        Liste de questions avec options et réponse correcte
    """
    model = get_gemini_client()

    difficulty_descriptions = {
        "easy": "questions simples de mémorisation et compréhension de base",
        "medium": "questions d'application et d'analyse",
        "hard": "questions d'évaluation, de synthèse et de cas complexes"
    }

    # Utiliser la fiche si disponible, sinon le contenu brut
    content_to_use = fiche_content if fiche_content else course_content
    max_content_length = 12000
    if len(content_to_use) > max_content_length:
        content_to_use = content_to_use[:max_content_length] + "\n...[tronqué]"

    topic_instruction = f"Concentre-toi sur le thème: {topic}" if topic else "Couvre l'ensemble du cours"

    prompt = f"""Tu es un professeur expert. Génère exactement {nb_questions} questions QCM pour le cours suivant.

COURS: {course_name}
DIFFICULTÉ: {difficulty} ({difficulty_descriptions.get(difficulty, 'moyen')})
{topic_instruction}

CONTENU:
{content_to_use}

Génère exactement {nb_questions} questions en JSON (réponds UNIQUEMENT avec le tableau JSON):
[
  {{
    "id": 1,
    "question": "La question ici?",
    "options": [
      {{"label": "A", "text": "Option A"}},
      {{"label": "B", "text": "Option B"}},
      {{"label": "C", "text": "Option C"}},
      {{"label": "D", "text": "Option D"}}
    ],
    "correct_answer": "A",
    "explanation": "Explication de la bonne réponse",
    "difficulty": "{difficulty}",
    "topic": "sous-thème de la question"
  }},
  ...
]

RÈGLES:
- Chaque question doit avoir exactement 4 options (A, B, C, D)
- Une seule bonne réponse par question
- Les explications doivent être claires et pédagogiques
- Les mauvaises réponses doivent être plausibles mais clairement incorrectes
- Les questions doivent être variées et couvrir différents aspects du cours"""

    response = model.generate_content(prompt)
    text = response.text.strip()

    # Extraire le tableau JSON
    json_match = re.search(r'\[.*\]', text, re.DOTALL)
    if json_match:
        try:
            questions = json.loads(json_match.group())
            # Assurer qu'on a le bon nombre de questions
            return questions[:nb_questions]
        except json.JSONDecodeError:
            pass

    return []
