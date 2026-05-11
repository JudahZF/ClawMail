import { ImapFlow, type FetchMessageObject, type MessageStructureObject } from "imapflow";
import { rememberDraft } from "../security/draftStore.js";
import { requireSecret } from "../security/secrets.js";
import { buildMimeMessage } from "./mime.js";
import type { Account, Draft, DraftInput, EmailProvider, Folder, Message, MessageSummary, SearchInput } from "./types.js";

type ListedMailbox = { path: string; name?: string; children?: ListedMailbox[] };
type AppendResult = { uid?: number };

export class ICloudProvider implements EmailProvider {
  private async connect(account: Account) {
    const client = new ImapFlow({ host: process.env.CLAWMAIL_ICLOUD_HOST ?? "imap.mail.me.com", port: Number(process.env.CLAWMAIL_ICLOUD_PORT ?? 993), secure: true, auth: { user: account.email, pass: await requireSecret(account.id, "icloud_app_password") }, logger: false });
    await client.connect();
    return client;
  }

  async listFolders(account: Account): Promise<Folder[]> {
    return this.withClient(account, async (client) => flattenMailboxes(await client.list() as ListedMailbox[]).map((mailbox) => ({ id: mailbox.path, name: mailbox.name ?? mailbox.path, path: mailbox.path })));
  }

  async createFolder(account: Account, name: string, parentFolderId?: string): Promise<Folder> {
    const path = parentFolderId ? `${parentFolderId}/${name}` : name;
    return this.withClient(account, async (client) => {
      await client.mailboxCreate(path);
      return { id: path, name, path };
    });
  }

  async searchMessages(account: Account, input: SearchInput): Promise<MessageSummary[]> {
    return this.withClient(account, async (client) => {
      const mailbox = input.folderId ?? "INBOX";
      await client.mailboxOpen(mailbox, { readOnly: true });
      const found = await client.search(buildSearch(input), { uid: true });
      const limited = Array.isArray(found) ? found.slice(0, input.limit) : [];
      const summaries: MessageSummary[] = [];
      for await (const msg of client.fetch(limited, { uid: true, envelope: true, flags: true }, { uid: true })) summaries.push(summaryFromImap(mailbox, msg));
      return summaries;
    });
  }

  async getMessage(account: Account, messageId: string): Promise<Message> {
    return this.withClient(account, async (client) => {
      const { mailbox, uid } = parseMessageId(messageId);
      await client.mailboxOpen(mailbox, { readOnly: true });
      const msg = await client.fetchOne(uid, { uid: true, envelope: true, source: true, bodyStructure: true }, { uid: true });
      if (!msg) throw new Error(`iCloud message '${messageId}' not found`);
      const source = msg.source?.toString("utf8");
      return { ...summaryFromImap(mailbox, msg), headers: parseHeaders(source), textBody: source, attachments: attachmentsFromStructure(msg.bodyStructure) };
    });
  }

  async moveMessage(account: Account, messageId: string, folderId: string): Promise<MessageSummary> {
    return this.withClient(account, async (client) => {
      assertNativeMove(client);
      const { mailbox, uid } = parseMessageId(messageId);
      await client.mailboxOpen(mailbox);
      await client.messageMove(uid, folderId, { uid: true });
      return { id: `${folderId}:${uid}`, folderIds: [folderId] };
    });
  }

  async archiveMessage(account: Account, messageId: string): Promise<MessageSummary> {
    return this.moveMessage(account, messageId, process.env.CLAWMAIL_ICLOUD_ARCHIVE_MAILBOX ?? "Archive");
  }

  async createDraft(account: Account, draft: DraftInput): Promise<Draft> {
    return this.withClient(account, async (client) => {
      const mailbox = process.env.CLAWMAIL_ICLOUD_DRAFTS_MAILBOX ?? "Drafts";
      const result = await client.append(mailbox, Buffer.from(buildMimeMessage(draft)), ["Draft"]) as false | AppendResult;
      const id = `${mailbox}:${result && result.uid ? result.uid : Date.now()}`;
      const created = { id, messageId: id, accountId: account.id };
      await rememberDraft({ accountId: account.id, provider: account.provider, draftId: created.id, messageId: created.messageId });
      return created;
    });
  }

  async updateDraft(_account: Account, _draftId: string, _draft: DraftInput): Promise<Draft> {
    throw new Error("iCloud IMAP cannot safely update drafts without remove semantics; create a new draft instead");
  }

  private async withClient<T>(account: Account, run: (client: ImapFlow) => Promise<T>) {
    const client = await this.connect(account);
    try {
      return await run(client);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }
}

function flattenMailboxes(mailboxes: ListedMailbox[]): ListedMailbox[] {
  return mailboxes.flatMap((mailbox) => [mailbox, ...flattenMailboxes(mailbox.children ?? [])]);
}

function buildSearch(input: SearchInput) {
  return { from: input.from, to: input.to, since: input.after ? new Date(input.after) : undefined, before: input.before ? new Date(input.before) : undefined, body: input.query };
}

function parseMessageId(messageId: string) {
  const [mailbox, uidText] = messageId.includes(":") ? messageId.split(/:(.+)/) : ["INBOX", messageId];
  return { mailbox, uid: Number(uidText) };
}

function summaryFromImap(mailbox: string, msg: FetchMessageObject): MessageSummary {
  const envelope = msg.envelope;
  const from = envelope?.from?.[0];
  return { id: `${mailbox}:${msg.uid}`, subject: envelope?.subject, from: from?.address, to: envelope?.to?.map((address) => address.address ?? "").filter(Boolean), date: envelope?.date?.toISOString(), folderIds: [mailbox] };
}

function parseHeaders(source?: string) {
  const headerText = source?.split(/\r?\n\r?\n/, 1)[0] ?? "";
  return Object.fromEntries(headerText.split(/\r?\n/).map((line) => line.match(/^([^:]+):\s*(.*)$/)).filter((match): match is RegExpMatchArray => Boolean(match)).map((match) => [match[1], match[2]]));
}

function attachmentsFromStructure(structure: MessageStructureObject | undefined): Message["attachments"] {
  const children = structure?.childNodes ?? [];
  return children.map((part) => ({ part, filename: dispositionFilename(part.disposition) })).filter((item) => item.filename).map(({ part, filename }) => ({ id: String(part.part), filename: filename ?? "attachment", mimeType: `${part.type}/${part.type}`, size: part.size }));
}

function dispositionFilename(disposition: unknown) {
  if (!disposition || typeof disposition !== "object") return undefined;
  return "filename" in disposition && typeof disposition.filename === "string" ? disposition.filename : undefined;
}

function assertNativeMove(client: ImapFlow) {
  const capabilities = Array.from(client.capabilities?.keys() ?? []).map((capability) => capability.toUpperCase());
  if (!capabilities.includes("MOVE")) throw new Error("iCloud server does not advertise native MOVE support; refusing unsafe move fallback");
}
