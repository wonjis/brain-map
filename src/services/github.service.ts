import { Octokit } from 'octokit';
import { config } from '../config';

export class GithubService {
    private octokit: Octokit;
    // We need repository info. Ideally from config or hardcoded for the user's specific workflow.
    // For this MVP, let's look for env vars or default.
    // Since user provided a "brain-map" repo URL in package.json, we assume:
    private owner: string = "wonjis";
    private repo: string = "brain-map";
    private path: string = "inbox"; // Folder to store notes in

    constructor() {
        this.octokit = new Octokit({ auth: config.GITHUB_TOKEN });
    }

    /**
     * Uploads a file to the GitHub repository.
     * If file exists, it fails (collision) or updates? 
     * Our Filename Strategy (timestamp) avoids collision, but we should handle it gracefully.
     * createOrUpdateFileContents requires sha if updating. 
     * We will assume creation for new notes.
     */
    async uploadFile(filename: string, content: string): Promise<string> {
        const filePath = `${this.path}/${filename}`;
        console.log(`[GithubService] Uploading to ${this.owner}/${this.repo}/${filePath}`);

        try {
            // Base64 encode content
            const contentBase64 = Buffer.from(content).toString('base64');

            const response = await this.octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
                owner: this.owner,
                repo: this.repo,
                path: filePath,
                message: `Add note: ${filename.replace('.md', '')}`, // Commit message
                content: contentBase64,
                committer: {
                    name: 'BrainMap Bot',
                    email: 'bot@brainmap.local'
                }
            });

            console.log(`[GithubService] File uploaded: ${response.data.content?.html_url}`);
            return response.data.content?.html_url || "success";

        } catch (error: any) {
            console.error("[GithubService] Upload failed:", error.message);
            throw error;
        }
    }
}
