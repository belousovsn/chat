import clsx from "clsx";
import { useMemo, useState } from "react";
import type { ConversationSummary, PublicRoom } from "./types";

type SidebarView = "chats" | "rooms";

type ConversationSidebarProps = {
  conversations: ConversationSummary[] | undefined;
  onJoinRoom: (roomId: string) => void;
  onOpenCreateRoom: () => void;
  onOpenSocial: () => void;
  onSelectConversation: (conversationId: string) => void;
  publicRooms: PublicRoom[] | undefined;
  publicSearch: string;
  requestCount: number;
  selectedConversationId: string | null;
  setPublicSearch: (value: string) => void;
};

export function ConversationSidebar(props: ConversationSidebarProps) {
  const [activeView, setActiveView] = useState<SidebarView>("chats");
  const [chatSearch, setChatSearch] = useState("");
  const normalizedChatSearch = chatSearch.trim().toLowerCase();
  const normalizedPublicSearch = props.publicSearch.trim().toLowerCase();

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

  const filteredPublicRooms = useMemo(() => {
    if (!normalizedPublicSearch) {
      return props.publicRooms ?? [];
    }

    return (props.publicRooms ?? []).filter((room) => (
      room.name.toLowerCase().includes(normalizedPublicSearch)
      || String(room.description ?? "").toLowerCase().includes(normalizedPublicSearch)
    ));
  }, [normalizedPublicSearch, props.publicRooms]);

  const activeCount = activeView === "chats" ? filteredConversations.length : filteredPublicRooms.length;

  return (
    <aside className="oldschool-sidebar oldschool-bevel">
      <div className="oldschool-pane-title">Chats and channels</div>

      <div className="oldschool-tabstrip" role="tablist" aria-label="Sidebar areas">
        <button
          type="button"
          className={clsx("oldschool-mini-tab", { active: activeView === "chats" })}
          onClick={() => setActiveView("chats")}
        >
          Chats
        </button>
        <button
          type="button"
          className={clsx("oldschool-mini-tab", { active: activeView === "rooms" })}
          onClick={() => setActiveView("rooms")}
        >
          Rooms
        </button>
        <button type="button" className="oldschool-mini-tab" onClick={props.onOpenCreateRoom}>+</button>
      </div>

      <label className="oldschool-field">
        <span>Quick filter</span>
        <input
          value={activeView === "chats" ? chatSearch : props.publicSearch}
          onChange={(event) => {
            if (activeView === "chats") {
              setChatSearch(event.target.value);
              return;
            }

            props.setPublicSearch(event.target.value);
          }}
          placeholder={activeView === "chats" ? "#programming" : "public rooms"}
        />
      </label>

      <div className="oldschool-list oldschool-inset">
        {activeView === "chats" && filteredConversations.length > 0 ? filteredConversations.map((conversation) => {
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

        {activeView === "rooms" && filteredPublicRooms.length > 0 ? filteredPublicRooms.map((room) => (
          <div key={String(room.id)} className="oldschool-room-row oldschool-public-row">
            <span className="oldschool-room-time">{room.member_count}</span>
            <span className="oldschool-room-name">#{String(room.name)}</span>
            <span className="oldschool-room-note">{String(room.description ?? "Open room")}</span>
            <button
              type="button"
              className="oldschool-public-action"
              onClick={() => props.onJoinRoom(String(room.id))}
              disabled={Boolean(room.is_member)}
            >
              {room.is_member ? "Joined" : "Join"}
            </button>
          </div>
        )) : null}

        {activeView === "chats" && filteredConversations.length === 0 && (
          <div className="oldschool-empty-note">No chats match this filter.</div>
        )}
        {activeView === "rooms" && filteredPublicRooms.length === 0 && (
          <div className="oldschool-empty-note">No rooms found.</div>
        )}
      </div>

      <button type="button" className="oldschool-friend-request-bar oldschool-inset" onClick={props.onOpenSocial}>
        <span className="oldschool-footer-flag">FR</span>
        <strong>Friend requests</strong>
        <span className="oldschool-room-badge">{props.requestCount}</span>
      </button>

      <div className="oldschool-sidebar-footer oldschool-inset">
        <span>{activeCount} visible</span>
        <span>{activeView === "chats" ? "Recent conversations" : "Public room directory"}</span>
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
