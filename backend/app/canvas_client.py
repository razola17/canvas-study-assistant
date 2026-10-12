"""
Canvas API Client - Interagit avec l'API Canvas Instructure
"""
import httpx
from typing import Optional
from bs4 import BeautifulSoup


class CanvasClient:
    """Client pour l'API Canvas Instructure"""

    def __init__(self, domain: str, access_token: str):
        self.base_url = f"https://{domain}/api/v1"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

    async def _get(self, endpoint: str, params: dict = None) -> dict | list:
        """Effectue une requête GET avec gestion de la pagination"""
        url = f"{self.base_url}/{endpoint}"
        results = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            while url:
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()

                data = response.json()
                if isinstance(data, list):
                    results.extend(data)
                    # Gestion de la pagination Canvas
                    links = self._parse_links(response.headers.get("Link", ""))
                    url = links.get("next")
                    params = None  # Params déjà dans l'URL de la page suivante
                else:
                    return data

        return results

    def _parse_links(self, link_header: str) -> dict:
        """Parse les liens de pagination Canvas"""
        links = {}
        if not link_header:
            return links
        for part in link_header.split(","):
            section = part.strip().split(";")
            if len(section) == 2:
                url = section[0].strip().strip("<>")
                rel = section[1].strip().replace("rel=", "").strip('"')
                links[rel] = url
        return links

    @staticmethod
    def clean_html(html_content: str) -> str:
        """Convertit le HTML en texte propre"""
        if not html_content:
            return ""
        soup = BeautifulSoup(html_content, "html.parser")
        return soup.get_text(separator="\n", strip=True)

    async def test_connection(self) -> dict:
        """Teste la connexion et retourne le profil utilisateur"""
        return await self._get("users/self/profile")

    async def get_courses(self) -> list:
        """Récupère tous les cours de l'étudiant"""
        return await self._get("courses", params={
            "enrollment_type": "student",
            "enrollment_state": "active",
            "include[]": ["syllabus_body", "term", "course_image"],
            "per_page": 50
        })

    async def get_modules(self, course_id: int) -> list:
        """Récupère les modules d'un cours"""
        return await self._get(f"courses/{course_id}/modules", params={
            "include[]": ["items"],
            "per_page": 100
        })

    async def get_module_items(self, course_id: int, module_id: int) -> list:
        """Récupère les éléments d'un module"""
        return await self._get(f"courses/{course_id}/modules/{module_id}/items", params={
            "include[]": ["content_details"],
            "per_page": 100
        })

    async def get_page(self, course_id: int, page_url: str) -> dict:
        """Récupère le contenu d'une page"""
        try:
            return await self._get(f"courses/{course_id}/pages/{page_url}")
        except Exception:
            return {}

    async def get_assignments(self, course_id: int) -> list:
        """Récupère les devoirs d'un cours"""
        try:
            return await self._get(f"courses/{course_id}/assignments", params={
                "include[]": ["description"],
                "per_page": 50
            })
        except Exception:
            return []

    async def get_announcements(self, course_id: int) -> list:
        """Récupère les annonces d'un cours"""
        try:
            return await self._get(f"courses/{course_id}/discussion_topics", params={
                "only_announcements": True,
                "per_page": 20
            })
        except Exception:
            return []

    async def get_full_course_content(self, course_id: int) -> str:
        """Extrait tout le contenu textuel d'un cours"""
        content_parts = []

        # Modules et pages
        try:
            modules = await self.get_modules(course_id)
            for module in modules:
                content_parts.append(f"\n## Module: {module.get('name', '')}")
                items = module.get("items", [])
                for item in items:
                    item_type = item.get("type", "")
                    item_title = item.get("title", "")
                    content_parts.append(f"\n### {item_type}: {item_title}")

                    if item_type == "Page":
                        page_url = item.get("page_url", "")
                        if page_url:
                            page = await self.get_page(course_id, page_url)
                            body = page.get("body", "")
                            if body:
                                content_parts.append(self.clean_html(body))

                    elif item_type == "Assignment":
                        description = item.get("content_details", {}).get("body", "")
                        if description:
                            content_parts.append(self.clean_html(description))
        except Exception as e:
            content_parts.append(f"[Erreur modules: {str(e)}]")

        # Devoirs
        try:
            assignments = await self.get_assignments(course_id)
            if assignments:
                content_parts.append("\n## Devoirs")
                for assignment in assignments[:10]:  # Limiter à 10
                    content_parts.append(f"\n### {assignment.get('name', '')}")
                    desc = assignment.get("description", "")
                    if desc:
                        content_parts.append(self.clean_html(desc))
        except Exception:
            pass

        return "\n".join(content_parts)
