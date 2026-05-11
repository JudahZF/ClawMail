export const toolNames = [
  "clawmail_list_accounts",
  "clawmail_list_folders",
  "clawmail_create_folder",
  "clawmail_search_email",
  "clawmail_get_email",
  "clawmail_move_email",
  "clawmail_archive_email",
  "clawmail_create_draft",
  "clawmail_update_draft",
] as const;

export const manifest = {
  name: "clawmail",
  version: "0.1.0",
  description: "Secure OpenClaw email plugin for read, organize, and draft-only workflows.",
  contracts: { tools: [...toolNames] },
};
