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
  "url": "https://example.com/article",
  "title": "Optional note title",
  "source_title": "Original page title",
  "tags": ["learning", "reference"]
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

3. **Ask for Input**
   - Type: Text
   - Prompt: Optional title (leave blank to use page title)
   - Variable: Note Title

4. **Ask for Input**
   - Type: Text
   - Prompt: Optional tags (comma-separated)
   - Variable: Raw Tags

5. **Split Text**
   - Text: Raw Tags
   - Separator: ,
   - Result: Tag List

6. **Get Dictionary from Input**
   - Input:
     - url: Selected URL
     - title: Note Title
     - source_title: Note Title
     - tags: Tag List

7. **Get Contents of URL**
   - URL: `http://<your-mac-or-server>:8080/ingest`
   - Method: POST
   - Request Body: JSON
   - JSON: Dictionary from previous step
   - Headers: `Content-Type: application/json`

8. **Get Dictionary from Input**
   - Input: Contents of URL

9. **Show Result**
   - Text: `Saved to: ${memo_path}`

**Tips**:
- If you want the page title automatically, add **Get Article** before step 3 and map its **Title** into the `source_title` field.
- If you want tags to be optional, add **If** Raw Tags is empty → set Tag List to empty list.
