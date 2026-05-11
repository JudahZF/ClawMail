export type ProviderKind = "gmail" | "outlook" | "icloud";

export type AccountPolicy = {
  allowRead: boolean;
  allowCreateFolder: boolean;
  allowMove: boolean;
  allowArchive: boolean;
  allowDrafts: boolean;
  allowSend: false;
  allowDelete: false;
};

export type Account = {
  id: string;
  provider: ProviderKind;
  email: string;
  displayName?: string;
  policy: AccountPolicy;
};

export type Folder = { id: string; name: string; path?: string };
export type MessageSummary = {
  id: string;
  threadId?: string;
  subject?: string;
  from?: string;
  to?: string[];
  date?: string;
  snippet?: string;
  folderIds?: string[];
};
export type Message = MessageSummary & {
  headers: Record<string, string>;
  textBody?: string;
  htmlBody?: string;
  attachments: Array<{ id: string; filename: string; mimeType: string; size?: number }>;
};
export type DraftInput = { to: string[]; cc?: string[]; bcc?: string[]; subject: string; body: string; inReplyToMessageId?: string };
export type Draft = { id: string; messageId?: string; accountId: string };
export type SearchInput = { query?: string; from?: string; to?: string; after?: string; before?: string; folderId?: string; limit: number };

export interface EmailProvider {
  listFolders(account: Account): Promise<Folder[]>;
  createFolder(account: Account, name: string, parentFolderId?: string): Promise<Folder>;
  searchMessages(account: Account, input: SearchInput): Promise<MessageSummary[]>;
  getMessage(account: Account, messageId: string): Promise<Message>;
  moveMessage(account: Account, messageId: string, folderId: string): Promise<MessageSummary>;
  archiveMessage(account: Account, messageId: string): Promise<MessageSummary>;
  createDraft(account: Account, draft: DraftInput): Promise<Draft>;
  updateDraft(account: Account, draftId: string, draft: DraftInput): Promise<Draft>;
}

export const defaultPolicy = (): AccountPolicy => ({
  allowRead: true,
  allowCreateFolder: true,
  allowMove: true,
  allowArchive: true,
  allowDrafts: true,
  allowSend: false,
  allowDelete: false,
});
