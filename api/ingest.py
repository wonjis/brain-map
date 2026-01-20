from __future__ import annotations

import base64
import os
from datetime import datetime
from typing import Any, Dict, Optional

import httpx
from backend.main import IngestRequest, _build_memo, _slug_from_url, _slugify, _summarize_url
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO", "wonjis/inbox")
GITHUB_FOLDER = os.getenv("GITHUB_FOLDER", "Inbox/")

app = FastAPI(title="Brain Map Ingest (GitHub)")


class GitHubIngestRequest(BaseModel):
    url: HttpUrl
    title: Optional[str] = None
    tags: Optional[list[str]] = None
    source_title: Optional[str] = None


async def _create_github_file(path: str, content: str) -> None:
    if not GITHUB_TOKEN:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN is not set")

    api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    payload = {
        "message": f"Add memo {path}",
        "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
    }

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.put(api_url, json=payload, headers=headers)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"GitHub error: {response.text}")


@app.post("/ingest")
async def ingest_github(request: GitHubIngestRequest) -> Dict[str, Any]:
    summary, page_title = _summarize_url(str(request.url))

    title = request.title or request.source_title or page_title
    if not title:
        title = _slug_from_url(str(request.url))
    source_title = request.source_title or request.title or page_title or title
    date_prefix = datetime.now().strftime("%m-%d-%Y")
    filename = f"{date_prefix}-{_slugify(title)}.md"

    memo_content = _build_memo(title, request.tags, source_title, str(request.url), summary)
    path = f"{GITHUB_FOLDER}{filename}"

    await _create_github_file(path, memo_content)

    return {
        "path": path,
        "filename": filename,
    }
