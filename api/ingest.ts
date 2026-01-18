import { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../src/config'; // Adjust path if needed. Vercel runs from root, but file is in api/
// Actually, import path from 'api/ingest.ts' to 'src/config.ts' should be '../src/config'
import { FirecrawlService } from '../src/services/firecrawl.service';

const firecrawl = new FirecrawlService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 2. Validate Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${config.API_SECRET}`) {
            console.warn("Unauthorized access attempt");
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 3. Parse Body
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid "url" field' });
        }

        // 4. Async Handoff (don't await the result if it takes long, but submitJob should be fast)
        // Story 1.2 AC says "Return 200 OK (immediately)".
        // So we invoke the service but do we wait for it? 
        // If submitJob makes an HTTP request, it might take 500ms-1s.
        // To strictly be <200ms, we might need to not await? 
        // BUT Vercel functions kill the process when response is sent.
        // So we MUST await the 'handoff' (the call to start the job).
        // Firecrawl /crawl endpoint is usually fast (just queues the job).

        const jobId = await firecrawl.submitJob(url);

        // 5. Response
        return res.status(200).json({ status: 'processing', jobId });

    } catch (error: any) {
        console.error("Ingest Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
