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
      <div className="oldschool-sidebar-top">
        <input
          aria-label="Quick filter"
          value={chatSearch}
          onChange={(event) => setChatSearch(event.target.value)}
          placeholder="Quick filter"
        />
        <button
          type="button"
          className="oldschool-icon-button oldschool-social-launch"
          onClick={props.onOpenSocial}
          title="Friend requests"
          aria-label={props.requestCount > 0
            ? `Friend requests (${props.requestCount})`
            : "Friend requests"}
        >
          <span aria-hidden="true">{"\uD83D\uDC64"}</span>
          {props.requestCount > 0 && <span className="oldschool-room-badge oldschool-social-badge">{props.requestCount}</span>}
        </button>
      </div>

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
