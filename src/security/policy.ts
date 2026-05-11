import type { Account } from "../providers/types.js";

export type Capability = "read" | "createFolder" | "move" | "archive" | "drafts";

export function assertAllowed(account: Account, capability: Capability) {
  const allowed =
    capability === "read" ? account.policy.allowRead :
    capability === "createFolder" ? account.policy.allowCreateFolder :
    capability === "move" ? account.policy.allowMove :
    capability === "archive" ? account.policy.allowArchive :
    account.policy.allowDrafts;

  if (!allowed) throw new Error(`Capability '${capability}' is disabled for account ${account.id}`);
  if (account.policy.allowSend !== false || account.policy.allowDelete !== false) {
    throw new Error(`Unsafe policy for account ${account.id}: send/delete must remain false`);
  }
}
