import { useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@chat/shared";
import { api } from "../../lib/api";
import type { UploadedAttachment } from "../../features/chat/store";
import type { ConversationDetails, ConversationSummary } from "./types";
import { dashboardQueryKeys } from "./queryKeys";

type ChatPanelProps = {
  activityTick: number;
  addUploadedAttachment: (attachment: UploadedAttachment) => void;
  conversationDetails: ConversationDetails | undefined;
  meUserId: string | undefined;
  messages: Awaited<ReturnType<typeof api.messages>> | undefined;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onEditMessage: (messageId: string, body: string) => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  onRemoveAttachment: (attachmentId: string) => void;
  onSendMessage: (body: string) => void;
  queryClient: QueryClient;
  replyToMessageId: string | null;
  selectedConversationId: string | null;
  selectedSummary: ConversationSummary | null;
  setReplyToMessageId: (value: string | null) => void;
  uploadedAttachments: UploadedAttachment[];
};

export function ChatPanel(props: ChatPanelProps) {
  const [editingBody, setEditingBody] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!props.selectedConversationId) {
      return;
    }

    const attachment = await api.uploadAttachment(props.selectedConversationId, file);
    props.addUploadedAttachment({
      id: attachment.id,
      originalName: attachment.originalName,
      downloadUrl: attachment.downloadUrl
    });
  };

  return (
    <main className="chat-panel">
      <section className="chat-header">
        <div>
          <h2>{props.conversationDetails?.kind === "direct" ? props.conversationDetails.directPeer?.username ?? props.conversationDetails.name : `# ${props.conversationDetails?.name ?? "Choose a conversation"}`}</h2>
          <p>{props.conversationDetails?.description ?? (props.selectedSummary?.isFrozen ? "Conversation frozen by block rule" : "Classic room description here...")}</p>
        </div>
        <div className="meta">
          <span>{props.conversationDetails?.memberCount ?? 0} members</span>
          <span>tick {props.activityTick}</span>
          {props.conversationDetails?.kind === "room" && (
            <button
              className="ghost"
              onClick={async () => {
                if (!window.confirm("Leave this room?")) {
                  return;
                }
                try {
                  await props.onLeaveRoom();
                } catch {
                  return;
                }
              }}
            >
              Leave room
            </button>
          )}
        </div>
      </section>

      <section className="messages">
        {props.messages?.nextCursor && props.selectedConversationId && (
          <button
            className="ghost older"
            onClick={async () => {
              const conversationId = props.selectedConversationId;
              if (!conversationId) {
                return;
              }
              const older = await api.messages(conversationId, props.messages?.nextCursor ?? undefined);
              props.queryClient.setQueryData(dashboardQueryKeys.messages(conversationId), {
                items: [...older.items, ...(props.messages?.items ?? [])],
                nextCursor: older.nextCursor
              });
            }}
          >
            Load older messages
          </button>
        )}

        {props.messages?.items.map((message: ChatMessage) => (
          <article key={message.id} className="message-card">
            <header>
              <strong>{message.author.username}</strong>
              <span>{new Date(message.createdAt).toLocaleString()}</span>
              {message.isEdited && <em>edited</em>}
              {message.author.id === props.meUserId && (
                <div className="inline-actions">
                  <button className="inline-action" onClick={() => props.setReplyToMessageId(message.id)}>Reply</button>
                  <button
                    className="inline-action"
                    onClick={() => {
                      setEditingMessageId(message.id);
                      setEditingBody(message.body ?? "");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="inline-action"
                    onClick={async () => {
                      if (!window.confirm("Delete this message?")) {
                        return;
                      }
                      try {
                        await props.onDeleteMessage(message.id);
                        if (editingMessageId === message.id) {
                          setEditingMessageId(null);
                          setEditingBody("");
                        }
                      } catch {
                        return;
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </header>
            {message.replyTo && <blockquote>{message.replyTo.authorUsername}: {message.replyTo.body}</blockquote>}
            {editingMessageId === message.id ? (
              <form
                className="stack"
                onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    await props.onEditMessage(message.id, editingBody);
                    setEditingMessageId(null);
                    setEditingBody("");
                  } catch {
                    return;
                  }
                }}
              >
                <textarea value={editingBody} rows={3} onChange={(event) => setEditingBody(event.target.value)} />
                <div className="inline-actions">
                  <button type="submit" className="primary" disabled={!editingBody.trim()}>Save</button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setEditingMessageId(null);
                      setEditingBody("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p>{message.body}</p>
            )}
            {message.attachments.length > 0 && (
              <div className="attachment-strip">
                {message.attachments.map((attachment: ChatMessage["attachments"][number]) => (
                  <a key={attachment.id} href={attachment.downloadUrl} target="_blank" rel="noreferrer">
                    {attachment.originalName}
                  </a>
                ))}
              </div>
            )}
          </article>
        ))}
      </section>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          props.onSendMessage(String(form.get("body") ?? ""));
          event.currentTarget.reset();
        }}
        onPaste={async (event) => {
          const file = event.clipboardData.files?.[0];
          if (file) {
            await handleUpload(file);
          }
        }}
      >
        {props.replyToMessageId && (
          <div className="reply-banner">
            Replying to {props.replyToMessageId}
            <button type="button" className="ghost" onClick={() => props.setReplyToMessageId(null)}>x</button>
          </div>
        )}
        <div className="composer-row">
          <label className="ghost file-picker">
            Attach
            <input
              type="file"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                await handleUpload(file);
              }}
            />
          </label>
          <textarea name="body" placeholder="Write message..." rows={3} />
          <button type="submit" className="primary" disabled={!props.selectedConversationId}>Send</button>
        </div>
        {props.uploadedAttachments.length > 0 && (
          <div className="attachment-strip">
            {props.uploadedAttachments.map((attachment) => (
              <button key={attachment.id} type="button" className="ghost" onClick={() => props.onRemoveAttachment(attachment.id)}>
                {attachment.originalName}
              </button>
            ))}
          </div>
        )}
      </form>
    </main>
  );
}
