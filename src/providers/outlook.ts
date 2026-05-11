import { ConfidentialClientApplication } from "@azure/msal-node";
import { rememberDraft } from "../security/draftStore.js";
import { requireSecret } from "../security/secrets.js";
import type { Account, Draft, DraftInput, EmailProvider, Folder, Message, MessageSummary, SearchInput } from "./types.js";

type GraphMessage = { id: string; conversationId?: string; subject?: string; from?: { emailAddress?: { address?: string; name?: string } }; toRecipients?: Array<{ emailAddress?: { address?: string } }>; receivedDateTime?: string; bodyPreview?: string; parentFolderId?: string; internetMessageHeaders?: Array<{ name: string; value: string }>; body?: { contentType?: string; content?: string }; hasAttachments?: boolean };
type GraphFolder = { id: string; displayName: string; parentFolderId?: string };

export class OutlookProvider implements EmailProvider {
  private async token(account: Account) {
    const app = new ConfidentialClientApplication({ auth: { clientId: await requireSecret(account.id, "outlook_client_id"), clientSecret: await requireSecret(account.id, "outlook_client_secret"), authority: `https://login.microsoftonline.com/${await requireSecret(account.id, "outlook_tenant_id")}` } });
    const result = await app.acquireTokenByRefreshToken({ refreshToken: await requireSecret(account.id, "outlook_refresh_token"), scopes: ["https://graph.microsoft.com/Mail.ReadWrite", "offline_access"] });
    if (!result?.accessToken) throw new Error(`Unable to acquire Outlook token for '${account.id}'`);
    return result.accessToken;
  }

  private async graph<T>(account: Account, path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me${path}`, { ...init, headers: { Authorization: `Bearer ${await this.token(account)}`, "Content-Type": "application/json", ...init.headers } });
    if (!response.ok) throw new Error(`Outlook Graph request failed: ${response.status} ${await response.text()}`);
    return response.status === 204 ? undefined as T : await response.json() as T;
  }

  async listFolders(account: Account): Promise<Folder[]> {
    const data = await this.graph<{ value: GraphFolder[] }>(account, "/mailFolders?$top=100");
    return data.value.map((folder) => ({ id: folder.id, name: folder.displayName, path: folder.parentFolderId }));
  }

  async createFolder(account: Account, name: string, parentFolderId?: string): Promise<Folder> {
    const path = parentFolderId ? `/mailFolders/${encodeURIComponent(parentFolderId)}/childFolders` : "/mailFolders";
    const folder = await this.graph<GraphFolder>(account, path, { method: "POST", body: JSON.stringify({ displayName: name }) });
    return { id: folder.id, name: folder.displayName, path: folder.parentFolderId };
  }

  async searchMessages(account: Account, input: SearchInput): Promise<MessageSummary[]> {
    const filters = [input.from && `from/emailAddress/address eq '${escapeOData(input.from)}'`, input.to && `toRecipients/any(r:r/emailAddress/address eq '${escapeOData(input.to)}')`, input.after && `receivedDateTime ge ${input.after}`, input.before && `receivedDateTime le ${input.before}`].filter(Boolean);
    const base = input.folderId ? `/mailFolders/${encodeURIComponent(input.folderId)}/messages` : "/messages";
    const params = new URLSearchParams({ "$top": String(input.limit), "$select": "id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview,parentFolderId" });
    if (input.query) params.set("$search", `"${input.query.replace(/"/g, "")}"`);
    if (filters.length) params.set("$filter", filters.join(" and "));
    const data = await this.graph<{ value: GraphMessage[] }>(account, `${base}?${params}`);
    return data.value.map(summaryFromGraph);
  }

  async getMessage(account: Account, messageId: string): Promise<Message> {
    const message = await this.graph<GraphMessage>(account, `/messages/${encodeURIComponent(messageId)}?$select=id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview,parentFolderId,internetMessageHeaders,body,hasAttachments`);
    const headers = Object.fromEntries((message.internetMessageHeaders ?? []).map((header) => [header.name, header.value]));
    return { ...summaryFromGraph(message), headers, textBody: message.body?.contentType === "text" ? message.body.content : undefined, htmlBody: message.body?.contentType === "html" ? message.body.content : undefined, attachments: message.hasAttachments ? [{ id: "metadata-only", filename: "attachments-present", mimeType: "application/octet-stream" }] : [] };
  }

  async moveMessage(account: Account, messageId: string, folderId: string): Promise<MessageSummary> {
    const moved = await this.graph<GraphMessage>(account, `/messages/${encodeURIComponent(messageId)}/move`, { method: "POST", body: JSON.stringify({ destinationId: folderId }) });
    return summaryFromGraph(moved);
  }

  async archiveMessage(account: Account, messageId: string): Promise<MessageSummary> {
    return this.moveMessage(account, messageId, "archive");
  }

  async createDraft(account: Account, draft: DraftInput): Promise<Draft> {
    const created = await this.graph<GraphMessage>(account, "/messages", { method: "POST", body: JSON.stringify(toGraphDraft(draft)) });
    const result = { id: created.id, messageId: created.id, accountId: account.id };
    await rememberDraft({ accountId: account.id, provider: account.provider, draftId: result.id, messageId: result.messageId });
    return result;
  }

  async updateDraft(account: Account, draftId: string, draft: DraftInput): Promise<Draft> {
    await this.graph<unknown>(account, `/messages/${encodeURIComponent(draftId)}`, { method: "PATCH", body: JSON.stringify(toGraphDraft(draft)) });
    const result = { id: draftId, messageId: draftId, accountId: account.id };
    await rememberDraft({ accountId: account.id, provider: account.provider, draftId, messageId: draftId });
    return result;
  }
}

function summaryFromGraph(message: GraphMessage): MessageSummary {
  return { id: message.id, threadId: message.conversationId, subject: message.subject, from: message.from?.emailAddress?.address, to: message.toRecipients?.map((recipient) => recipient.emailAddress?.address ?? "").filter(Boolean), date: message.receivedDateTime, snippet: message.bodyPreview, folderIds: message.parentFolderId ? [message.parentFolderId] : undefined };
}

function toGraphDraft(draft: DraftInput) {
  return { subject: draft.subject, body: { contentType: "Text", content: draft.body }, toRecipients: draft.to.map(emailAddress), ccRecipients: draft.cc?.map(emailAddress), bccRecipients: draft.bcc?.map(emailAddress), internetMessageHeaders: [{ name: "X-Clawmail-Draft", value: "true" }] };
}

function emailAddress(address: string) {
  return { emailAddress: { address } };
}

function escapeOData(value: string) {
  return value.replace(/'/g, "''");
}
