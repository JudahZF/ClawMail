# clawmail

Secure OpenClaw email plugin for read, organize, and draft-only workflows across Gmail, Outlook, and iCloud.

## Exposed tools

- `clawmail_list_accounts`
- `clawmail_list_folders`
- `clawmail_create_folder`
- `clawmail_search_email`
- `clawmail_get_email`
- `clawmail_move_email`
- `clawmail_archive_email`
- `clawmail_create_draft`
- `clawmail_update_draft`

No send, trash, or delete tools are registered.

## Configuration

Create `clawmail.config.json` or set `CLAWMAIL_CONFIG`:

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

Secrets are read from the OS keychain first, with environment variable overrides supported. Store keychain secrets with:

```sh
pnpm build
clawmail set-secret <account-id> <secret-name> <value>
```

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

## Environment secret override format

```sh
CLAWMAIL_<ACCOUNT_ID>_<SECRET_NAME>=...
```

Non-alphanumeric characters in the account id or secret name are converted to underscores and uppercased.

Example:

```sh
CLAWMAIL_PERSONAL_GMAIL_GMAIL_REFRESH_TOKEN=...
```

## Storage

- Audit log: `.clawmail/audit.log` or `CLAWMAIL_AUDIT_LOG`
- Draft ownership store: `.clawmail/drafts.json` or `CLAWMAIL_DRAFT_STORE`

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
      "clawmail_list_accounts",
      "clawmail_list_folders",
      "clawmail_create_folder",
      "clawmail_search_email",
      "clawmail_get_email",
      "clawmail_move_email",
      "clawmail_archive_email",
      "clawmail_create_draft",
      "clawmail_update_draft"
    ],
    deny: [
      "clawmail_send_email",
      "clawmail_send_draft",
      "clawmail_delete_email",
      "clawmail_trash_email",
      "clawmail_empty_trash"
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
