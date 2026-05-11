import { GmailProvider } from "./gmail.js";
import { ICloudProvider } from "./icloud.js";
import { OutlookProvider } from "./outlook.js";
import type { EmailProvider, ProviderKind } from "./types.js";

const providers: Record<ProviderKind, EmailProvider> = {
  gmail: new GmailProvider(),
  outlook: new OutlookProvider(),
  icloud: new ICloudProvider(),
};

export function providerFor(kind: ProviderKind) {
  return providers[kind];
}
