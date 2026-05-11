# clawmailreader

Secure OpenClaw email plugin for read, organize, and draft-only workflows across Gmail, Outlook, and iCloud.

## Exposed tools

- `clawmailreader_list_accounts`
- `clawmailreader_list_folders`
- `clawmailreader_create_folder`
- `clawmailreader_search_email`
- `clawmailreader_get_email`
- `clawmailreader_move_email`
- `clawmailreader_archive_email`
- `clawmailreader_create_draft`
- `clawmailreader_update_draft`

No send, trash, or delete tools are registered.

## Configuration

Create `clawmailreader.config.json` or set `CLAWMAILREADER_CONFIG`:

```json
{
  "accounts": [
    {
      "id": "personal-gmail",
      "provider": "gmail",
      "email": "you@gmail.com",
      "policy": {
        "allowRead": true,
        "allowCreateFolder": true,
        "allowMove": true,
        "allowArchive": true,
        "allowDrafts": true,
        "allowSend": false,
        "allowDelete": false
      }
    }
  ]
}
```

`allowSend` and `allowDelete` must remain `false`.

## Secrets

OS keychain storage is not used. Follow OpenClaw's recommended secrets flow: keep secret values out of plugin config and expose them through OpenClaw SecretRefs, typically with the `env` provider. This plugin reads the resolved environment variables named below.

Common secret names:

### Gmail

- `gmail_client_id`
- `gmail_client_secret`
- `gmail_refresh_token`

Required OAuth scopes:

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.compose`
- `https://www.googleapis.com/auth/gmail.labels`
- `https://www.googleapis.com/auth/gmail.modify`

### Outlook

- `outlook_client_id`
- `outlook_client_secret`
- `outlook_tenant_id`
- `outlook_refresh_token`

Required delegated scopes:

- `https://graph.microsoft.com/Mail.ReadWrite`
- `offline_access`

### iCloud

- `icloud_app_password`

Use an Apple app-specific password. IMAP defaults to `imap.mail.me.com:993`.

## Environment secret format

```sh
CLAWMAILREADER_<ACCOUNT_ID>_<SECRET_NAME>=...
```

Non-alphanumeric characters in the account id or secret name are converted to underscores and uppercased.

Example SecretRef-backed env provider value:

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }
    }
  },
  plugins: {
    entries: {
      clawmailreader: {
        config: { accounts: [/* ... */] }
      }
    }
  }
}
```

Then provide the corresponding environment variable to the OpenClaw runtime:

```sh
CLAWMAILREADER_PERSONAL_GMAIL_GMAIL_REFRESH_TOKEN=...
```

## Storage

- Audit log: `.clawmailreader/audit.log` or `CLAWMAILREADER_AUDIT_LOG`
- Draft ownership store: `.clawmailreader/drafts.json` or `CLAWMAILREADER_DRAFT_STORE`

Draft updates are restricted to drafts this plugin created.

## Provider notes

- Gmail move is implemented by adding the destination label and removing `INBOX`.
- Gmail archive removes `INBOX`.
- Outlook archive moves to the well-known `archive` folder.
- iCloud move/archive requires native IMAP `MOVE`; unsafe copy/remove fallbacks are refused.
- iCloud draft updates are refused because safe in-place IMAP draft update is not available without remove semantics. Create a new draft instead.

## Recommended OpenClaw allowlist

```json5
{
  tools: {
    allow: [
      "clawmailreader_list_accounts",
      "clawmailreader_list_folders",
      "clawmailreader_create_folder",
      "clawmailreader_search_email",
      "clawmailreader_get_email",
      "clawmailreader_move_email",
      "clawmailreader_archive_email",
      "clawmailreader_create_draft",
      "clawmailreader_update_draft"
    ],
    deny: [
      "clawmailreader_send_email",
      "clawmailreader_send_draft",
      "clawmailreader_delete_email",
      "clawmailreader_trash_email",
      "clawmailreader_empty_trash"
    ]
  }
}
```

## Development

```sh
pnpm check
pnpm test
pnpm build
```
