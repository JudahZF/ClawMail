import { getAccount, loadConfig } from "../config.js";
import { providerFor } from "../providers/index.js";
import { audit } from "../security/auditLog.js";
import { assertDraftOwned } from "../security/draftStore.js";
import { assertAllowed } from "../security/policy.js";
import { archiveEmailSchema, createFolderSchema, draftSchema, getEmailSchema, listFoldersSchema, moveEmailSchema, searchEmailSchema } from "../schemas/tools.js";

async function withAccount<T>(tool: string, accountId: string, run: (account: Awaited<ReturnType<typeof getAccount>>) => Promise<T>) {
  const account = await getAccount(accountId);
  try {
    const result = await run(account);
    await audit({ tool, accountId: account.id, provider: account.provider, outcome: "ok" });
    return result;
  } catch (error) {
    await audit({ tool, accountId: account.id, provider: account.provider, outcome: "error" });
    throw error;
  }
}

export const handlers = {
  async clawmailreader_list_accounts() {
    const { accounts } = await loadConfig();
    return accounts.map(({ id, provider, email, displayName, policy }) => ({ id, provider, email, displayName, capabilities: policy }));
  },
  async clawmailreader_list_folders(input: unknown) {
    const parsed = listFoldersSchema.parse(input);
    return withAccount("clawmailreader_list_folders", parsed.accountId, async (account) => {
      assertAllowed(account, "read");
      return providerFor(account.provider).listFolders(account);
    });
  },
  async clawmailreader_create_folder(input: unknown) {
    const parsed = createFolderSchema.parse(input);
    return withAccount("clawmailreader_create_folder", parsed.accountId, async (account) => {
      assertAllowed(account, "createFolder");
      return providerFor(account.provider).createFolder(account, parsed.name, parsed.parentFolderId);
    });
  },
  async clawmailreader_search_email(input: unknown) {
    const parsed = searchEmailSchema.parse(input);
    return withAccount("clawmailreader_search_email", parsed.accountId, async (account) => {
      assertAllowed(account, "read");
      return providerFor(account.provider).searchMessages(account, parsed);
    });
  },
  async clawmailreader_get_email(input: unknown) {
    const parsed = getEmailSchema.parse(input);
    return withAccount("clawmailreader_get_email", parsed.accountId, async (account) => {
      assertAllowed(account, "read");
      return providerFor(account.provider).getMessage(account, parsed.messageId);
    });
  },
  async clawmailreader_move_email(input: unknown) {
    const parsed = moveEmailSchema.parse(input);
    return withAccount("clawmailreader_move_email", parsed.accountId, async (account) => {
      assertAllowed(account, "move");
      return providerFor(account.provider).moveMessage(account, parsed.messageId, parsed.folderId);
    });
  },
  async clawmailreader_archive_email(input: unknown) {
    const parsed = archiveEmailSchema.parse(input);
    return withAccount("clawmailreader_archive_email", parsed.accountId, async (account) => {
      assertAllowed(account, "archive");
      return providerFor(account.provider).archiveMessage(account, parsed.messageId);
    });
  },
  async clawmailreader_create_draft(input: unknown) {
    const parsed = draftSchema.omit({ draftId: true }).parse(input);
    return withAccount("clawmailreader_create_draft", parsed.accountId, async (account) => {
      assertAllowed(account, "drafts");
      return providerFor(account.provider).createDraft(account, parsed);
    });
  },
  async clawmailreader_update_draft(input: unknown) {
    const parsed = draftSchema.required({ draftId: true }).parse(input);
    return withAccount("clawmailreader_update_draft", parsed.accountId, async (account) => {
      assertAllowed(account, "drafts");
      await assertDraftOwned(account.id, parsed.draftId);
      return providerFor(account.provider).updateDraft(account, parsed.draftId, parsed);
    });
  },
};
