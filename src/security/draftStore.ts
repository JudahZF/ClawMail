import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const path = process.env.CLAWMAILREADER_DRAFT_STORE ?? ".clawmailreader/drafts.json";

type DraftRecord = { accountId: string; provider: string; draftId: string; messageId?: string; createdAt: string; updatedAt: string };

type Store = { drafts: DraftRecord[] };

async function load(): Promise<Store> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { drafts: [] };
    throw error;
  }
}

async function save(store: Store) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(store, null, 2), { mode: 0o600 });
}

export async function rememberDraft(record: Omit<DraftRecord, "createdAt" | "updatedAt">) {
  const store = await load();
  const now = new Date().toISOString();
  const existing = store.drafts.find((draft) => draft.accountId === record.accountId && draft.draftId === record.draftId);
  if (existing) Object.assign(existing, record, { updatedAt: now });
  else store.drafts.push({ ...record, createdAt: now, updatedAt: now });
  await save(store);
}

export async function assertDraftOwned(accountId: string, draftId: string) {
  const store = await load();
  if (!store.drafts.some((draft) => draft.accountId === accountId && draft.draftId === draftId)) {
    throw new Error(`Draft '${draftId}' was not created by clawmailreader for account '${accountId}'`);
  }
}
