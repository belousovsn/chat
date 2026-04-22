import { useEffect, useMemo, useRef, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@chat/shared";
import { api } from "../../lib/api";
import type { UploadedAttachment } from "../../features/chat/store";
import type { ConversationDetails, ConversationMember, ConversationSummary } from "./types";
import { dashboardQueryKeys } from "./queryKeys";

type UserMenuTarget = {
  role?: ConversationMember["role"] | null;
  userId: string;
  username: string;
};
type ParticipantLookup = Map<string, {
  role?: ConversationMember["role"] | null;
  userId: string;
  username: string;
}>;

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
  onOpenUserMenu: (target: UserMenuTarget, element: HTMLElement) => void;
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
  const [composerError, setComposerError] = useState("");
  const [viewerAttachment, setViewerAttachment] = useState<ChatMessage["attachments"][number] | null>(null);
  const replyTarget = useMemo(
    () => props.messages?.items.find((message) => message.id === props.replyToMessageId) ?? null,
    [props.messages?.items, props.replyToMessageId]
  );
  const canSend = Boolean(
    props.selectedConversationId
    && !props.isSending
    && (draftBody.trim() || props.uploadedAttachments.length > 0)
  );
  const roomTitle = props.conversationDetails?.kind === "direct"
    ? props.conversationDetails.directPeer?.username ?? props.conversationDetails.name
    : props.conversationDetails?.name ?? "Choose a conversation";
  const participants = useMemo(() => {
    if (props.conversationDetails?.kind === "room") {
      return props.conversationDetails.members;
    }

    if (props.conversationDetails?.kind === "direct" && props.conversationDetails.directPeer) {
      return [{
        role: null,
        userId: props.conversationDetails.directPeer.id,
        presence: props.conversationDetails.directPeer.presence,
        username: props.conversationDetails.directPeer.username
      }];
    }

    return [];
  }, [props.conversationDetails]);
  const participantsByUserId = useMemo(
    () => new Map(participants.map((participant) => [participant.userId, participant])),
    [participants]
  );
  const participantsByUsername = useMemo(
    () => new Map(participants.map((participant) => [participant.username, participant])),
    [participants]
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
    setComposerError("");
    setEditingBody("");
    setEditingMessageId(null);
    setViewerAttachment(null);
  }, [props.selectedConversationId]);

  const handleUpload = async (file: File) => {
    if (!props.selectedConversationId) {
      return;
    }

    try {
      const attachment = await api.uploadAttachment(props.selectedConversationId, file);
      props.addUploadedAttachment({
        id: attachment.id,
        originalName: attachment.originalName,
        downloadUrl: attachment.downloadUrl
      });
      setComposerError("");
    } catch (error) {
      setComposerError((error as Error).message);
    }
  };

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    const didSend = await props.onSendMessage(draftBody.trim());
    if (didSend) {
      setComposerError("");
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
    <main className="oldschool-chat oldschool-bevel">
      <section className="oldschool-chat-header oldschool-bevel">
        <div>
          <div className="oldschool-chat-title-row">
            {props.showBackButton && (
              <button type="button" className="oldschool-button mobile-back" onClick={props.onBackToList}>Back</button>
            )}
            <strong>{props.conversationDetails?.kind === "room" ? `#${roomTitle}` : roomTitle}</strong>
          </div>
          <span>{describeConversation(props.conversationDetails, props.selectedSummary)}</span>
        </div>
        {props.conversationDetails?.kind === "room" && (
          <div className="oldschool-chat-actions">
            <button
              type="button"
              className="oldschool-button oldschool-danger-button"
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
          </div>
        )}
      </section>

      <section
        className="oldschool-message-log oldschool-inset"
        ref={messagesRef}
        onScroll={(event) => {
          const target = event.currentTarget;
          shouldStickToBottomRef.current = target.scrollHeight - target.scrollTop - target.clientHeight < 120;
        }}
      >
        {props.messages?.nextCursor && props.selectedConversationId && (
          <button type="button" className="oldschool-button older" onClick={() => void loadOlderMessages()}>
            {isLoadingOlder ? "Loading..." : "Load older messages"}
          </button>
        )}

        {!props.selectedConversationId && (
          <div className="oldschool-empty-chat">
            <strong>Select chat</strong>
            <span>Open thread from left pane, then log appears here.</span>
          </div>
        )}

        {props.selectedConversationId && !props.messages?.items.length && (
          <div className="oldschool-empty-chat">
            <strong>No messages yet</strong>
            <span>Drop first line and this room becomes live.</span>
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
          const tone = isOwn ? "self" : message.author.username === "server" ? "system" : "peer";
          const authorParticipant = participantsByUserId.get(message.author.id);
          const replyAuthorParticipant = message.replyTo
            ? participantsByUsername.get(message.replyTo.authorUsername)
            : undefined;

          return (
            <article key={message.id} className={`oldschool-log-row ${tone} ${isGrouped ? "grouped" : ""}`}>
              <span className="oldschool-log-time">[{formatLogTime(message.createdAt)}]</span>
              <div className="oldschool-log-entry">
                <div className="oldschool-log-header">
                  {message.author.username !== "server" && message.author.id !== props.meUserId ? (
                    <button
                      type="button"
                      className="oldschool-log-author oldschool-name-button"
                      onClick={(event) => props.onOpenUserMenu({
                        role: authorParticipant?.role ?? null,
                        userId: message.author.id,
                        username: message.author.username
                      }, event.currentTarget)}
                    >
                      {authorPrefix(message.author.username)}
                    </button>
                  ) : (
                    <span className="oldschool-log-author">{authorPrefix(message.author.username)}</span>
                  )}
                  <div className="oldschool-message-actions" aria-label="Message actions">
                    <button
                      type="button"
                      className="oldschool-icon-button"
                      title="Reply"
                      aria-label="Reply"
                      onClick={() => props.setReplyToMessageId(message.id)}
                    >
                      {"\u21A9"}
                    </button>
                    {message.author.id === props.meUserId && (
                      <button
                        type="button"
                        className="oldschool-icon-button"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => {
                          setEditingMessageId(message.id);
                          setEditingBody(message.body ?? "");
                        }}
                      >
                        {"\u270E"}
                      </button>
                    )}
                    {(message.author.id === props.meUserId || props.canManageRoom) && (
                      <button
                        type="button"
                        className="oldschool-icon-button danger"
                        title="Delete"
                        aria-label="Delete"
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
                        {"\u00D7"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="oldschool-log-content">
                  {message.replyTo && (
                    <div className="oldschool-inline-quote">
                      {replyAuthorParticipant ? (
                        <button
                          type="button"
                          className="oldschool-name-button"
                          onClick={(event) => props.onOpenUserMenu({
                            role: replyAuthorParticipant.role ?? null,
                            userId: replyAuthorParticipant.userId,
                            username: replyAuthorParticipant.username
                          }, event.currentTarget)}
                        >
                          {message.replyTo.authorUsername}
                        </button>
                      ) : (
                        <strong>{message.replyTo.authorUsername}</strong>
                      )}
                      <span>{message.replyTo.body ?? "Attachment"}</span>
                    </div>
                  )}
                  {editingMessageId === message.id ? (
                    <form
                      className="oldschool-inline-editor"
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
                      <div className="oldschool-log-actions">
                        <button type="submit" className="oldschool-button active" disabled={!editingBody.trim()}>Save</button>
                        <button
                          type="button"
                          className="oldschool-button"
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
                      {message.body && (
                        <span className="oldschool-log-text">
                          {renderMessageBody(message, participantsByUserId, props.onOpenUserMenu)}
                        </span>
                      )}
                      {message.attachments.length > 0 && (
                        <div className="oldschool-attachment-stack">
                          {message.attachments.map((attachment: ChatMessage["attachments"][number]) => (
                            attachment.kind === "image" ? (
                              <button
                                key={attachment.id}
                                type="button"
                                className="oldschool-inline-image-link"
                                onClick={() => setViewerAttachment(attachment)}
                              >
                                <img className="oldschool-inline-image" src={attachment.downloadUrl} alt={attachment.originalName} />
                              </button>
                            ) : (
                              <a
                                key={attachment.id}
                                className="oldschool-file-chip oldschool-bevel"
                                href={attachment.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <strong>{attachment.originalName}</strong>
                                <span>Open</span>
                              </a>
                            )
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="oldschool-log-foot">
                    {message.isEdited && <span className="oldschool-log-flag">edited</span>}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <form
        className="oldschool-composer oldschool-bevel"
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
          <div className="oldschool-reply-banner oldschool-inset">
            <div>
              <strong>Replying to {replyTarget.author.username}</strong>
              <span>{replyTarget.body ?? "Attachment only message"}</span>
            </div>
            <button type="button" className="oldschool-button" onClick={() => props.setReplyToMessageId(null)}>X</button>
          </div>
        )}
        <div className="oldschool-composer-row">
          <span className="oldschool-composer-label">Message</span>
          <textarea
            ref={composerRef}
            className="oldschool-grow live-message-input"
            name="body"
            placeholder=""
            rows={3}
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
          <button type="submit" className="oldschool-button active" disabled={!canSend}>
            {props.isSending ? "Sending..." : "Send"}
          </button>
        </div>
        <div className="oldschool-composer-row small">
          <label className="oldschool-button oldschool-file-picker">
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
          {props.replyToMessageId ? (
            <button type="button" className="oldschool-button" onClick={() => props.setReplyToMessageId(null)}>Cancel reply</button>
          ) : (
            <span className="oldschool-status-text">Use Reply or @username to ping exact person.</span>
          )}
          <span className="oldschool-status-text">
            {participants.length > 0 ? `${participants.length} visible in member list.` : "No active participant list."}
          </span>
        </div>
        {composerError && <div className="oldschool-inline-error">{composerError}</div>}
        {props.uploadedAttachments.length > 0 && (
          <div className="oldschool-uploaded-list">
            {props.uploadedAttachments.map((attachment) => (
              <button
                key={attachment.id}
                type="button"
                className="oldschool-file-chip oldschool-bevel"
                onClick={() => props.onRemoveAttachment(attachment.id)}
              >
                <strong>{attachment.originalName}</strong>
                <span>Remove</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {viewerAttachment?.kind === "image" && (
        <div className="oldschool-overlay oldschool-media-viewer" onClick={() => setViewerAttachment(null)}>
          <div className="oldschool-media-frame oldschool-bevel">
            <img src={viewerAttachment.downloadUrl} alt={viewerAttachment.originalName} className="oldschool-media-image" />
            <span>{viewerAttachment.originalName}</span>
          </div>
        </div>
      )}
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

function formatLogTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit"
  });
}

function authorPrefix(username: string) {
  return `<${username}>`;
}

function renderMessageBody(
  message: ChatMessage,
  participantsByUserId: ParticipantLookup,
  onOpenUserMenu: (target: UserMenuTarget, element: HTMLElement) => void
) {
  const body = message.body ?? "";
  if (!body) {
    return null;
  }

  if (!message.mentions.length) {
    return body;
  }

  const parts = [];
  let cursor = 0;

  for (const mention of [...message.mentions].sort((left, right) => left.start - right.start)) {
    if (mention.start < cursor || mention.end > body.length || mention.start >= mention.end) {
      continue;
    }

    if (mention.start > cursor) {
      parts.push(body.slice(cursor, mention.start));
    }

    const target = participantsByUserId.get(mention.userId) ?? {
      role: null,
      userId: mention.userId,
      username: mention.username
    };
    parts.push(
      <button
        key={`${message.id}-${mention.userId}-${mention.start}`}
        type="button"
        className="oldschool-mention-button"
        onClick={(event) => onOpenUserMenu(target, event.currentTarget)}
      >
        {body.slice(mention.start, mention.end)}
      </button>
    );
    cursor = mention.end;
  }

  if (cursor < body.length) {
    parts.push(body.slice(cursor));
  }

  return parts;
}
