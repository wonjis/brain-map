from __future__ import annotations

import os
import re
from datetime import datetime
from typing import List, Optional

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


class IngestResponse(BaseModel):
    memo_path: str
    summary: str


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value or "untitled"


def _format_tags(tags: Optional[List[str]]) -> str:
    if not tags:
        return ""
    normalized = [tag.strip().lstrip("#") for tag in tags if tag.strip()]
    return " ".join(f"#{tag}" for tag in normalized)


def _summarize_url(url: str) -> str:
    if not FIRECRAWL_API_KEY:
        raise HTTPException(status_code=500, detail="FIRECRAWL_API_KEY is not set")

    payload = {
        "url": url,
        "onlyMainContent": True,
        "formats": ["markdown", "json"],
        "jsonOptions": {
            "prompt": "Write a detailed summary in exactly 10 sentences.",
            "schema": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string"}
                },
                "required": ["summary"],
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
    summary = data.get("data", {}).get("json", {}).get("summary")
    if not summary:
        raise HTTPException(status_code=502, detail="Firecrawl returned no summary")

    return summary.strip()


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
        "## Detail Summary",
        summary,
        "",
    ]

    return "\n".join(lines)


@app.post("/ingest", response_model=IngestResponse)
async def ingest(request: IngestRequest) -> IngestResponse:
    summary = _summarize_url(str(request.url))

    title = request.title or request.source_title or "Untitled"
    source_title = request.source_title or request.title or title
    date_prefix = datetime.now().strftime("%m-%d-%Y")
    filename = f"{date_prefix}-{_slugify(title)}.md"

    os.makedirs(OBSIDIAN_VAULT_PATH, exist_ok=True)
    memo_path = os.path.join(OBSIDIAN_VAULT_PATH, filename)

    memo_content = _build_memo(title, request.tags, source_title, str(request.url), summary)

    with open(memo_path, "w", encoding="utf-8") as handle:
        handle.write(memo_content)

    return IngestResponse(memo_path=memo_path, summary=summary)


@app.post("/ingest-github")
async def ingest_github(request: IngestRequest) -> JSONResponse:
    summary = _summarize_url(str(request.url))

    title = request.title or request.source_title or "Untitled"
    source_title = request.source_title or request.title or title
    date_prefix = datetime.now().strftime("%m-%d-%Y")
    filename = f"{date_prefix}-{_slugify(title)}.md"

    memo_content = _build_memo(title, request.tags, source_title, str(request.url), summary)

    return JSONResponse(
        {
            "filename": filename,
            "content": memo_content,
        }
    )
