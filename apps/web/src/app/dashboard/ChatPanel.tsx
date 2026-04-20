import { useEffect, useMemo, useRef, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@chat/shared";
import { api } from "../../lib/api";
import type { UploadedAttachment } from "../../features/chat/store";
import type { ConversationDetails, ConversationSummary } from "./types";
import { dashboardQueryKeys } from "./queryKeys";

type ChatPanelProps = {
  addUploadedAttachment: (attachment: UploadedAttachment) => void;
  canManageRoom: boolean;
  conversationDetails: ConversationDetails | undefined;
  isSending: boolean;
  meUserId: string | undefined;
  messages: Awaited<ReturnType<typeof api.messages>> | undefined;
  onBackToList: () => void;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onEditMessage: (messageId: string, body: string) => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  onOpenDetails: () => void;
  onOpenManageRoom: () => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSendMessage: (body: string) => Promise<boolean>;
  queryClient: QueryClient;
  replyToMessageId: string | null;
  selectedConversationId: string | null;
  selectedSummary: ConversationSummary | null;
  setReplyToMessageId: (value: string | null) => void;
  showBackButton: boolean;
  uploadedAttachments: UploadedAttachment[];
};

export function ChatPanel(props: ChatPanelProps) {
  const messagesRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const previousConversationIdRef = useRef<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const replyTarget = useMemo(
    () => props.messages?.items.find((message) => message.id === props.replyToMessageId) ?? null,
    [props.messages?.items, props.replyToMessageId]
  );
  const canSend = Boolean(
    props.selectedConversationId
    && !props.isSending
    && (draftBody.trim() || props.uploadedAttachments.length > 0)
  );

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) {
      return;
    }

    const conversationChanged = previousConversationIdRef.current !== props.selectedConversationId;
    if (conversationChanged || shouldStickToBottomRef.current) {
      window.requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }

    previousConversationIdRef.current = props.selectedConversationId;
  }, [props.messages?.items.length, props.selectedConversationId]);

  useEffect(() => {
    setDraftBody("");
    setEditingBody("");
    setEditingMessageId(null);
  }, [props.selectedConversationId]);

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

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    const didSend = await props.onSendMessage(draftBody.trim());
    if (didSend) {
      setDraftBody("");
      window.requestAnimationFrame(() => composerRef.current?.focus());
    }
  };

  const loadOlderMessages = async () => {
    const conversationId = props.selectedConversationId;
    const container = messagesRef.current;
    if (!conversationId || !container || !props.messages?.nextCursor || isLoadingOlder) {
      return;
    }

    setIsLoadingOlder(true);
    const previousHeight = container.scrollHeight;
    const previousTop = container.scrollTop;

    try {
      const older = await api.messages(conversationId, props.messages.nextCursor);
      props.queryClient.setQueryData(dashboardQueryKeys.messages(conversationId), {
        items: [...older.items, ...(props.messages?.items ?? [])],
        nextCursor: older.nextCursor
      });
      window.requestAnimationFrame(() => {
        const nextHeight = container.scrollHeight;
        container.scrollTop = nextHeight - previousHeight + previousTop;
      });
    } finally {
      setIsLoadingOlder(false);
    }
  };

  return (
    <main className="chat-panel">
      <section className="chat-header">
        <div className="chat-heading">
          {props.showBackButton && (
            <button className="ghost mobile-back" onClick={props.onBackToList}>Back</button>
          )}
          <div className="chat-avatar" aria-hidden="true">
            {(props.conversationDetails?.kind === "direct"
              ? props.conversationDetails.directPeer?.username ?? props.conversationDetails.name
              : props.conversationDetails?.name ?? "C").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2>{props.conversationDetails?.kind === "direct" ? props.conversationDetails.directPeer?.username ?? props.conversationDetails.name : `# ${props.conversationDetails?.name ?? "Choose a conversation"}`}</h2>
            <p>{describeConversation(props.conversationDetails, props.selectedSummary)}</p>
          </div>
        </div>
        <div className="meta meta-stack">
          {props.conversationDetails?.kind === "direct" && props.conversationDetails.directPeer && (
            <span className={`presence-pill ${props.conversationDetails.directPeer.presence}`}>
              {props.conversationDetails.directPeer.presence}
            </span>
          )}
          {props.conversationDetails?.kind === "room" && <span>{props.conversationDetails.memberCount} members</span>}
          <button className="ghost" onClick={props.onOpenDetails} disabled={!props.selectedConversationId}>
            Details
          </button>
          {props.canManageRoom && (
            <button className="ghost" onClick={props.onOpenManageRoom}>Room settings</button>
          )}
          {props.conversationDetails?.kind === "room" && (
            <button
              className="ghost danger-text"
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
              Leave
            </button>
          )}
        </div>
      </section>

      <section
        className="messages"
        ref={messagesRef}
        onScroll={(event) => {
          const target = event.currentTarget;
          shouldStickToBottomRef.current = target.scrollHeight - target.scrollTop - target.clientHeight < 120;
        }}
      >
        {props.messages?.nextCursor && props.selectedConversationId && (
          <button className="ghost older" onClick={() => void loadOlderMessages()}>
            {isLoadingOlder ? "Loading..." : "Load older messages"}
          </button>
        )}

        {!props.selectedConversationId && (
          <div className="empty-chat-state">
            <h3>Select chat</h3>
            <p>Open thread from list, then chat takes whole focus.</p>
          </div>
        )}

        {props.selectedConversationId && !props.messages?.items.length && (
          <div className="empty-chat-state">
            <h3>No messages yet</h3>
            <p>Drop first message and this pane becomes live.</p>
          </div>
        )}

        {props.messages?.items.map((message: ChatMessage, index) => {
          const isOwn = message.author.id === props.meUserId;
          const previousMessage = props.messages?.items[index - 1];
          const isGrouped = Boolean(
            previousMessage
            && previousMessage.author.id === message.author.id
            && new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime() < 5 * 60_000
          );

          return (
            <article key={message.id} className={`message-card ${isOwn ? "own" : "peer"} ${isGrouped ? "grouped" : ""}`}>
              {!isGrouped && (
                <header>
                  <div className="message-author">
                    <div className={`message-avatar ${message.author.presence}`} aria-hidden="true">
                      {message.author.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <strong>{message.author.username}</strong>
                      <small>{message.author.presence}</small>
                    </div>
                  </div>
                  <div className="message-meta">
                    <span>{formatTimestamp(message.createdAt)}</span>
                    {message.isEdited && <em>edited</em>}
                  </div>
                </header>
              )}
              {message.replyTo && (
                <blockquote>
                  <strong>{message.replyTo.authorUsername}</strong>
                  <span>{message.replyTo.body ?? "Attachment"}</span>
                </blockquote>
              )}
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
                <>
                  {message.body && <p className="message-body">{message.body}</p>}
                  {message.attachments.length > 0 && (
                    <div className="attachment-strip">
                      {message.attachments.map((attachment: ChatMessage["attachments"][number]) => (
                        <a key={attachment.id} className="attachment-chip" href={attachment.downloadUrl} target="_blank" rel="noreferrer">
                          <span>{attachment.kind === "image" ? "Image" : "File"}</span>
                          <strong>{attachment.originalName}</strong>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="inline-actions message-actions">
                <button className="inline-action" onClick={() => props.setReplyToMessageId(message.id)}>Reply</button>
                {message.author.id === props.meUserId && (
                  <>
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
                      className="inline-action danger-text"
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
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
        onPaste={async (event) => {
          const file = event.clipboardData.files?.[0];
          if (file) {
            await handleUpload(file);
          }
        }}
      >
        {replyTarget && (
          <div className="reply-banner">
            <div>
              <strong>Replying to {replyTarget.author.username}</strong>
              <span>{replyTarget.body ?? "Attachment only message"}</span>
            </div>
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
                event.currentTarget.value = "";
              }}
            />
          </label>
          <textarea
            ref={composerRef}
            name="body"
            placeholder={props.selectedConversationId ? "Write message" : "Select chat first"}
            rows={2}
            value={draftBody}
            disabled={!props.selectedConversationId}
            onChange={(event) => setDraftBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <button type="submit" className="primary" disabled={!canSend}>
            {props.isSending ? "Sending..." : "Send"}
          </button>
        </div>
        {props.uploadedAttachments.length > 0 && (
          <div className="attachment-strip">
            {props.uploadedAttachments.map((attachment) => (
              <button key={attachment.id} type="button" className="ghost attachment-chip pending" onClick={() => props.onRemoveAttachment(attachment.id)}>
                <span>Ready</span>
                <strong>{attachment.originalName}</strong>
              </button>
            ))}
          </div>
        )}
      </form>
    </main>
  );
}

function describeConversation(
  details: ConversationDetails | undefined,
  summary: ConversationSummary | null
) {
  if (!details && !summary) {
    return "Pick thread from list.";
  }

  if (details?.description) {
    return details.description;
  }

  if (details?.kind === "direct" && details.directPeer) {
    return `${details.directPeer.presence} now`;
  }

  if (details?.kind === "room") {
    return `${details.visibility ?? "private"} room with ${details.memberCount} members`;
  }

  if (summary?.isFrozen) {
    return "Conversation frozen by block rule";
  }

  return "Thread ready.";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}
