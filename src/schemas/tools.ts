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
  clawmail_list_accounts: z.object({}).optional(),
  clawmail_list_folders: listFoldersSchema,
  clawmail_create_folder: createFolderSchema,
  clawmail_search_email: searchEmailSchema,
  clawmail_get_email: getEmailSchema,
  clawmail_move_email: moveEmailSchema,
  clawmail_archive_email: archiveEmailSchema,
  clawmail_create_draft: draftSchema.omit({ draftId: true }),
  clawmail_update_draft: draftSchema.required({ draftId: true }),
};
