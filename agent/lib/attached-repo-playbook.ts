/** Markdown playbook injected when Agent mode has an attached GitHub repo. */
export function buildAttachedRepoPlaybookMarkdown(repoLabel: string): string {
  return `# Attached repository

The user attached GitHub repository \`${repoLabel}\`.

Brain is not an IDE: there are no open editors, language servers, or inline apply. Work in the sandbox checkout only.

## Coding loop

1. **Explore** — Use harness tools (\`bash\`, \`read_file\`, \`glob\`, \`grep\`) under \`/workspace\` to understand the relevant code before changing it. The first harness tool call clones the repo there if needed.
2. **Edit** — Make focused changes with \`write_file\` (and shell when needed). Prefer the local checkout for all routine file edits.
3. **Verify** — When reasonable, run project checks available in the repo (tests, typecheck, lint scripts). Do not claim IDE lint panels or unsaved editor buffers.
4. **Summarize** — Tell the user what changed and how to review it.

## Tools

- Prefer harness tools against \`/workspace\` for code changes.
- Use GitHub MCP for remote operations only (issues, pull requests, reviews, notifications) — not for routine local file edits.
- For a substantial coding task, load the \`coding-on-attached-repo\` skill. To open a PR after edits, load \`open-pr-from-sandbox\`.
- Do not re-clone manually unless the user changes the attached repo.`;
}
