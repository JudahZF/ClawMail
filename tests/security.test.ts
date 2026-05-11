import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { manifest } from "../src/manifest.js";

async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : Promise.resolve([path]);
  }));
  return nested.flat().filter((path) => path.endsWith(".ts"));
}

describe("safety boundary", () => {
  it("publishes only safe tool contracts", () => {
    expect(manifest.contracts.tools).toEqual([
      "clawmail_list_accounts",
      "clawmail_list_folders",
      "clawmail_create_folder",
      "clawmail_search_email",
      "clawmail_get_email",
      "clawmail_move_email",
      "clawmail_archive_email",
      "clawmail_create_draft",
      "clawmail_update_draft",
    ]);
  });

  it("provider implementations do not contain risky provider calls", async () => {
    const providerFiles = await files("src/providers");
    const combined = (await Promise.all(providerFiles.map((file) => readFile(file, "utf8")))).join("\n");
    const riskyPatterns = [
      /drafts\.send/i,
      /messages\.delete/i,
      /messages\.trash/i,
      /threads\.delete/i,
      /threads\.trash/i,
      /sendMail/i,
      /expunge/i,
      /\\Deleted/i,
    ];

    for (const pattern of riskyPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});
