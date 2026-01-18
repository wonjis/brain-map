import { BrainMapNote } from '../schemas';

export class MarkdownService {
    /**
     * Generates a safe, timestamped filename for the note.
     * Format: YYYY-MM-DD-HHmm-Title.md
     */
    generateFilename(title: string): string {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[-:]/g, "") // YYYYMMDDTHHmmss.mssZ
            .slice(0, 12); // YYYYMMDDHHmm (approx) - actually let's follow the AC: YYYY-MM-DD-HHmm

        // Manual format: YYYY-MM-DD-HHmm
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');

        const timeStr = `${year}-${month}-${day}-${hour}${minute}`;

        // Sanitize title
        // Remove characters that are unsafe for filenames
        const sanitizedTitle = title
            .replace(/[\\/:*?"<>|]/g, "") // Windows reserved chars
            .replace(/\s+/g, " ") // Collapse whitespace
            .trim();

        return `${timeStr}-${sanitizedTitle}.md`;
    }

    /**
     * Converts the BrainMapNote data into formatted Markdown.
     */
    generateMarkdown(note: BrainMapNote): string {
        const { title, date_published, author, url, keywords, summary, deep_summary } = note;

        // YAML Frontmatter
        const frontmatter = [
            "---",
            `title: "${title.replace(/"/g, '\\"')}"`,
            `date: ${new Date().toISOString().split('T')[0]}`, // Capture date
            `published_date: ${date_published || ""}`,
            `url: ${url}`,
            `tags: [${keywords.map(k => `"${k}"`).join(", ")}]`,
            "---"
        ].join("\n");

        // Body
        const body = [
            `# ${title}`,
            "",
            `*${author ? `By ${author}` : 'Unknown Author'}*`,
            "",
            "## Summary",
            ...summary.map(s => `- ${s}`),
            "",
            "## Keywords",
            // WikiLinks style
            keywords.map(k => `[[${k}]]`).join(" "),
            "",
            "## Deep Dive",
            deep_summary,
        ].join("\n");

        return `${frontmatter}\n\n${body}`;
    }
}
