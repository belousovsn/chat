import { and, eq, inArray, isNull, lte, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { attachments } from "../db/schema.js";
import { deleteStoredFiles } from "./files.js";

type AttachmentRow = {
  id: string;
  storedName: string;
};

const deleteAttachmentRows = async (rows: AttachmentRow[]) => {
  if (rows.length === 0) {
    return 0;
  }

  const ids = rows.map((row) => row.id);
  await db.delete(attachments).where(inArray(attachments.id, ids));
  await deleteStoredFiles(rows.map((row) => row.storedName));
  return rows.length;
};

const selectAttachmentRows = async (where?: SQL<unknown>) => {
  const query = db
    .select({
      id: attachments.id,
      storedName: attachments.storedName
    })
    .from(attachments);

  return where ? query.where(where) : query;
};

export const deleteAttachmentsByConversationId = async (conversationId: string) => {
  const rows = await selectAttachmentRows(eq(attachments.conversationId, conversationId));
  return deleteAttachmentRows(rows);
};

export const deleteAttachmentsByMessageIds = async (messageIds: string[]) => {
  if (messageIds.length === 0) {
    return 0;
  }

  const rows = await selectAttachmentRows(inArray(attachments.messageId, messageIds));
  return deleteAttachmentRows(rows);
};

export const deleteAttachmentsByUploaderId = async (uploaderId: string) => {
  const rows = await selectAttachmentRows(eq(attachments.uploaderId, uploaderId));
  return deleteAttachmentRows(rows);
};

export const deleteOrphanAttachments = async (
  conversationId: string,
  uploaderId: string,
  options?: {
    olderThan?: Date;
  }
) => {
  const filters = [
    eq(attachments.conversationId, conversationId),
    eq(attachments.uploaderId, uploaderId),
    isNull(attachments.messageId)
  ];

  if (options?.olderThan) {
    filters.push(lte(attachments.createdAt, options.olderThan));
  }

  const rows = await selectAttachmentRows(and(...filters));
  return deleteAttachmentRows(rows);
};
