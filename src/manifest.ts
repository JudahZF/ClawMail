export const toolNames = [
  "clawmailreader_list_accounts",
  "clawmailreader_list_folders",
  "clawmailreader_create_folder",
  "clawmailreader_search_email",
  "clawmailreader_get_email",
  "clawmailreader_move_email",
  "clawmailreader_archive_email",
  "clawmailreader_create_draft",
  "clawmailreader_update_draft",
] as const;

export const configSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    accounts: {
      type: "array",
      default: [],
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "provider", "email"],
        properties: {
          id: { type: "string", minLength: 1 },
          provider: { type: "string", enum: ["gmail", "outlook", "icloud"] },
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          policy: {
            type: "object",
            additionalProperties: false,
            properties: {
              allowRead: { type: "boolean", default: true },
              allowCreateFolder: { type: "boolean", default: true },
              allowMove: { type: "boolean", default: true },
              allowArchive: { type: "boolean", default: true },
              allowDrafts: { type: "boolean", default: true },
              allowSend: { const: false, default: false },
              allowDelete: { const: false, default: false },
            },
          },
        },
      },
    },
  },
} as const;

export const uiHints = {
  accounts: {
    label: "Email accounts",
    help: "Configured Gmail, Outlook, and iCloud accounts. Sending and deleting are intentionally unsupported.",
  },
} as const;

export const manifest = {
  id: "clawmailreader",
  name: "ClawMailReader",
  version: "1.0.0",
  description: "Secure email plugin for read, organize, and draft-only workflows across Gmail, Outlook, and iCloud.",
  main: "dist/src/index.js",
  contracts: { tools: [...toolNames] },
  uiHints,
  configSchema,
};
