# Brain Map Ingest Backend

A small FastAPI service that accepts a URL, calls Firecrawl for a 10-sentence summary, and writes a memo into your Obsidian vault or commits into GitHub when configured.

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
export GITHUB_TOKEN="your-github-token"
export GITHUB_REPO="wonjis/inbox"
export GITHUB_FOLDER="Inbox/"
```

3. Run the API:

```bash
uvicorn main:app --reload --port 8080
```

4. Test the endpoint (optional):

```bash
API_URL=http://localhost:8080/ingest TEST_URL=https://example.com bash scripts/test_ingest.sh
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

### GitHub-backed ingest (Render)

When deployed on Render, the `POST /ingest` endpoint writes the memo into GitHub when `GITHUB_TOKEN` is set; otherwise it writes to the local Obsidian vault.
Set these environment variables in Render if you want GitHub commits:

- `GITHUB_TOKEN`
- `GITHUB_REPO` (default: `wonjis/inbox`)
- `GITHUB_FOLDER` (default: `Inbox/`)

For local runs, keep using `http://localhost:8080/ingest` and `OBSIDIAN_VAULT_PATH`.

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
   - URL: `https://<your-render-service>.onrender.com/ingest`
   - Method: POST
   - Request Body: JSON
   - JSON: Dictionary from previous step
   - Headers: `Content-Type: application/json`

5. **Get Dictionary from Input**
   - Input: Contents of URL

6. **Show Result**
   - Text: `Saved to: ${path}`
