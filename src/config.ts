import { z } from 'zod';

const envSchema = z.object({
    API_SECRET: z.string().min(1, "API_SECRET is required"),
    GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
    FIRECRAWL_API_KEY: z.string().min(1, "FIRECRAWL_API_KEY is required"),
    VERCEL_URL: z.string().optional().default("http://localhost:3000"), // Fallback for local dev
});

export const config = (() => {
    // Only validate when accessing to avoid build-time errors if env vars aren't present during build
    // But for Vercel functions, they should be present at runtime.
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("❌ Invalid environment variables:", error.issues);
            throw new Error("Invalid environment variables");
        }
        throw error;
    }
})();

export type Config = z.infer<typeof envSchema>;
