import clsx from "clsx";
import type { ContactFriend, ConversationSummary, PublicRoom } from "./types";

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
  return (
    <aside className="left-panel">
      <section className="panel-card">
        <div className="panel-heading">
          <h3>Chats</h3>
          <span>{props.conversations?.length ?? 0}</span>
        </div>
        <div className="conversation-list">
          {props.conversations?.map((conversation) => (
            <button
              key={conversation.id}
              className={clsx("conversation-item", { active: conversation.id === props.selectedConversationId })}
              onClick={() => props.onSelectConversation(conversation.id)}
            >
              <div>
                <strong>{conversation.kind === "direct" ? conversation.directPeer?.username ?? conversation.name : `# ${conversation.name}`}</strong>
                <small>{conversation.description ?? (conversation.kind === "direct" ? "Direct conversation" : conversation.visibility)}</small>
              </div>
              <span className="badge">{conversation.unreadCount}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <h3>Public rooms</h3>
          <input value={props.publicSearch} onChange={(event) => props.setPublicSearch(event.target.value)} placeholder="Search" />
        </div>
        <div className="public-list">
          {props.publicRooms?.map((room) => (
            <div key={String(room.id)} className="mini-row">
              <div>
                <strong>{String(room.name)}</strong>
                <small>{String(room.description ?? "")}</small>
              </div>
              <button
                className="ghost"
                onClick={() => props.onJoinRoom(String(room.id))}
                disabled={Boolean(room.is_member)}
              >
                {room.is_member ? "Joined" : "Join"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <h3>Contacts</h3>
          <button className="ghost" onClick={props.onRefreshContacts}>Refresh</button>
        </div>
        <div className="public-list">
          {props.contacts?.map((friend) => (
            <div key={friend.id} className="mini-row">
              <div>
                <strong>{friend.username}</strong>
                <small>{friend.presence}</small>
              </div>
              <div className="inline-actions">
                <button className="ghost" onClick={() => props.onCreateDirect(friend.id)}>Chat</button>
                <button className="ghost" onClick={() => props.onRemoveFriend(friend.id)}>Remove</button>
                <button className="danger" onClick={() => props.onBlockUser(friend.id)}>Block</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
