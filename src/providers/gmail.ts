import { google, gmail_v1 } from "googleapis";
import { rememberDraft } from "../security/draftStore.js";
import { requireSecret } from "../security/secrets.js";
import { buildMimeMessage, encodeBase64Url } from "./mime.js";
import type { Account, Draft, DraftInput, EmailProvider, Folder, Message, MessageSummary, SearchInput } from "./types.js";

export class GmailProvider implements EmailProvider {
  private async client(account: Account) {
    const auth = new google.auth.OAuth2(
      await requireSecret(account.id, "gmail_client_id"),
      await requireSecret(account.id, "gmail_client_secret"),
      process.env.CLAWMAILREADER_GMAIL_REDIRECT_URI ?? "http://localhost",
    );
    auth.setCredentials({ refresh_token: await requireSecret(account.id, "gmail_refresh_token") });
    return google.gmail({ version: "v1", auth });
  }

  async listFolders(account: Account): Promise<Folder[]> {
    const gmail = await this.client(account);
    const response = await gmail.users.labels.list({ userId: "me" });
    return response.data.labels?.map((label) => ({ id: label.id ?? "", name: label.name ?? "", path: label.type ?? undefined })).filter((label) => label.id) ?? [];
  }

  async createFolder(account: Account, name: string): Promise<Folder> {
    const gmail = await this.client(account);
    const response = await gmail.users.labels.create({ userId: "me", requestBody: { name, labelListVisibility: "labelShow", messageListVisibility: "show" } });
    return { id: response.data.id ?? name, name: response.data.name ?? name };
  }

  async searchMessages(account: Account, input: SearchInput): Promise<MessageSummary[]> {
    const gmail = await this.client(account);
    const q = [input.query, input.from && `from:${input.from}`, input.to && `to:${input.to}`, input.after && `after:${input.after}`, input.before && `before:${input.before}`].filter(Boolean).join(" ");
    const list = await gmail.users.messages.list({ userId: "me", q, labelIds: input.folderId ? [input.folderId] : undefined, maxResults: input.limit });
    const messages = list.data.messages ?? [];
    return Promise.all(messages.map(async (message) => this.summary(gmail, message.id ?? "")));
  }

  async getMessage(account: Account, messageId: string): Promise<Message> {
    const gmail = await this.client(account);
    const response = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
    return this.messageFrom(response.data);
  }

  async moveMessage(account: Account, messageId: string, folderId: string): Promise<MessageSummary> {
    const gmail = await this.client(account);
    await gmail.users.messages.modify({ userId: "me", id: messageId, requestBody: { addLabelIds: [folderId], removeLabelIds: ["INBOX"] } });
    return this.summary(gmail, messageId);
  }

  async archiveMessage(account: Account, messageId: string): Promise<MessageSummary> {
    const gmail = await this.client(account);
    await gmail.users.messages.modify({ userId: "me", id: messageId, requestBody: { removeLabelIds: ["INBOX"] } });
    return this.summary(gmail, messageId);
  }

  async createDraft(account: Account, draft: DraftInput): Promise<Draft> {
    const gmail = await this.client(account);
    const response = await gmail.users.drafts.create({ userId: "me", requestBody: { message: { raw: encodeBase64Url(buildMimeMessage(draft)) } } });
    const created = { id: response.data.id ?? "", messageId: response.data.message?.id ?? undefined, accountId: account.id };
    await rememberDraft({ accountId: account.id, provider: account.provider, draftId: created.id, messageId: created.messageId });
    return created;
  }

  async updateDraft(account: Account, draftId: string, draft: DraftInput): Promise<Draft> {
    const gmail = await this.client(account);
    const response = await gmail.users.drafts.update({ userId: "me", id: draftId, requestBody: { message: { raw: encodeBase64Url(buildMimeMessage(draft)) } } });
    const updated = { id: response.data.id ?? draftId, messageId: response.data.message?.id ?? undefined, accountId: account.id };
    await rememberDraft({ accountId: account.id, provider: account.provider, draftId: updated.id, messageId: updated.messageId });
    return updated;
  }

  private async summary(gmail: gmail_v1.Gmail, id: string): Promise<MessageSummary> {
    const response = await gmail.users.messages.get({ userId: "me", id, format: "metadata", metadataHeaders: ["Subject", "From", "To", "Date"] });
    const message = response.data;
    const headers = Object.fromEntries((message.payload?.headers ?? []).map((header) => [header.name ?? "", header.value ?? ""]));
    return { id, threadId: message.threadId ?? undefined, subject: headers.Subject, from: headers.From, to: headers.To ? [headers.To] : undefined, date: headers.Date, snippet: message.snippet ?? undefined, folderIds: message.labelIds ?? undefined };
  }

  private messageFrom(message: gmail_v1.Schema$Message): Message {
    const headers = Object.fromEntries((message.payload?.headers ?? []).map((header) => [header.name ?? "", header.value ?? ""]));
    const parts = flattenParts(message.payload);
    return { id: message.id ?? "", threadId: message.threadId ?? undefined, subject: headers.Subject, from: headers.From, to: headers.To ? [headers.To] : undefined, date: headers.Date, snippet: message.snippet ?? undefined, folderIds: message.labelIds ?? undefined, headers, textBody: body(parts, "text/plain"), htmlBody: body(parts, "text/html"), attachments: parts.filter((part) => part.filename).map((part) => ({ id: part.body?.attachmentId ?? "", filename: part.filename ?? "", mimeType: part.mimeType ?? "application/octet-stream", size: part.body?.size ?? undefined })) };
  }
}

function flattenParts(part?: gmail_v1.Schema$MessagePart): gmail_v1.Schema$MessagePart[] {
  if (!part) return [];
  return [part, ...(part.parts ?? []).flatMap(flattenParts)];
}

function body(parts: gmail_v1.Schema$MessagePart[], mimeType: string) {
  const data = parts.find((part) => part.mimeType === mimeType && part.body?.data)?.body?.data;
  return data ? Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8") : undefined;
}
