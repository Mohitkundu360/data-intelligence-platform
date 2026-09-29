from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.core.config import settings
from app.policy.source_policy import SourcePolicy

MAX_BYTES = 2_000_000
MAX_LINKS = 80


class FetchError(Exception):
    pass


def fetch_page(url: str, policy: SourcePolicy) -> tuple[str, str, str]:
    """Returns (final_url, title, text).

    Re-checks source policy on every redirect hop and preserves
    useful hyperlink URLs in the extracted text.
    """
    with httpx.Client(
        timeout=15,
        headers={"User-Agent": settings.user_agent},
        follow_redirects=False,
    ) as c:
        for _ in range(4):
            ok, why = policy.check(url)
            if not ok:
                raise FetchError(why)

            policy.throttle(url)

            r = c.get(url)

            if r.is_redirect and "location" in r.headers:
                url = urljoin(url, r.headers["location"])
                continue

            r.raise_for_status()

            content_type = r.headers.get("content-type", "")
            if "html" not in content_type and "text" not in content_type:
                raise FetchError("unsupported content type")

            soup = BeautifulSoup(r.text[:MAX_BYTES], "html.parser")

            for tag in soup(["script", "style", "noscript"]):
                tag.decompose()

            title = soup.title.get_text(strip=True) if soup.title else ""

            # Extract useful HTTP(S) links before converting the page
            # to plain text. These are important for website extraction.
            link_lines: list[str] = []
            seen_links: set[str] = set()

            for link in soup.find_all("a", href=True):
                href = urljoin(url, link["href"])

                if not href.startswith(("http://", "https://")):
                    continue

                if href in seen_links:
                    continue

                seen_links.add(href)

                anchor = link.get_text(" ", strip=True)

                if anchor:
                    link_lines.append(f"{anchor}: {href}")
                else:
                    link_lines.append(href)

                if len(link_lines) >= MAX_LINKS:
                    break

            page_text = soup.get_text("\n", strip=True)

            # Put links FIRST because the LLM extractor currently
            # receives only the first 5,000 characters.
            if link_lines:
                text = (
                    "LINKS FROM PAGE:\n"
                    + "\n".join(link_lines)
                    + "\n\nPAGE TEXT:\n"
                    + page_text
                )
            else:
                text = page_text

            return url, title, text

    raise FetchError("too many redirects")