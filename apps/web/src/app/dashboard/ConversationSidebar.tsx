import clsx from "clsx";
import { useMemo, useState } from "react";
import type { ContactFriend, ConversationSummary, PublicRoom } from "./types";

type SidebarView = "chats" | "rooms" | "people";

type ConversationSidebarProps = {
  contacts: ContactFriend[] | undefined;
  conversations: ConversationSummary[] | undefined;
  onBlockUser: (userId: string) => void;
  onCreateDirect: (userId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onRemoveFriend: (userId: string) => void;
  onRefreshContacts: () => void;
  onSelectConversation: (conversationId: string) => void;
  publicRooms: PublicRoom[] | undefined;
  publicSearch: string;
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

  const filteredContacts = useMemo(() => {
    if (!normalizedChatSearch) {
      return props.contacts ?? [];
    }

    return (props.contacts ?? []).filter((friend) => (
      friend.username.toLowerCase().includes(normalizedChatSearch)
      || friend.presence.toLowerCase().includes(normalizedChatSearch)
    ));
  }, [normalizedChatSearch, props.contacts]);

  const filteredPublicRooms = useMemo(() => {
    if (!normalizedPublicSearch) {
      return props.publicRooms ?? [];
    }

    return (props.publicRooms ?? []).filter((room) => (
      room.name.toLowerCase().includes(normalizedPublicSearch)
      || String(room.description ?? "").toLowerCase().includes(normalizedPublicSearch)
    ));
  }, [normalizedPublicSearch, props.publicRooms]);

  const activeCount = activeView === "chats"
    ? filteredConversations.length
    : activeView === "rooms"
      ? filteredPublicRooms.length
      : filteredContacts.length;

  return (
    <aside className="left-panel">
      <section className="panel-card sidebar-shell">
        <div className="panel-heading sidebar-heading">
          <div>
            <p className="eyebrow">Navigate</p>
            <h3>{activeView === "chats" ? "Chats" : activeView === "rooms" ? "Rooms" : "People"}</h3>
          </div>
          <span className="count-pill">{activeCount}</span>
        </div>

        <div className="sidebar-tabs" role="tablist" aria-label="Sidebar areas">
          <button
            className={clsx("sidebar-tab", { active: activeView === "chats" })}
            onClick={() => setActiveView("chats")}
          >
            Chats
          </button>
          <button
            className={clsx("sidebar-tab", { active: activeView === "rooms" })}
            onClick={() => setActiveView("rooms")}
          >
            Rooms
          </button>
          <button
            className={clsx("sidebar-tab", { active: activeView === "people" })}
            onClick={() => setActiveView("people")}
          >
            People
          </button>
        </div>

        {activeView === "chats" && (
          <>
            <label className="field-label">
              Search chats
              <input
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder="People, rooms, notes"
              />
            </label>
            <div className="conversation-list">
              {filteredConversations.length > 0 ? filteredConversations.map((conversation) => {
                const title = conversation.kind === "direct"
                  ? conversation.directPeer?.username ?? conversation.name
                  : conversation.name;
                const subtitle = conversation.kind === "direct"
                  ? `${conversation.directPeer?.presence ?? "offline"} now`
                  : `${conversation.visibility ?? "private"} room`;

                return (
                  <button
                    key={conversation.id}
                    className={clsx("conversation-item", { active: conversation.id === props.selectedConversationId })}
                    onClick={() => props.onSelectConversation(conversation.id)}
                  >
                    <div className="conversation-avatar" aria-hidden="true">
                      {title.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="conversation-copy">
                      <div className="conversation-topline">
                        <strong>{conversation.kind === "direct" ? title : `# ${title}`}</strong>
                        <small>{formatRelativeTime(conversation.lastMessageAt)}</small>
                      </div>
                      <small className="conversation-preview">
                        {conversation.description ?? subtitle}
                      </small>
                      <div className="conversation-meta">
                        <span className={clsx("presence-pill", conversation.directPeer?.presence ?? conversation.visibility ?? "offline")}>
                          {subtitle}
                        </span>
                        {conversation.isFrozen && <span className="status-chip">Frozen</span>}
                        {conversation.kind === "room" && <span>{conversation.memberCount} members</span>}
                      </div>
                    </div>
                    {conversation.unreadCount > 0 && <span className="badge unread-badge">{conversation.unreadCount}</span>}
                  </button>
                );
              }) : (
                <div className="empty-panel">No chats match this search.</div>
              )}
            </div>
          </>
        )}

        {activeView === "rooms" && (
          <>
            <label className="field-label">
              Search rooms
              <input
                value={props.publicSearch}
                onChange={(event) => props.setPublicSearch(event.target.value)}
                placeholder="Design, product, ops"
              />
            </label>
            <div className="public-list">
              {filteredPublicRooms.length > 0 ? filteredPublicRooms.map((room) => (
                <div key={String(room.id)} className="mini-row">
                  <div className="mini-copy">
                    <strong>{String(room.name)}</strong>
                    <small>{String(room.description ?? "Open room")}</small>
                    <small>{room.member_count} members</small>
                  </div>
                  <button
                    className="ghost"
                    onClick={() => props.onJoinRoom(String(room.id))}
                    disabled={Boolean(room.is_member)}
                  >
                    {room.is_member ? "Joined" : "Join"}
                  </button>
                </div>
              )) : (
                <div className="empty-panel">No public rooms found.</div>
              )}
            </div>
          </>
        )}

        {activeView === "people" && (
          <>
            <div className="sidebar-inline-actions">
              <label className="field-label">
                Search people
                <input
                  value={chatSearch}
                  onChange={(event) => setChatSearch(event.target.value)}
                  placeholder="Name or presence"
                />
              </label>
              <button className="ghost" onClick={props.onRefreshContacts}>Refresh</button>
            </div>
            <div className="public-list">
              {filteredContacts.length > 0 ? filteredContacts.map((friend) => (
                <div key={friend.id} className="mini-row">
                  <div className="mini-copy">
                    <strong>{friend.username}</strong>
                    <small className={clsx("presence-pill", friend.presence)}>{friend.presence}</small>
                  </div>
                  <div className="inline-actions">
                    <button className="ghost" onClick={() => props.onCreateDirect(friend.id)}>Chat</button>
                    <button className="ghost" onClick={() => props.onRemoveFriend(friend.id)}>Remove</button>
                    <button className="danger" onClick={() => props.onBlockUser(friend.id)}>Block</button>
                  </div>
                </div>
              )) : (
                <div className="empty-panel">No contacts yet. Open People drawer to invite someone.</div>
              )}
            </div>
          </>
        )}
      </section>
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
