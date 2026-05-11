export function envSecret(accountId: string, name: string) {
  const normalized = `${accountId}_${name}`.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  return process.env[`CLAWMAILREADER_${normalized}`];
}

export async function requireSecret(accountId: string, name: string) {
  const secret = envSecret(accountId, name);
  if (!secret) {
    throw new Error(
      `Missing secret '${name}' for account '${accountId}'. ` +
        `Configure it with OpenClaw's recommended SecretRef/env flow, or set CLAWMAILREADER_${`${accountId}_${name}`.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}.`,
    );
  }
  return secret;
}
