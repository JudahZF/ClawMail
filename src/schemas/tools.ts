import { z } from "zod";

export const accountIdSchema = z.object({ accountId: z.string().min(1) });
export const listFoldersSchema = accountIdSchema;
export const createFolderSchema = accountIdSchema.extend({ name: z.string().min(1), parentFolderId: z.string().optional() });
export const searchEmailSchema = accountIdSchema.extend({
  query: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  after: z.string().optional(),
  before: z.string().optional(),
  folderId: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});
export const getEmailSchema = accountIdSchema.extend({ messageId: z.string().min(1) });
export const moveEmailSchema = accountIdSchema.extend({ messageId: z.string().min(1), folderId: z.string().min(1) });
export const archiveEmailSchema = accountIdSchema.extend({ messageId: z.string().min(1) });
export const draftSchema = accountIdSchema.extend({
  draftId: z.string().optional(),
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string(),
  body: z.string(),
  inReplyToMessageId: z.string().optional(),
});

export const toolSchemas = {
  clawmailreader_list_accounts: z.object({}),
  clawmailreader_list_folders: listFoldersSchema,
  clawmailreader_create_folder: createFolderSchema,
  clawmailreader_search_email: searchEmailSchema,
  clawmailreader_get_email: getEmailSchema,
  clawmailreader_move_email: moveEmailSchema,
  clawmailreader_archive_email: archiveEmailSchema,
  clawmailreader_create_draft: draftSchema.omit({ draftId: true }),
  clawmailreader_update_draft: draftSchema.required({ draftId: true }),
};

export const toolJsonSchemas = Object.fromEntries(
  Object.entries(toolSchemas).map(([name, schema]) => [name, z.toJSONSchema(schema)]),
) as Record<keyof typeof toolSchemas, unknown>;
