export class ErrorService {
    /**
     * Generates a "Stub Note" markdown content for failed jobs.
     * Ensures the user knows something went wrong.
     */
    generateStubNote(url: string, errorMessage: string): string {
        const timestamp = new Date().toISOString();

        return [
            "# FAILED PROCESSING",
            "",
            `**URL:** ${url}`,
            `**Time:** ${timestamp}`,
            `**Error:** ${errorMessage}`,
            "",
            "---",
            "",
            "#todo check this manually. The system failed to extract content.",
        ].join("\n");
    }

    /**
     * Generates a filename for the stub note.
     */
    generateStubFilename(url: string): string {
        const now = new Date();
        const timeStr = now.toISOString().replace(/[-:]/g, "").slice(0, 12);
        // Sanitize URL for filename (very rudimentary)
        const sanitizedUrl = url.replace(/https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50);

        return `${timeStr}-FAILED-${sanitizedUrl}.md`;
    }
}
