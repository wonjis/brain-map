import FirecrawlApp from '@mendable/firecrawl-js';
import { config } from '../config';
import { FirecrawlExtractSchema } from '../schemas';

export class FirecrawlService {
    private app: FirecrawlApp;

    constructor() {
        this.app = new FirecrawlApp({ apiKey: config.FIRECRAWL_API_KEY });
    }

    /**
     * Submits a URL to Firecrawl for async scraping.
     * Use 'scrape' to get the single page, but offload to 'async' queue? 
     * Actually, startCrawl with limit 1 is the robust async way.
     * We add 'json' format with the schema.
     */
    async submitJob(url: string): Promise<string> {
        console.log(`[FirecrawlService] Submitting job for URL: ${url}`);

        const baseUrl = config.VERCEL_URL.startsWith('http')
            ? config.VERCEL_URL
            : `https://${config.VERCEL_URL}`;
        const webhookUrl = `${baseUrl}/api/callback`;

        console.log(`[FirecrawlService] Webhook URL: ${webhookUrl}`);

        try {
            // "Extract" is a specific endpoint in SDK v2? 
            // The SDK has 'scrape', 'crawl', 'map'.
            // For LLM extraction, we usually use 'scrape' with 'json' format + schema.
            // But 'scrape' is synchronous.
            // 'startCrawl' with 'scrapeOptions' supports 'formats: [json]' and 'jsonOptions'.

            const response = await this.app.startCrawl(url, {
                limit: 1,
                scrapeOptions: {
                    formats: [
                        {
                            type: 'json',
                            schema: FirecrawlExtractSchema as any, // Cast to avoid strict ZodTypeAny mismatch
                            prompt: "Extract the main content, summary, and keywords from this page."
                        }
                    ],
                },
                webhook: webhookUrl,
            });

            if (!response.id) {
                console.error("[FirecrawlService] Job submission failed:", response);
                throw new Error(`Firecrawl failed to start: ${JSON.stringify(response)}`);
            }

            return response.id;

        } catch (error) {
            console.error("[FirecrawlService] Error submitting job:", error);
            throw error;
        }
    }
}
