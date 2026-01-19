# Brain Map Ingest Backend

A small FastAPI service that accepts a URL, calls Firecrawl for a 10-sentence summary, and writes a memo into your Obsidian vault.

## Setup

1. Install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Set environment variables:

```bash
export FIRECRAWL_API_KEY="your-api-key"
export OBSIDIAN_VAULT_PATH="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/brain-map/Inbox"
```

3. Run the API:

```bash
uvicorn main:app --reload --port 8080
```

## Ingest endpoint

`POST /ingest`

Example payload:

```json
{
  "url": "https://example.com/article",
  "title": "Optional note title",
  "source_title": "Original page title",
  "tags": ["learning", "reference"]
}
```

Response includes the memo path and summary text.

## iOS Shortcut outline

- Receive URL from Share Sheet
- Ask for optional tags (comma-separated) and title (optional)
- Build JSON body:
  - url: Shortcut Input
  - title: provided title
  - source_title: provided source title (or same as title)
  - tags: list split on commas
- POST to `http://<your-mac-or-server>:8080/ingest`
- Show success message with returned memo path
