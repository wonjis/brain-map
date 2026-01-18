import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { FirecrawlExtractSchema } from '../src/schemas';

// Define the shape of the expected webhook payload from Firecrawl
// When using startCrawl, the webhook payload is typically an event object.
// Event types: 'job.completed', 'job.failed', etc.
// OR it might be the job object itself. 
// SDK v2 webhook docs say it sends the `BatchScrapeJob` or `CrawlJob` object.
// Let's handle the "job completed" state.

const WebhookPayloadSchema = z.object({
    type: z.enum(['crawl.page', 'crawl.completed', 'crawl.failed']).optional(), // Event type if present
    id: z.string().optional(),
    success: z.boolean().optional(),
    data: z.array(z.object({
        json: FirecrawlExtractSchema.optional(), // The extracted data attached to the page
        metadata: z.record(z.string(), z.unknown()).optional(),
    })).optional(),
    error: z.string().optional(),
});

import { GithubService } from '../src/services/github.service';
import { MarkdownService } from '../src/services/markdown.service';
import { ErrorService } from '../src/services/error.service';
import { BrainMapNote } from '../src/schemas';

const markdownService = new MarkdownService();
const githubService = new GithubService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log("[Callback] Payload received");

        const payload = req.body;

        // Check for error logic...
        if (payload.error || payload.success === false || payload.type === 'crawl.failed') {
            console.error(`[Callback] Job Failed: ${payload.id || 'unknown'} - ${payload.error}`);
            // Trigger Stub Note (Epic 4) - For now just log
            return res.status(200).json({ received: true });
        }

        const documents = payload.data || [];
        if (!documents.length) {
            console.log("[Callback] No data in payload");
            return res.status(200).json({ received: true });
        }

        const doc = documents[0];

        if (!doc.json) {
            console.warn("[Callback] Document found but no JSON extraction present");
            return res.status(200).json({ received: true });
        }

        const validation = FirecrawlExtractSchema.safeParse(doc.json);

        if (!validation.success) {
            console.error("[Callback] JSON Validation Failed:", validation.error);
            // Treat as failure -> Stub Note
            return res.status(200).json({ received: true });
        }

        const noteData = validation.data;

        // Extract URL from metadata or top-level doc
        // We need to trust the payload has 'metadata.sourceURL' or similar. 
        // We can cast 'doc' to any to access properties not strictly Zod-parsed if we trust Firecrawl.
        // Or update Zod schema. For now, let's look in metadata.
        const sourceUrl = (doc.metadata && doc.metadata.sourceURL as string) || (doc as any).url || "unknown-url";

        const completeNote: BrainMapNote = {
            ...noteData,
            url: sourceUrl
        };

        console.log(`[Callback] Processing Note: "${completeNote.title}"`);

        // 1. Generate Markdown
        const markdown = markdownService.generateMarkdown(completeNote);
        const filename = markdownService.generateFilename(completeNote.title);

        // 2. Upload to GitHub
        const githubUrl = await githubService.uploadFile(filename, markdown);

        console.log(`[Callback] Note saved to GitHub: ${githubUrl}`);

        return res.status(200).json({ received: true, saved: true, path: githubUrl });

    } catch (error: any) {
        console.error("[Callback] Error processing webhook:", error);

        // Story 4.2: Global Error Trap
        // Attempt to save Stub Note
        try {
            const errorService = new ErrorService();
            // We need the URL. If parsing failed, we might not have it easily available from 'documents'.
            // We can try to extract even from raw payload if possible, or use "unknown".
            // Ideally we pass context down, but here we are in the catch block.
            // Let's try to grab URL from body again minimally.
            const payload = req.body; // Still accessible?
            const documents = payload?.data || [];
            const doc = documents[0];
            const url = (doc?.metadata?.sourceURL as string) || (doc as any)?.url || "unknown-url";

            const stubContent = errorService.generateStubNote(url, error.message || String(error));
            const stubFilename = errorService.generateStubFilename(url);

            await githubService.uploadFile(stubFilename, stubContent);
            console.log(`[Callback] Saved Stub Note: ${stubFilename}`);

        } catch (stubError) {
            console.error("[Callback] Critical: Failed to save Stub Note:", stubError);
            // Nothing more we can do.
        }

        return res.status(200).json({ error: 'Internal Server Error', savedStub: true });
    }
}
