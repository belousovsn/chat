import { randomUUID } from "node:crypto";
import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { attachments } from "../../db/schema.js";
import { requireAuth } from "../../lib/auth.js";
import { config } from "../../config.js";
import { deleteOrphanAttachments } from "../../lib/attachments.js";
import { ensureUploadDir, resolveUploadPath, deleteStoredFile } from "../../lib/files.js";
import { HttpError, sendError } from "../../lib/http.js";
import { ensureConversationAccess } from "../conversations/service.js";

const normalizeComment = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > 500) {
    throw new HttpError(400, "Attachment comment is too long");
  }
  return trimmed;
};

const normalizeOriginalName = (filename: string | undefined) => {
  const normalized = path.basename(filename ?? "").trim();
  return normalized || "attachment";
};

const getMultipartFieldValue = (field: unknown): string | null => {
  if (Array.isArray(field)) {
    return field.length > 0 ? getMultipartFieldValue(field[0]) : null;
  }
  if (!field || typeof field !== "object" || !("value" in field)) {
    return null;
  }
  const value = (field as { value: unknown }).value;
  return typeof value === "string" ? value : null;
};

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/conversations/:id/uploads", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string };
      await ensureConversationAccess(params.id, auth.user.id);
      await deleteOrphanAttachments(params.id, auth.user.id, {
        olderThan: new Date(Date.now() - 1000 * 60 * 60)
      });

      const file = await request.file({
        limits: {
          files: 1,
          fileSize: config.maxFileBytes
        }
      });
      if (!file) {
        throw new HttpError(400, "File is required");
      }

      const originalName = normalizeOriginalName(file.filename);
      const kind = file.mimetype.startsWith("image/") ? "image" : "file";
      const comment = normalizeComment(getMultipartFieldValue(file.fields.comment));
      const buffer = await file.toBuffer();

      if (buffer.byteLength === 0) {
        throw new HttpError(400, "File is empty");
      }
      if (kind === "image" && buffer.byteLength > config.maxImageBytes) {
        throw new HttpError(400, "Image exceeds size limit");
      }

      const storedName = `${randomUUID()}${path.extname(originalName)}`;
      await ensureUploadDir();
      await writeFile(resolveUploadPath(storedName), buffer);

      try {
        const [attachment] = await db.insert(attachments).values({
          conversationId: params.id,
          uploaderId: auth.user.id,
          kind,
          originalName,
          storedName,
          mimeType: file.mimetype || "application/octet-stream",
          byteSize: buffer.byteLength,
          comment
        }).returning();

        if (!attachment) {
          throw new HttpError(500, "Failed to save attachment");
        }

        return {
          id: attachment.id,
          kind: attachment.kind,
          originalName: attachment.originalName,
          storedName: attachment.storedName,
          mimeType: attachment.mimeType,
          byteSize: attachment.byteSize,
          comment: attachment.comment,
          downloadUrl: `/api/uploads/${attachment.id}/download`,
          uploadedAt: attachment.createdAt.toISOString()
        };
      } catch (error) {
        await deleteStoredFile(storedName);
        throw error;
      }
    } catch (error) {
      if ((error as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") {
        return sendError(reply, new HttpError(400, "File exceeds size limit"));
      }
      return sendError(reply, error);
    }
  });

  app.get("/api/uploads/:id/download", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string };
      const [attachment] = await db.select().from(attachments).where(eq(attachments.id, params.id));
      if (!attachment) {
        throw new HttpError(404, "Attachment not found");
      }

      await ensureConversationAccess(attachment.conversationId, auth.user.id);

      const filePath = resolveUploadPath(attachment.storedName);
      await access(filePath);

      reply.header("Content-Type", attachment.mimeType || "application/octet-stream");
      reply.header("Content-Length", String(attachment.byteSize));
      reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
      return reply.send(createReadStream(filePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return sendError(reply, new HttpError(404, "Stored file not found"));
      }
      return sendError(reply, error);
    }
  });
};
