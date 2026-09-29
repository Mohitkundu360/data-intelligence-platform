"""Decides which URLs the platform may touch. The LLM never bypasses this."""
import ipaddress
import socket
import threading
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx

from app.core.config import settings

# Sites whose terms prohibit automated collection. Extend deliberately, with a reason.
DENYLIST = {
    "linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com",
    "tiktok.com", "glassdoor.com", "indeed.com",
}


class SourcePolicy:
    def __init__(self) -> None:
        self._robots: dict[str, RobotFileParser | None] = {}
        self._last_hit: dict[str, float] = {}
        self._lock = threading.Lock()

    def check(self, url: str) -> tuple[bool, str]:
        p = urlparse(url)
        if p.scheme == "fixture":
            return (True, "ok") if settings.dev_fixtures else (False, "fixtures disabled")
        if p.scheme not in ("http", "https") or not p.hostname:
            return False, "unsupported URL"
        host = p.hostname.lower()
        if any(host == d or host.endswith("." + d) for d in DENYLIST):
            return False, "domain denylisted (terms of service)"
        if self._is_private(host):
            return False, "private/internal address (SSRF guard)"
        if not self._robots_ok(url, p.scheme, p.netloc):
            return False, "disallowed by robots.txt"
        return True, "ok"

    def throttle(self, url: str) -> None:
        """Per-domain politeness delay."""
        host = urlparse(url).netloc
        with self._lock:
            wait = self._last_hit.get(host, 0) + settings.per_domain_delay_seconds - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            self._last_hit[host] = time.monotonic()

    # -- internals -------------------------------------------------------
    @staticmethod
    def _is_private(host: str) -> bool:
        try:
            infos = socket.getaddrinfo(host, None)
        except socket.gaierror:
            return True  # unresolvable -> refuse
        for info in infos:
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return True
        return False

    def _robots_ok(self, url: str, scheme: str, netloc: str) -> bool:
        if netloc not in self._robots:
            rp: RobotFileParser | None = RobotFileParser()
            try:
                r = httpx.get(f"{scheme}://{netloc}/robots.txt", timeout=5,
                              headers={"User-Agent": settings.user_agent}, follow_redirects=True)
                if r.status_code == 200:
                    rp.parse(r.text.splitlines())
                elif 400 <= r.status_code < 500:
                    rp.parse([])  # no robots.txt -> allowed
                else:
                    rp = None  # 5xx: be conservative
            except httpx.HTTPError:
                rp = None
            self._robots[netloc] = rp
        rp = self._robots[netloc]
        return bool(rp and rp.can_fetch(settings.user_agent, url))
