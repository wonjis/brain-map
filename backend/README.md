# Brain Map Ingest Backend

A small FastAPI service that accepts a URL, calls Firecrawl for a 10-sentence summary, and writes a memo into your Obsidian vault.

## Setup

1. Install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Set environment variables (or copy from `.env.example`):

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
  "url": "https://example.com/article"
}
```

Response includes the memo path and summary text.

## iOS Shortcut (detailed)

**Name**: Brain Map Capture

**Accepts**: URLs from Share Sheet

**Actions**:

1. **Get URLs from Input**
   - Input: Shortcut Input

2. **Choose from List** (if multiple URLs are shared)
   - List: URLs from previous step
   - Prompt: Choose a URL to archive

3. **Get Dictionary from Input**
   - Input:
     - url: Selected URL

4. **Get Contents of URL**
   - URL: `http://<your-mac-or-server>:8080/ingest`
   - Method: POST
   - Request Body: JSON
   - JSON: Dictionary from previous step
   - Headers: `Content-Type: application/json`

5. **Get Dictionary from Input**
   - Input: Contents of URL

6. **Show Result**
   - Text: `Saved to: ${memo_path}`
