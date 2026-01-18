import { z } from 'zod';

/**
 * Zod Schema for the Firecrawl LLM Extraction.
 * This defines the shape of the data we want Firecrawl to "think" about and extract.
 */
export const FirecrawlExtractSchema = z.object({
    title: z.string().describe("The main title of the article or page"),
    author: z.string().optional().describe("The author of the content, if available"),
    date_published: z.string().optional().describe("The publication date in YYYY-MM-DD format, if available"),
    summary: z.array(z.string()).describe("A concise 3-bullet summary of the main points"),
    deep_summary: z.string().describe("A detailed 10-15 line summary of the content logic and arguments"),
    keywords: z.array(z.string()).describe("List of 5-10 specific keywords or entities related to the content"),
});

/**
 * Type inferred from the schema.
 * This is what we expect to get back in the `data` field of the extraction.
 */
export type BrainMapNoteData = z.infer<typeof FirecrawlExtractSchema>;

/**
 * Schema for the full Note object we will process internally.
 * Includes metadata from the source itself (like original URL).
 */
export interface BrainMapNote extends BrainMapNoteData {
    url: string; // The original URL we scraped
}

// Re-export the schema as a JSON JSONSchema object if needed by Firecrawl SDK
// SDK v2 typically takes the Zod schema directly or a JSON schema object.
