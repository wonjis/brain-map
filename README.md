# brain-map

Personal learning archive: an iOS Shortcut + FastAPI backend that summarizes shared links with Firecrawl and saves structured memos into your Obsidian vault.

## What it does
- Accepts a shared URL (or YouTube link) from iOS Shortcuts
- Calls Firecrawl for a 10-sentence summary
- Writes a memo into `brain-map/Inbox` in your Obsidian vault (local) or commits into your GitHub-backed vault (Vercel)

## Quick start
- Backend setup lives in `backend/README.md`
- Configure `FIRECRAWL_API_KEY` and `OBSIDIAN_VAULT_PATH` for local runs, or `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_FOLDER` for Vercel
- Run the FastAPI server locally or deploy the Vercel function
