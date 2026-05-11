import keytar from "keytar";

const service = "clawmail";

export async function getSecret(accountId: string, name: string) {
  return keytar.getPassword(service, `${accountId}:${name}`);
}

export async function setSecret(accountId: string, name: string, value: string) {
  await keytar.setPassword(service, `${accountId}:${name}`, value);
}

export function envSecret(accountId: string, name: string) {
  const normalized = `${accountId}_${name}`.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  return process.env[`CLAWMAIL_${normalized}`];
}

export async function requireSecret(accountId: string, name: string) {
  const secret = envSecret(accountId, name) ?? await getSecret(accountId, name);
  if (!secret) throw new Error(`Missing secret '${name}' for account '${accountId}'`);
  return secret;
}
