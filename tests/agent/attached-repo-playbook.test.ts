import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAttachedRepoPlaybookMarkdown } from "@/agent/lib/attached-repo-playbook";

describe("buildAttachedRepoPlaybookMarkdown", () => {
  it("includes coding-loop guidance and harness-first /workspace edits", () => {
    const markdown = buildAttachedRepoPlaybookMarkdown("acme/api@main");

    expect(markdown).toContain("acme/api@main");
    expect(markdown).toContain("/workspace");
    expect(markdown).toMatch(/Explore/i);
    expect(markdown).toMatch(/Edit/i);
    expect(markdown).toMatch(/Verify/i);
    expect(markdown).toMatch(/Summarize/i);
    expect(markdown).toContain("GitHub MCP");
    expect(markdown).toMatch(/not an IDE/i);
    expect(markdown).toMatch(/no open editors/i);
    expect(markdown).toMatch(/routine local file edits/i);
  });
});

describe("standing agent instructions", () => {
  it("describes dual paths, disclaims IDE features, and points at load_skill", () => {
    const markdown = readFileSync(join(process.cwd(), "agent/instructions.md"), "utf8");

    expect(markdown).toMatch(/Dual path/i);
    expect(markdown).toMatch(/not an IDE/i);
    expect(markdown).toContain("load_skill");
    expect(markdown).toContain("coding-on-attached-repo");
    expect(markdown).toContain("morning-brief");
    expect(markdown).toContain("open-pr-from-sandbox");
    expect(markdown).toMatch(/\*\*Ask\*\*/);
    expect(markdown).toMatch(/\*\*Agent\*\*/);
  });
});
