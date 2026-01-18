---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
inputDocuments: []
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: API/Backend
  domain: EdTech / Productivity
  complexity: Medium
  projectContext: Greenfield
workflowType: prd
---

# Product Requirements Document - brain-map-1

**Author:** Seowonji
**Date:** 2026-01-18

## Executive Summary
Brain Map is an automated personal knowledge management pipeline designed to bridge the gap between casual content consumption on mobile and deep knowledge retention in Obsidian. By leveraging iOS Shortcuts, Firecrawl AI, and Markdown templating, it transforms the fleeting act of "sharing a link" into a structured, graph-ready permanent note. This greenfield API-first solution focuses on reducing friction for the "Curator" persona while ensuring high-quality, consistently formatted output for the "Student" persona.

## Success Criteria

### User Success
- **Effortless Capture:** User triggers a webhook from iPhone and the content is processed without further intervention.
- **Knowledge Retention:** Content is structured to support "graphing" (keywords & structure) rather than just archiving.
- **Structured Output:** Every file consistently follows the "3 bullets + 10 keywords + Detail" format.

### Technical Success
- **Reliability:** System handles various URL types (YouTube, Articles) gracefully even if parsing fails occasionally (Casual Capture).
- **Integration:** Seamless handoff between Webhook -> Firecrawl AI -> Obsidian (local file or sync).

### Measurable Outcomes
- **Latency:** Content appears in Obsidian within **1 hour** of capture.
- **Format Compliance:** 100% of generated notes contain the top-level summary, keywords, and detailed body.

## Product Scope & Phased Development

### MVP Strategy & Philosophy
**MVP Approach:** "Problem-Solving MVP"  
Focus solely on the core loop: Capture -> Process -> Store. No frontend, no visualizations, just raw utility.  
**Resource Requirements:** Vercel Hobby Plan (Free), OpenAI/Firecrawl API Keys, 1 Developer (You).

### MVP Feature Set (Phase 1)
**Core User Journeys Supported:**
- The Curator (iOS Capture)
- The Student (Obsidian Review)
- The System (Error Handling)

**Must-Have Capabilities:**
- Secure Webhook Endpoint (iOS -> Vercel)
- Firecrawl Integration (Scrape & Summarize)
- Markdown Templating (Bullets + Keywords)
- Obsidian File Sync (via local file system or cloud sync mock)

### Post-MVP Features (Growth & Vision)
**Phase 2 (Growth - "The Smarter Graph"):**
- Auto-tagging based on existing vault content.
- Support for specific scrape types (Twitter threads, PDFs).

**Phase 3 (Expansion - "The Visual Brain"):**
- Custom Frontend for visualizing the "Learning Map."
- Multi-user sharing.

### Risk Mitigation Strategy
**Technical Risks:**
- *Risk:* Firecrawl hallucinating or failing on complex sites.
- *Mitigation:* Explicit "Casual Capture" expectation; keep original URL in every note for verification.

**Market Risks:**
- *Risk:* You stop using it because it's too high friction.
- *Mitigation:* Focus entirely on the iOS Shortcut speed; if it takes >2 taps, it fails.

**Resource Risks:**
- *Risk:* API costs (Firecrawl/LLM) scale too high.
- *Mitigation:* Hard limits on Vercel; fallback to generic scraping if needed.

## User Journeys

### Journey 1: The Curator (Capture Flow)
**Persona:** Seowonji (Mobile User)  
**Trigger:** Finds a high-signal article or YouTube video while commuting.
1.  **Opening:** You are browsing on your iPhone and stumble upon a complex article about "Agentic AI Patterns."
2.  **Action:** You tap the iOS Share sheet and select the "Obsidian Brain" shortcut.
3.  **Handoff:** A small notification badge says "Sent to Brain." You immediately close the phone and get back to your commute, trusting it's handled.
4.  **Outcome:** You feel relief—no open tabs, no "read later" guilt. The knowledge is secured.

### Journey 2: The Student (Review Flow)
**Persona:** Seowonji (Desktop User)  
**Trigger:** Opening Obsidian for a nightly review or research session.
1.  **Opening:** You open your Obsidian vault. A new file `2026-01-18-Agentic-AI-Patterns` exists in your "Inbox" folder.
2.  **Discovery:** You open it. The top 3 bullets give you the gist instantly. The "Keywords" section has auto-linked `[[AI]]` and `[[Agents]]`, connecting this new note to your existing graph.
3.  **Deep Dive:** You skim the detailed summary. It's good enough that you don't need to read the full original article yet.
4.  **Outcome:** You move the note from "Inbox" to "Permanent Notes." You feel smarter and more organized with zero manual friction.

### Journey 3: The System (Error Handling / Edge Case)
**Persona:** The Automation (Background Process)  
**Trigger:** You send a link to a paywalled site or broken URL.
1.  **Challenge:** Firecrawl tries to access the URL but gets a 403 Forbidden.
2.  **Recovery:** Instead of crashing silently, the system generates a note in Obsidian titled `FAILED - [URL snippet]`.
3.  **Communication:** The note body says "Could not retrieve content. Error: 403." and creates a task `#todo check link manually`.
4.  **Outcome:** You see the error note later. You aren't missing data; you just have a flagged item to handle manually. Trust in the system remains high.

## Domain-Specific Requirements

### Data & Privacy
- **Content Sensitivity:** Low. User acknowledges URL content is processed by third-party AI (Firecrawl/LLMs). No special PII filtering required for MVP.
- **Accuracy Tolerance:** Low. Casual capture means occasional AI hallucinations or summary misses are acceptable.

### Interoperability
- **Markdown Flavor:** Standard Obsidian markdown. No complex PKM schemas or proprietary plugin syntax required initially.
- **File System:** Must respect local file system operations (create/write) as Obsidian relies on local files.

## Technical Architecture & API Requirements

### Project-Type Overview
**Type:** API/Backend Automation  
This is a lightweight middleware service hosted on Vercel that bridges iOS Shortcuts (User) and Obsidian (Storage) via Firecrawl (Processing).

### endpoint Specification
- **POST /webhook**: The single entry point.
    - **Trigger:** iOS Shortcut.
    - **Payload:** `{"url": "https://..."}` (JSON).
    - **Header:** `Authorization: Bearer <SECRET_TOKEN>`
    - **Response:**
        - `200 OK`: "Processing started" (Immediate response, async processing).
        - `401 Unauthorized`: Invalid token.

### Authentication Model
- **Mechanism:** Simple Bearer Token.
- **Management:** Token stored in Vercel Environment Variables (`API_SECRET`) and iOS Shortcut.

### Data Flow & Fallback Strategy
1.  **Receive:** URL received -> Auth Check -> Return 200 OK (to unblock phone).
2.  **Process (Async):**
    - Attempt Firecrawl Scrape & Summarize.
    - **Success:** Generate full markdown with summary.
    - **Failure (Quota/Error):** Generate "Stub" markdown with just URL and timestamp.
3.  **Store:** Write to Obsidian local file system or Sync location (via Vercel options or local fallback if using local server). *Note: Since Vercel is cloud, we likely need an Obsidian Sync plugin or Git-based sync for the vault, or a local server tunnel if storing locally.*

### Implementation Considerations
- **Hosting:** Vercel Serverless Functions.
- **Limits:** If Firecrawl API quota is hit, gracefully degrade to "Bookmark only" mode (URL title + link).

## Functional Requirements

### Capability Area: Capture & Ingestion (Webhook)
- **FR1:** System can accept `POST` requests from iOS Shortcuts containing a JSON payload with a URL.
- **FR2:** System can validate the `Authorization` header against a stored secret environment variable.
- **FR3:** System can reject unauthorized requests with a `401` status code to prevent abuse.
- **FR4:** System can immediately return a `200 OK` status upon successful validation to unblock the client (iOS), regardless of downstream processing duration.

### Capability Area: Content Processing (Firecrawl)
- **FR5:** System can asynchronously initiate a scraping job via Firecrawl API for the received URL.
- **FR6:** System can extract page metadata (Title, Author, Date) from the URL.
- **FR7:** System can generate a 3-bullet summary of the content.
- **FR8:** System can extract or generate 10 related keywords/tags for the content.
- **FR9:** System can generate a detailed (10-15 line) summary of the content.

### Capability Area: Output Generation (Markdown)
- **FR10:** System can format extracted data into a valid Markdown string.
- **FR11:** System can inject specific Frontmatter (YAML) into the markdown file (e.g., `date`, `url`, `tags`).
- **FR12:** System can format keywords as Obsidian-style WikiLinks (e.g., `[[Artificial Intelligence]]`).

### Capability Area: Storage & Sync (Obsidian)
- **FR13:** System can write the generated Markdown file to a specific path in the local file system (if local) or Git repository (if cloud-synced).
- **FR14:** System can sanitize filenames to remove illegal characters before saving.
- **FR15:** System can handle duplicate filenames (e.g., by appending a timestamp or unique hash).

### Capability Area: Error Handling
- **FR16:** System can detect Firecrawl API failures (timeout, logic error).
- **FR17:** System can generate a "Stub Note" in the event of a processing failure, containing just the URL and failure reason.
- **FR18:** System can log errors to the console/monitoring system for debugging.

## Non-Functional Requirements

### Performance
- **Webhook Latency:** The Webhook endpoint MUST respond with `200 OK` within **200ms** to prevent the iOS Shortcut from hanging or timing out.
- **End-to-End Latency:** The full cycle (Capture -> Obsidan File) SHOULD complete within **5 minutes** for typical articles.

### Reliability
- **Graceful Failure:** The system MUST create a "Stub Note" for 100% of failed processing attempts. No data should ever be silently dropped.
- **Availability:** The basic Webhook receiver SHOULD have 99.5% availability (standard Vercel SLA).

### Security
- **Authentication:** All webhook requests MUST require a Bearer token matching the `API_SECRET`.
- **Private Vault:** The system MUST NOT expose the Obsidian vault content publicly; communication is one-way (Ingest only).
