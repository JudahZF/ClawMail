import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { manifest } from "../src/manifest.js";
import { toolJsonSchemas } from "../src/schemas/tools.js";

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
      "clawmailreader_list_accounts",
      "clawmailreader_list_folders",
      "clawmailreader_create_folder",
      "clawmailreader_search_email",
      "clawmailreader_get_email",
      "clawmailreader_move_email",
      "clawmailreader_archive_email",
      "clawmailreader_create_draft",
      "clawmailreader_update_draft",
    ]);
  });

  it("keeps the published OpenClaw manifest in sync with the runtime manifest", async () => {
    const published = JSON.parse(await readFile("openclaw.plugin.json", "utf8"));

    expect(published).toEqual(manifest);
  });

  it("registers JSON Schema tool inputs rather than runtime validator objects", () => {
    for (const schema of Object.values(toolJsonSchemas)) {
      expect(schema).toMatchObject({ type: "object" });
      expect(schema).not.toHaveProperty("parse");
    }
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
