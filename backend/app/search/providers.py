from dataclasses import dataclass
from typing import Protocol

from app.core.config import settings


@dataclass
class SearchResult:
    url: str
    title: str = ""


class SearchProvider(Protocol):
    def search(self, query: str, limit: int) -> list[SearchResult]:
        ...


class TavilySearchProvider:
    """Tavily web search provider."""

    def search(self, query: str, limit: int) -> list[SearchResult]:
        from tavily import TavilyClient

        client = TavilyClient(api_key=settings.tavily_api_key)

        response = client.search(
            query=query,
            max_results=min(limit, 20),
            search_depth="basic",
        )

        return [
            SearchResult(
                url=result["url"],
                title=result.get("title", ""),
            )
            for result in response.get("results", [])
            if result.get("url")
        ]


class FixtureSearchProvider:
    """DEV ONLY: returns synthetic pages so the pipeline runs with no keys or network."""

    def search(self, query: str, limit: int) -> list[SearchResult]:
        from app.search.fixtures import FIXTURE_PAGES

        return [
            SearchResult(url, "FIXTURE " + url.split("//")[1])
            for url in FIXTURE_PAGES
        ][:limit]


def get_search_provider() -> SearchProvider:
    if settings.dev_fixtures:
        return FixtureSearchProvider()

    if settings.tavily_api_key:
        return TavilySearchProvider()

    raise RuntimeError(
        "No search provider configured: set TAVILY_API_KEY "
        "(or DEV_FIXTURES=true for dev)."
    )