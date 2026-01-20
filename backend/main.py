from __future__ import annotations

import base64
import os
import re
from datetime import datetime
from typing import List, Optional
from urllib.parse import unquote, urlparse

import httpx
import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl

FIRECRAWL_BASE_URL = os.getenv("FIRECRAWL_BASE_URL", "https://api.firecrawl.dev")
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
DEFAULT_VAULT_PATH = os.path.expanduser(
    "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/brain-map/Inbox"
)
OBSIDIAN_VAULT_PATH = os.getenv("OBSIDIAN_VAULT_PATH", DEFAULT_VAULT_PATH)

app = FastAPI(title="Brain Map Ingest")


class IngestRequest(BaseModel):
    url: HttpUrl
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    source_title: Optional[str] = None


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value or "untitled"


def _slug_from_url(url: str) -> str:
    parsed = urlparse(url)
    path = unquote(parsed.path or "").strip("/")
    if path:
        return _slugify(path.split("/")[-1])
    if parsed.netloc:
        return _slugify(parsed.netloc)
    return "untitled"


def _format_tags(tags: Optional[List[str]]) -> str:
    if not tags:
        return ""
    normalized = [tag.strip().lstrip("#") for tag in tags if tag.strip()]
    return " ".join(f"#{tag}" for tag in normalized)


def _summarize_url(url: str) -> tuple[str, List[str], Optional[str]]:
    if not FIRECRAWL_API_KEY:
        raise HTTPException(status_code=500, detail="FIRECRAWL_API_KEY is not set")

    payload = {
        "url": url,
        "onlyMainContent": True,
        "formats": ["markdown", "json"],
        "jsonOptions": {
            "prompt": "Provide 5 concise bullet points summarizing the content and list 3-5 interesting quotes or lines that are useful for reflection, research, or guidance. Keep bullets concise and quotes verbatim.",
            "schema": {
                "type": "object",
                "properties": {
                    "bullets": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "quotes": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["bullets", "quotes"],
                "additionalProperties": False,
            },
        },
    }

    response = requests.post(
        f"{FIRECRAWL_BASE_URL}/v1/scrape",
        headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}"},
        json=payload,
        timeout=60,
    )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Firecrawl error: {response.status_code} {response.text}",
        )

    data = response.json()
    payload = data.get("data", {})
    json_payload = payload.get("json", {})
    bullets = json_payload.get("bullets")
    quotes = json_payload.get("quotes")
    title = payload.get("metadata", {}).get("title")

    if not bullets or not quotes:
        raise HTTPException(status_code=502, detail="Firecrawl returned no summary")

    bullet_lines = [f"- {bullet.strip()}" for bullet in bullets if str(bullet).strip()]
    quote_lines = [f"> {quote.strip()}" for quote in quotes if str(quote).strip()]

    summary_sections = [
        "## Summary Bullets",
        *bullet_lines,
        "",
        "## Notable Quotes",
        *quote_lines,
    ]

    summary_text = "\n".join(summary_sections).strip()

    return summary_text, bullet_lines, title


def _build_memo(title: str, tags: Optional[List[str]], source_title: str, url: str, summary: str) -> str:
    date_str = datetime.now().strftime("%m-%d-%Y")
    tags_line = _format_tags(tags)

    lines = [
        f"# {title}",
        "",
        f"Tags: {tags_line}" if tags_line else "Tags:",
        f"Date: {date_str}",
        f"Source Title: {source_title}",
        f"URL: {url}",
        "",
        summary,
        "",
    ]

    return "\n".join(lines)


async def _write_github_memo(
    token: str,
    repo: str,
    folder: str,
    filename: str,
    content: str,
) -> None:
    api_url = f"https://api.github.com/repos/{repo}/contents/{folder}{filename}"
    payload = {
        "message": f"Add memo {filename}",
        "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.put(api_url, json=payload, headers=headers)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"GitHub error: {response.text}")


@app.post("/ingest")
async def ingest(request: IngestRequest) -> JSONResponse:
    summary, _, page_title = _summarize_url(str(request.url))

    title = request.title or request.source_title or page_title
    if not title:
        title = _slug_from_url(str(request.url))
    source_title = request.source_title or request.title or page_title or title
    date_prefix = datetime.now().strftime("%m-%d-%Y")
    filename = f"{date_prefix}-{_slugify(title)}.md"

    memo_content = _build_memo(title, request.tags, source_title, str(request.url), summary)

    github_token = os.getenv("GITHUB_TOKEN")
    github_repo = os.getenv("GITHUB_REPO", "wonjis/inbox")
    github_folder = os.getenv("GITHUB_FOLDER", "Inbox/")

    if github_token:
        await _write_github_memo(github_token, github_repo, github_folder, filename, memo_content)
        return JSONResponse({"path": f"{github_folder}{filename}", "filename": filename})

    os.makedirs(OBSIDIAN_VAULT_PATH, exist_ok=True)
    memo_path = os.path.join(OBSIDIAN_VAULT_PATH, filename)

    with open(memo_path, "w", encoding="utf-8") as handle:
        handle.write(memo_content)

    return JSONResponse({"memo_path": memo_path, "filename": filename})
