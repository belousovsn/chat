import clsx from "clsx";
import { useMemo, useState } from "react";
import type { ConversationSummary } from "./types";

type ConversationSidebarProps = {
  conversations: ConversationSummary[] | undefined;
  onOpenSocial: () => void;
  onSelectConversation: (conversationId: string) => void;
  requestCount: number;
  selectedConversationId: string | null;
};

export function ConversationSidebar(props: ConversationSidebarProps) {
  const [chatSearch, setChatSearch] = useState("");
  const normalizedChatSearch = chatSearch.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    if (!normalizedChatSearch) {
      return props.conversations ?? [];
    }

    return (props.conversations ?? []).filter((conversation) => {
      const title = conversation.kind === "direct"
        ? conversation.directPeer?.username ?? conversation.name
        : conversation.name;

      return [title, conversation.description, conversation.visibility]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedChatSearch));
    });
  }, [normalizedChatSearch, props.conversations]);

  return (
    <aside className="oldschool-sidebar oldschool-bevel" aria-label="Chats">
      <label className="oldschool-field">
        <span>Quick filter</span>
        <input
          value={chatSearch}
          onChange={(event) => setChatSearch(event.target.value)}
          placeholder="#general or username"
        />
      </label>

      <div className="oldschool-list oldschool-inset">
        {filteredConversations.length > 0 ? filteredConversations.map((conversation) => {
          const title = conversation.kind === "direct"
            ? conversation.directPeer?.username ?? conversation.name
            : `#${conversation.name}`;
          const subtitle = conversation.description
            ?? (conversation.kind === "direct"
              ? `${conversation.directPeer?.presence ?? "offline"} now`
              : `${conversation.visibility ?? "private"} room`);

          return (
            <button
              key={conversation.id}
              type="button"
              className={clsx("oldschool-room-row", { selected: conversation.id === props.selectedConversationId })}
              onClick={() => props.onSelectConversation(conversation.id)}
            >
              <span className="oldschool-room-time">{formatRelativeTime(conversation.lastMessageAt)}</span>
              <span className="oldschool-room-name">{title}</span>
              <span className="oldschool-room-note">{subtitle}</span>
              <span className="oldschool-room-indicators">
                {conversation.unreadMentionCount > 0 && <span className="oldschool-room-badge mention">@</span>}
                {conversation.unreadCount > 0 && <span className="oldschool-room-badge">{conversation.unreadCount}</span>}
              </span>
            </button>
          );
        }) : null}

        {filteredConversations.length === 0 && (
          <div className="oldschool-empty-note">
            {normalizedChatSearch
              ? "No chats match this filter."
              : "No chats yet. Open Rooms from the top menu to find a place to chat."}
          </div>
        )}
      </div>

      <button type="button" className="oldschool-friend-request-bar oldschool-inset" onClick={props.onOpenSocial}>
        <span className="oldschool-footer-flag">FR</span>
        <strong>Friend requests</strong>
        <span className="oldschool-room-badge">{props.requestCount}</span>
      </button>

      <div className="oldschool-sidebar-footer oldschool-inset">
        <span>{filteredConversations.length} visible</span>
        <span>Recent conversations</span>
      </div>
    </aside>
  );
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "new";
  }

  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60_000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.round(hours / 24);
  return `${days}d`;
}
