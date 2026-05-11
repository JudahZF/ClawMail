import { readFile } from "node:fs/promises";
import { z } from "zod";
import { defaultPolicy, type Account } from "./providers/types.js";

const accountSchema = z.object({
  id: z.string().min(1),
  provider: z.enum(["gmail", "outlook", "icloud"]),
  email: z.string().email(),
  displayName: z.string().optional(),
  policy: z.object({
    allowRead: z.boolean().default(true),
    allowCreateFolder: z.boolean().default(true),
    allowMove: z.boolean().default(true),
    allowArchive: z.boolean().default(true),
    allowDrafts: z.boolean().default(true),
    allowSend: z.literal(false).default(false),
    allowDelete: z.literal(false).default(false),
  }).default(defaultPolicy()),
});

const configSchema = z.object({ accounts: z.array(accountSchema).default([]) });

export async function loadConfig(): Promise<{ accounts: Account[] }> {
  const path = process.env.CLAWMAILREADER_CONFIG ?? "clawmailreader.config.json";
  try {
    return configSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { accounts: [] };
    throw error;
  }
}

export async function getAccount(accountId: string) {
  const config = await loadConfig();
  const account = config.accounts.find((candidate) => candidate.id === accountId);
  if (!account) throw new Error(`Unknown clawmailreader account '${accountId}'`);
  return account;
}
