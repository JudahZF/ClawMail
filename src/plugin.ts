import { manifest, toolNames } from "./manifest.js";
import { toolJsonSchemas } from "./schemas/tools.js";
import { handlers } from "./tools/handlers.js";

export type OpenClawPluginApi = {
  registerTool: (name: string, descriptor: { description: string; inputSchema?: unknown; handler: (input: unknown) => Promise<unknown> }) => void;
};

const descriptions: Record<(typeof toolNames)[number], string> = {
  clawmailreader_list_accounts: "List configured email accounts and their allowed capabilities.",
  clawmailreader_list_folders: "List folders/labels/mailboxes for an account.",
  clawmailreader_create_folder: "Create a folder/label/mailbox for an account. Does not remove anything.",
  clawmailreader_search_email: "Search email and return summaries only.",
  clawmailreader_get_email: "Fetch one email message, including body and attachment metadata.",
  clawmailreader_move_email: "Move an email to a folder using provider-native safe move semantics.",
  clawmailreader_archive_email: "Archive an email without removing it permanently.",
  clawmailreader_create_draft: "Create an email draft only. It cannot transmit mail.",
  clawmailreader_update_draft: "Update an existing draft only. It cannot transmit mail.",
};

export function activate(api: OpenClawPluginApi) {
  for (const name of toolNames) {
    api.registerTool(name, {
      description: descriptions[name],
      inputSchema: toolJsonSchemas[name],
      handler: handlers[name],
    });
  }
}

export default { manifest, activate };
