import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { reloadSnowflakeConnectionModule } from "@/agent/lib/snowflake-connection-reload";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("reloadSnowflakeConnectionModule", () => {
  it("touches snowflake.ts so eve can reload the connection URL", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "brain-snowflake-reload-"));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, "agent/connections/snowflake.ts");
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "export default {};\n", "utf8");
    const past = new Date(Date.now() - 60_000);
    await utimes(filePath, past, past);
    const before = (await stat(filePath)).mtimeMs;

    await reloadSnowflakeConnectionModule(directory);
    const after = (await stat(filePath)).mtimeMs;
    expect(after).toBeGreaterThan(before);
  });
});
