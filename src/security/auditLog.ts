import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const auditPath = process.env.CLAWMAIL_AUDIT_LOG ?? ".clawmail/audit.log";

export async function audit(event: { tool: string; accountId?: string; provider?: string; targetId?: string; outcome: "ok" | "error" }) {
  await mkdir(dirname(auditPath), { recursive: true });
  await appendFile(auditPath, `${JSON.stringify({ timestamp: new Date().toISOString(), ...event })}\n`, { mode: 0o600 });
}
