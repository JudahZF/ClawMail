#!/usr/bin/env node
import { setSecret } from "./security/secrets.js";

const [, , command, accountId, name, value] = process.argv;

if (command === "set-secret" && accountId && name && value) {
  await setSecret(accountId, name, value);
  console.log(`Stored secret '${name}' for account '${accountId}' in the OS keychain.`);
} else {
  console.log(`clawmail setup helper\n\nUsage:\n  clawmail set-secret <account-id> <name> <value>\n\nCommon secret names:\n  gmail_client_id\n  gmail_client_secret\n  gmail_refresh_token\n  outlook_client_id\n  outlook_client_secret\n  outlook_tenant_id\n  outlook_refresh_token\n  icloud_app_password\n\nEquivalent environment variables are also supported as CLAWMAIL_<ACCOUNT_ID>_<NAME>.`);
}
