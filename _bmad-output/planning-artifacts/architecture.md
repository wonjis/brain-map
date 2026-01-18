---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
inputDocuments:
  - prd.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-01-18'
project_name: 'brain-map-1'
user_name: 'Seowonji'
date: '2026-01-18'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
18 FRs define a linear "Capture -> Process -> Store" pipeline.
- **Capture:** Webhook receiver for iOS Shortucts.
- **Processing:** Async orchestration of Firecrawl for scraping/summarizing.
- **Output:** Strict Markdown formatting.

**Non-Functional Requirements:**
- **Performance:** 200ms hard limit for Webhook response (Async pattern required).
- **Reliability:** "Stub Notes" must be created on failure.

**Scale & Complexity:**
- Primary domain: API/Backend Automation
- Complexity level: Low (Single user, low volume)
- Estimated architectural components: 3 (Webhook Handler, Job Processor, Storage Adapter)

### Technical Constraints & Dependencies

**Storage Constraint (Critical):**
The PRD targets "Obsidian Local File System" but specifies "Vercel" hosting.
- **Constraint:** Vercel functions cannot write to the user's local disk.
- **Implication:** Architecture MUST include a synchronization bridge.
- **Selected Approach:** **GitHub-based Storage**. The API will commit the generated markdown file to a private GitHub repository. The user will use the "Obsidian Git" plugin to sync these commits to their local vault.

### Cross-Cutting Concerns Identified

1.  **Authentication:** Bearer token middleware for all endpoints.
2.  **Error Handling:** Global exception wrapper to ensure "Stub Note" generation on any crash.
3.  **Async Orchestration:** Vercel functions have timeout limits (10s-60s). Firecrawl is slow. We need an async pattern (e.g., job queue or stateless callback) to handle long-running scrapes without blocking the webhook.

## Starter Template Evaluation

### Primary Technology Domain
**API/Backend Automation** based on Vercel Serverless Functions.

### Starter Options Considered
1.  **Next.js API Routes:** Overkill. We don't need a frontend framework for a pure webhook.
2.  **NestJS on Vercel:** Too heavy. "Problem-Solving MVP" philosophy suggests minimal boilerplate.
3.  **Vanilla Node.js + TypeScript (Vercel):** Perfect fit. Lightweight, type-safe, direct focus on functions.

### Selected Starter: Vanilla Node.js with TypeScript

**Rationale for Selection:**
- **Simplicity:** We only need `api/webhook.ts`. No React, no heavy bundlers.
- **Performance:** Minimal cold start times compared to full frameworks.
- **Control:** Direct access to `vercel.json` and `tsconfig.json` without framework abstraction layers.

**Initialization Command:**
```bash
npx create-next-app@latest brain-map-api --typescript --eslint --no-src-dir --no-tailwind --no-app --import-alias "@/*"
# Wait, 'create-next-app' is for Next.js.
# For vanilla Vercel API, we should init manually or use 'vercel init'
```

*Correction:* Best practice for 2024/2025 Vercel Functions is actually just a folder with `api/` directory and `vercel.json`.
**Revised Initialization:**
```bash
npm init -y
npm install typescript @types/node -D
npm install vercel -D
mkdir api
touch api/webhook.ts
```

**Architectural Decisions Provided:**
- **Runtime:** Node.js 18.x (LTS)
- **Language:** TypeScript (Strict)
- **Structure:** File-system based routing (`api/webhook.ts` -> `/api/webhook`)

**Note:** We will implement the architecture manually as a "Greenfield" setup rather than using a bloated starter.

## Core Architectural Decisions

### Decision Priority Analysis
**Critical Decisions (Block Implementation):**
1.  **Async Pattern:** Webhook Callback vs Polling.
2.  **Storage Bridge:** Vercel -> GitHub -> Obsidian.

### Data Architecture
**Storage Strategy: Git-Based Persistence**
- **Decision:** No database. State is handled by Firecrawl (during job) and GitHub (final storage).
- **Mechanism:** The API will use the GitHub API to commmit the generated MD file directly to a private repo.
- **Rationale:** Solves the Vercel file system constraint with $0 infrastructure cost.

### Authentication & Security
**Method: Bearer Token**
- **Decision:** Standard `Authorization: Bearer <token>` header.
- **Rationale:** Native support in iOS Shortcuts. Secure enough for personal single-user API.
- **Secret Management:** Stored in `api/webhook.ts` checks against `process.env.API_SECRET`.

### API & Communication Patterns
**Async Flow: Firecrawl Webhooks**
- **Problem:** Vercel Hobby limits functions to 10s execution. Firecrawl jobs take >10s.
- **Solution:** Two-endpoint architecture.
    1.  `POST /api/ingest`: Starts job, returns 200 OK.
    2.  `POST /api/callback`: Received from Firecrawl when job done. Generates MD and commits to GitHub.
- **Version:** Firecrawl API v1.

### Infrastructure & Deployment
**Platform: Vercel Serverless**
- **Runtime:** Node.js 18.x
- **Config:** `vercel.json` to route `/api/*`.

### Decision Impact Analysis
**Implementation Sequence:**
1.  **Repo Setup:** Init TypeScript project.
2.  **Ingest Endpoint:** Handle iOS request + Auth.
3.  **Callback Endpoint:** Handle Firecrawl payload + GitHub Commit.
4.  **Connect:** Wire them together.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined
**Critical Conflict Points:**
- **Logic Placement:** API routes vs Services.
- **Storage Access:** Direct API calls vs SDK usage.
- **Configuration:** Ad-hoc process.env vs Validated Config.

### Naming Patterns
- **Services:** `src/services/{entity}.service.ts` (e.g., `github.service.ts`).
- **Interfaces:** `src/types/{entity}.d.ts`.
- **Environment:** `SCREAMING_SNAKE_CASE` (e.g., `API_SECRET`).

### Structure Patterns
**Project Organization:**
- **`api/`:** ONLY Vercel entry points. No business logic.
- **`src/services/`:** All business logic (Firecrawl, GitHub, formatting).
- **`src/types/`:** Shared TypeScript interfaces.
- **`src/utils/`:** Pure functions (e.g., text sanitization).

### Format Patterns
**API Response Formats:**
- **Success:** `200 OK` (Body optional for webhook).
- **Error:** `{ "error": "Message" }` with appropriate status code.

### Process Patterns
**Error Handling:**
- **Pattern:** `try/catch` at the top level of every API route.
- **Fallback:** If `src/services/firecrawl.service.ts` fails, catch error and call `src/services/github.service.ts` to save a Stub Note.

**Environment Configuration:**
- **Pattern:** Validate on import.
- **Enforcement:** `if (!process.env.API_SECRET) throw new Error("Missing API_SECRET");` at top of service files.

### Enforcement Guidelines
**All Agents MUST:**
1.  NEVER put logic in `api/` folder.
2.  ALWAYS use the `GithubService` for storage (no filesystem calls).
3.  ALWAYS validate env vars before use.

## Project Structure & Boundaries

### Complete Project Directory Structure
```
brain-map-1/
├── api/
│   ├── ingest.ts       # POST /api/ingest
│   └── callback.ts     # POST /api/callback
├── src/
│   ├── services/
│   │   ├── firecrawl.service.ts
│   │   ├── github.service.ts
│   │   └── markdown.service.ts
│   ├── types/
│   │   └── index.d.ts
│   └── config.ts       # Env validation
├── vercel.json         # Routing rules
├── package.json
├── tsconfig.json
└── .env
```

### Architectural Boundaries

**API Boundaries:**
- **External:** `api/` directory. All files here are public endpoints.
- **Internal:** `src/services/` directory. These are pure functions/classes, unaware of HTTP req/res objects (except where necessary), callable by API routes.

**Component Boundaries:**
- **Services:** Isolated by domain (`Firecrawl`, `GitHub`, `Markdown`).
- **Config:** Centralized in `config.ts` to prevent leaky env var usage.

### Requirements to Structure Mapping

**Feature/Epic Mapping:**
- **Capture (FR1-4):** `api/ingest.ts` (Entry), `src/config.ts` (Auth).
- **Processing (FR5-9):** `src/services/firecrawl.service.ts` (Job management).
- **Output (FR10-12):** `src/services/markdown.service.ts` (Template engine).
- **Storage (FR13-15):** `src/services/github.service.ts` (Commit logic).
- **Error Handling (FR16-18):** `api/callback.ts` (Catch block), `src/services/github.service.ts` (Stub note).

### Integration Points

**External Integrations:**
- **iOS Shortcut:** Hits `POST /api/ingest`.
- **Firecrawl:** Hits `POST /api/callback`.
- **GitHub API:** Called by `GithubService` to write files.

**Data Flow:**
1.  **Ingest:** iOS -> `api/ingest` -> Firecrawl API.
2.  **Callback:** Firecrawl -> `api/callback` -> `FirecrawlService` (Get Result) -> `MarkdownService` (Format) -> `GithubService` (Commit).

### File Organization Patterns

**Configuration Files:**
- `vercel.json`: Routing and runtime config.
- `.env`: Local secrets (not committed).

**Source Organization:**
- Logic completely separated from Vercel handlers. This allows easier testing and potential migration (e.g., to Express) later if needed.

## Architecture Validation Results

### Coherence Validation ✅
- **Stack:** Node.js/TypeScript on Vercel is highly coherent.
- **Async:** Callback pattern correctly addresses Vercel's timeout constraints.
- **Storage:** GitHub Commit pattern correctly addresses Vercel's read-only filesystem.

### Requirements Coverage Validation ✅
- **Capture:** FR1-4 covered by `api/ingest.ts` + Auth middleware.
- **Process:** FR5-9 covered by Firecrawl Service.
- **Store:** FR13-15 covered by Github Service.
- **Error:** FR16-18 covered by global error handler + Stub Note logic.

### Implementation Readiness Validation ✅
- **Structure:** Complete file tree defined.
- **Patterns:** Clear boundaries between API and Services.
- **Config:** Environment variables validation strategy defined.

### Architecture Readiness Assessment
**Overall Status:** READY FOR IMPLEMENTATION
**Confidence Level:** High
**Key Strengths:** Simple, low-cost (Free tier friendly), robust error handling.

### Implementation Handoff
**AI Agent Guidelines:**
- **Strictly separate** API handlers from Service logic.
- **Never** write to local disk; always use `GithubService`.
- **Always** handle errors by generating a "Stub Note".

**First Implementation Priority:**
Initialize project with:
```bash
npm init -y && npm install typescript @types/node vercel -D
```

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-18
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**
- **Decisions:** Node.js/TypeScript on Vercel, Git-based Storage, Bearer Auth.
- **Patterns:** Service Layer separation, Async Webhooks, Stub Note error handling.
- **Structure:** Concrete `api/` vs `src/services/` separation.
- **Validation:** 100% Requirement Coverage verified.

### Implementation Handoff

**First Implementation Priority:**
Initialize the project repository and set up the Vercel/TypeScript environment.

```bash
mkdir brain-map-1
cd brain-map-1
npm init -y
npm install typescript @types/node vercel Octokit firecrawl-js zod -D
tsc --init
```

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.
