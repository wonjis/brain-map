---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
inputDocuments:
  - prd.md
  - architecture.md
---

# brain-map-1 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for brain-map-1, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: System can accept `POST` requests from iOS Shortcuts containing a JSON payload with a URL.
FR2: System can validate the `Authorization` header against a stored secret environment variable.
FR3: System can reject unauthorized requests with a `401` status code to prevent abuse.
FR4: System can immediately return a `200 OK` status upon successful validation to unblock the client (iOS), regardless of downstream processing duration.
FR5: System can asynchronously initiate a scraping job via Firecrawl API for the received URL.
FR6: System can extract page metadata (Title, Author, Date) from the URL.
FR7: System can generate a 3-bullet summary of the content.
FR8: System can extract or generate 10 related keywords/tags for the content.
FR9: System can generate a detailed (10-15 line) summary of the content.
FR10: System can format extracted data into a valid Markdown string.
FR11: System can inject specific Frontmatter (YAML) into the markdown file (e.g., `date`, `url`, `tags`).
FR12: System can format keywords as Obsidian-style WikiLinks (e.g., `[[Artificial Intelligence]]`).
FR13: System can write the generated Markdown file to a specific path in the local file system (if local) or Git repository (if cloud-synced).
FR14: System can sanitize filenames to remove illegal characters before saving.
FR15: System can handle duplicate filenames (e.g., by appending a timestamp or unique hash).
FR16: System can detect Firecrawl API failures (timeout, logic error).
FR17: System can generate a "Stub Note" in the event of a processing failure, containing just the URL and failure reason.
FR18: System can log errors to the console/monitoring system for debugging.

### NonFunctional Requirements

NFR1: **Webhook Latency:** The Webhook endpoint MUST respond with `200 OK` within **200ms** to prevent the iOS Shortcut from hanging or timing out.
NFR2: **End-to-End Latency:** The full cycle (Capture -> Obsidan File) SHOULD complete within **5 minutes** for typical articles.
NFR3: **Graceful Failure:** The system MUST create a "Stub Note" for 100% of failed processing attempts. No data should ever be silently dropped.
NFR4: **Availability:** The basic Webhook receiver SHOULD have 99.5% availability (standard Vercel SLA).
NFR5: **Authentication:** All webhook requests MUST require a Bearer token matching the `API_SECRET`.
NFR6: **Private Vault:** The system MUST NOT expose the Obsidian vault content publicly; communication is one-way (Ingest only).

### Additional Requirements

- **Architecture/Stack:** Must use Node.js 18.x with TypeScript on Vercel Serverless Functions.
- **Initialization:** Must be a Greenfield manual initialization (`npm init -y`) structure, not a pre-built starter.
- **Storage Pattern:** Must use GitHub API (Octokit) for storage bridge (Vercel -> GitHub -> Obsidian). Local filesystem writes are FORBIDDEN.
- **Async Pattern:** Must implement "Webhook Chain" pattern: Ingest (200 OK) -> Firecrawl -> Callback (Process & Commit).
- **Service Isolation:** Logic must be strictly separated into `src/services/` (Firecrawl, GitHub, Markdown) and `api/` (Routes).
- **Configuration:** Environment variables (`API_SECRET`, `GITHUB_TOKEN`, `FIRECRAWL_KEY`) must be validated on startup.



FR1: Epic 1 - Ingest POST Request
FR2: Epic 1 - Authorization Validation
FR3: Epic 1 - Unauthorized Rejection
FR4: Epic 1 - Async 200 OK Response
FR5: Epic 2 - Initiate Firecrawl Job
FR6: Epic 2 - Extract Metadata
FR7: Epic 2 - Generate 3-Bullet Summary
FR8: Epic 2 - Extract Keywords
FR9: Epic 2 - Generate Detail Summary
FR10: Epic 3 - Markdown Formatting
FR11: Epic 3 - Frontmatter Injection
FR12: Epic 3 - WikiLink Formatting
FR13: Epic 3 - GitHub Storage Write
FR14: Epic 3 - Filename Sanitization
FR15: Epic 3 - Duplicate Handling
FR16: Epic 2 - Detect Firecrawl Failures
FR17: Epic 4 - Stub Note Generation
FR18: Epic 1 - Error Logging

## Epic List

### Epic 1: Infrastructure & Ingestion
Establish the secure Vercel API foundation that accepts iOS webhooks and strictly enforces the 200ms latency requirement via async processing patterns.
**FRs covered:** FR1, FR2, FR3, FR4, FR18, NFR1, NFR4, NFR5.

### Epic 2: The Curator (Scrape & Summarize)
Implement the intelligence layer that orchestrates Firecrawl to transform raw URLs into structured, summarized data.
**FRs covered:** FR5, FR6, FR7, FR8, FR9, FR16.

### Epic 3: The Archivist (Format & Storage)
Implement the output and storage layer that formats content into valid Obsidian Markdown and bridges the Vercel-to-GitHub storage gap.
**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR15, NFR6.

### Epic 4: The Safety Net (Error Recovery)
Implement the fallback mechanism to ensure "Stub Notes" are always created when processing fails, guaranteeing zero data loss.
**FRs covered:** FR17, NFR3.



## Epic 1: Infrastructure & Ingestion

Establish the secure Vercel API foundation that accepts iOS webhooks and strictly enforces the 200ms latency requirement via async processing patterns.

### Story 1.1: Project Initialization

As a Developer,
I want to initialize the Vercel TypeScript project with a strict directory structure,
So that the codebase is clean, type-safe, and ready for service isolation.

**Acceptance Criteria:**

**Given** a new Vercel project environment
**When** I run `npm init` and install dependencies (`typescript`, `vercel`, `zod`, `octokit`)
**Then** the project should have a `api/` folder for routes and `src/services/` folder for logic
**And** `tsconfig.json` should be configured with `strict: true` and path aliases
**And** `src/config.ts` should exist to validate required environment variables (`API_SECRET`, `GITHUB_TOKEN`, `FIRECRAWL_API_KEY`) on startup.

### Story 1.2: Secure Ingest Endpoint

As a Curator (iOS User),
I want a secure webhook endpoint that validates my requests and returns success immediately,
So that my iPhone shortcut feels instant and I am protected from unauthorized access.

**Acceptance Criteria:**

**Given** a POST request to `/api/ingest`
**When** the request contains a valid `Authorization: Bearer <API_SECRET>` header
**Then** the system should immediately return `200 OK` with body `{ "status": "processing" }`
**And** the system should validate the JSON body contains a `url` string
**And** if Auth fails, it should return `401 Unauthorized`.

### Story 1.3: Firecrawl Async Handoff

As a System,
I want to trigger a Firecrawl scraping job asynchronously without waiting for the result,
So that the webhook response remains under 200ms regardless of how long the page takes to scrape.

**Acceptance Criteria:**

**Given** a valid URL from the Ingest endpoint
**When** the `FirecrawlService.submitJob(url)` method is called
**Then** it should make a POST request to Firecrawl API v1 `/crawl`
**And** it should include a validation `webhook` parameter pointing to `https://{VERCEL_URL}/api/callback`
**And** it should NOT wait for the crawl to finish (FireAction should be strictly async)
**And** it should log the returned `jobId` for debugging.

### Story 1.4: Callback Receiver Stub

As a System,
I want a public callback endpoint to receive the finished scraping data from Firecrawl,
So that I can eventually process the results.

**Acceptance Criteria:**

**Given** a POST request to `/api/callback` from Firecrawl
**When** the payload is received
**Then** the system should return `200 OK` to acknowledge receipt
**And** it should log "Callback received for Job ID: {id}" to the console
**And** (in this story) no further processing occurs (just verify connectivity).

### Epic 2: The Curator (Scrape & Summarize)

Implement the intelligence layer that orchestrates Firecrawl to transform raw URLs into structured, summarized data.

### Story 2.1: Firecrawl Configure & Extract

As a System,
I want to configure the Firecrawl job to extract specific Schema (Summary, Keywords),
So that I get structured intelligence directly from the AI without needing a second LLM pass.

**Acceptance Criteria:**

**Given** the `submitJob` method in `FirecrawlService`
**When** constructing the payload
**Then** it should include `scrapeOptions` matching the PRD schema:
  - `formats`: `['json']`
  - `jsonOptions`: `{ prompt: "Extract main content..." }`
  - Schema fields: `title`, `author`, `date_published`, `summary` (array of 3 strings), `deep_summary` (string), `keywords` (array of strings)
**And** it should map the extracted data to the `BrainMapIO` interface.

### Story 2.2: Process Callback Payload

As a System,
I want to handle the incoming JSON payload at `/api/callback`,
So that I can retrieve the finished scraping results.

**Acceptance Criteria:**

**Given** a POST request to `/api/callback`
**When** the request body contains `success: true`
**Then** the system should extract the `data` object
**And** it should map the raw JSON to the typed `ScrapeResult` interface
**And** it should validate that critical fields (title, url) are present.

### Story 2.3: Failure Detection

As a System,
I want to detect when a scrape job has failed,
So that I can trigger the error recovery process instead of failing silently.

**Acceptance Criteria:**

**Given** a POST request to `/api/callback`
**When** the request body contains `success: false` OR `error` fields
**Then** the system must Log the specific error message
**And** it must trigger the `StubNoteGenerator` (defined in Epic 4)
**And** it must NOT crash the endpoint (always return 200 OK to Firecrawl to acknowledge receipt).

### Story 2.4: Data Validation

As a System,
I want to validate incoming data against a strict schema,
So that I don't corrupt my Knowledge Graph with malformed notes.

**Acceptance Criteria:**

**Given** the extracted data from Firecrawl
**When** processing the callback
**Then** use `Zod` to validate the structure matches `BrainMapNote` schema
**And** if validation fails, log the validation error and treat as specified "Scrape Failure" (trigger Stub Note).

### Epic 3: The Archivist (Format & Storage)

Implement the output and storage layer that formats content into valid Obsidian Markdown and bridges the Vercel-to-GitHub storage gap.

### Story 3.1: Markdown Template Engine

As a System,
I want to transform the structured data into my preferred Obsidian Markdown format,
So that I can read it without any further manual cleanup.

**Acceptance Criteria:**

**Given** a valid `BrainMapNote` object
**When** `generateMarkdown` is called
**Then** it should generate a string starting with YAML Frontmatter (title, date, url, tags)
**And** it should format the body with:
  - `# {Title}`
  - `## Summary` (3 bullets)
  - `## Keywords` (WikiLinks `[[Tag]]`)
  - `## Deep Dive` (the long text)
**And** it should be pure deterministic logic (easy to test).

### Story 3.2: Filename Strategy

As a System,
I want to generate unique, safe filenames for my notes,
So that I don't accidentally overwrite existing notes or create invalid files.

**Acceptance Criteria:**

**Given** a note title (e.g., "AI: The Future?")
**When** generating the filename
**Then** it must sanitize special characters (remove `:`, `/`) -> "AI The Future"
**And** it must prepend a timestamp `YYYY-MM-DD-HHmm` -> `2026-01-18-1230-AI-The-Future.md`
**And** this guarantees uniqueness for personal use without needing to check the GitHub repo for conflicts (optimization).

### Story 3.3: GitHub Storage Service

As a System,
I want to commit the generated markdown to my private GitHub repository,
So that my content is safely stored and can be synced to my local Obsidian vault later.

**Acceptance Criteria:**

**Given** the markdown content and filename
**When** `GithubService.uploadFile` is called
**Then** it should use Octokit to PUT to `repos/{owner}/{repo}/contents/{path}/{filename}`
**And** use a commit message "Add note: {Title}"
**And** handle 401/403 errors (permissions) by throwing specifics.

### Story 3.4: End-to-End Integration

As a Developer,
I want to wire the Callback -> Process -> Format -> Store pipeline,
So that the entire asynchronous flow actually works.

**Acceptance Criteria:**

**Given** the `processed` callback handler
**When** data is successfully extracted
**Then** it call `generateMarkdown`
**And** call `GithubService.uploadFile`
**And** log "Success: Note saved to {path}"
**And** return 200 OK.

### Epic 4: The Safety Net (Error Recovery)

Implement the fallback mechanism to ensure "Stub Notes" are always created when processing fails, guaranteeing zero data loss.

### Story 4.1: Stub Note Generator

As a System,
I want to create a fallback note when processing fails,
So that the user knows something went wrong instead of failing silently.

**Acceptance Criteria:**

**Given** a URL and an error message
**When** `generateStubNote` is called
**Then** it should return a markdown string
**And** the title should be `# FAILED - {url}`
**And** the body should contain "Processing failed. Error: {msg}" and "#todo check manually".

### Story 4.2: Global Error Trap

As a System,
I want to catch unhandled exceptions in the Callback route,
So that I can attempt to save a Stub Note even if the main logic crashes.

**Acceptance Criteria:**

**Given** the `api/callback` endpoint
**When** ANY error occurs (network, parsing, etc.) inside the `try` block
**Then** the `catch` block should intercept it
**And** it should call `StubNoteGenerator`
**And** it should attempt to save that Stub Note to GitHub (last resort)
**And** it should log the crash
**And** it should return 200 OK to the webhook sender (Firecrawl) to acknowledge receipt.
