import { manifest, toolNames } from "./manifest.js";
import { toolSchemas } from "./schemas/tools.js";
import { handlers } from "./tools/handlers.js";

export type OpenClawPluginApi = {
  registerTool: (name: string, descriptor: { description: string; inputSchema?: unknown; handler: (input: unknown) => Promise<unknown> }) => void;
};

const descriptions: Record<(typeof toolNames)[number], string> = {
  clawmail_list_accounts: "List configured email accounts and their allowed capabilities.",
  clawmail_list_folders: "List folders/labels/mailboxes for an account.",
  clawmail_create_folder: "Create a folder/label/mailbox for an account. Does not remove anything.",
  clawmail_search_email: "Search email and return summaries only.",
  clawmail_get_email: "Fetch one email message, including body and attachment metadata.",
  clawmail_move_email: "Move an email to a folder using provider-native safe move semantics.",
  clawmail_archive_email: "Archive an email without removing it permanently.",
  clawmail_create_draft: "Create an email draft only. It cannot transmit mail.",
  clawmail_update_draft: "Update an existing draft only. It cannot transmit mail.",
};

export function activate(api: OpenClawPluginApi) {
  for (const name of toolNames) {
    api.registerTool(name, {
      description: descriptions[name],
      inputSchema: toolSchemas[name],
      handler: handlers[name],
    });
  }
}

export default { manifest, activate };
