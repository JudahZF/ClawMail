import type { DraftInput } from "./types.js";

export function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function buildMimeMessage(draft: DraftInput, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    To: draft.to.join(", "),
    Subject: draft.subject,
    "Content-Type": "text/plain; charset=utf-8",
    "X-Clawmail-Draft": "true",
    ...extraHeaders,
  };
  if (draft.cc?.length) headers.Cc = draft.cc.join(", ");
  if (draft.bcc?.length) headers.Bcc = draft.bcc.join(", ");
  if (draft.inReplyToMessageId) headers["In-Reply-To"] = draft.inReplyToMessageId;

  const headerText = Object.entries(headers).map(([key, value]) => `${key}: ${value.replace(/[\r\n]+/g, " ")}`).join("\r\n");
  return `${headerText}\r\n\r\n${draft.body}`;
}
