import { useMemo, useState } from "react";
import clsx from "clsx";
import type { ContactFriend, ContactRequest, ConversationMember, SessionEntry } from "./types";

export type UtilityPanelMode = "details" | "social" | "settings";
type SocialTab = "requests" | "friends" | "add";

type InfoSidebarProps = {
  conversationTitle: string;
  friends: ContactFriend[] | undefined;
  meUserId: string | undefined;
  members: ConversationMember[] | undefined;
  mode: UtilityPanelMode;
  onAcceptFriendRequest: (requestId: string) => void;
  onBlockUser: (userId: string) => void;
  onChangeMode: (mode: UtilityPanelMode) => void;
  onChangePassword: (input: { currentPassword: string; newPassword: string }, onSuccess: () => void) => void;
  onClose: () => void;
  onCreateDirect: (userId: string) => void;
  onDeleteAccount: () => void;
  onRemoveFriend: (userId: string) => void;
  onRefreshContacts: () => void;
  onRefreshSessions: () => void;
  onRevokeSession: (sessionId: string) => void;
  onSendFriendRequest: (input: { message: string; username: string }, onSuccess: () => void, onError: (error: Error) => void) => void;
  requests: ContactRequest[] | undefined;
  sessions: SessionEntry[] | undefined;
};

export function InfoSidebar(props: InfoSidebarProps) {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [socialTab, setSocialTab] = useState<SocialTab>("requests");
  const filteredFriends = useMemo(() => {
    const search = friendSearch.trim().toLowerCase();
    if (!search) {
      return props.friends ?? [];
    }

    return (props.friends ?? []).filter((friend) => (
      friend.username.toLowerCase().includes(search)
      || friend.presence.toLowerCase().includes(search)
    ));
  }, [friendSearch, props.friends]);
  const socialWindowTitle = socialTab === "requests"
    ? "Friends Requests Window"
    : socialTab === "friends"
      ? "Friends List Window"
      : "Add Friend Window";

  if (props.mode === "social") {
    return (
      <aside className="oldschool-overlay live-floating-window social-window">
        <section className="oldschool-dialog oldschool-bevel">
          <div className="oldschool-titlebar">
            <span>{socialWindowTitle}</span>
            <button type="button" className="oldschool-titlebar-close" onClick={props.onClose}>X</button>
          </div>

          <div className="oldschool-dialog-tabs">
            <button
              type="button"
              className={clsx("oldschool-mini-tab", { active: socialTab === "requests" })}
              onClick={() => setSocialTab("requests")}
            >
              Requests
            </button>
            <button
              type="button"
              className={clsx("oldschool-mini-tab", { active: socialTab === "friends" })}
              onClick={() => setSocialTab("friends")}
            >
              Friends
            </button>
            <button
              type="button"
              className={clsx("oldschool-mini-tab", { active: socialTab === "add" })}
              onClick={() => setSocialTab("add")}
            >
              Add friend
            </button>
          </div>

          <div className="oldschool-dialog-body">
            {socialTab === "requests" && (
              <section className="oldschool-group oldschool-bevel">
                <div className="oldschool-inline-form">
                  <strong>Pending requests</strong>
                  <button type="button" className="oldschool-button" onClick={props.onRefreshContacts}>Refresh</button>
                </div>
                <div className="oldschool-list oldschool-inset compact">
                  {props.requests?.length ? props.requests.map((request) => (
                    <div key={request.id} className="oldschool-social-row">
                      <div>
                        <strong>{request.requester_username}</strong>
                        <span>{request.message || "Wants to add you."}</span>
                      </div>
                      <div className="oldschool-inline-form">
                        {request.receiver_id === props.meUserId && (
                          <button type="button" className="oldschool-button active" onClick={() => props.onAcceptFriendRequest(request.id)}>
                            Accept
                          </button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="oldschool-empty-note">No pending requests.</div>
                  )}
                </div>
              </section>
            )}

            {socialTab === "friends" && (
              <section className="oldschool-group oldschool-bevel">
                <div className="oldschool-inline-form">
                  <input
                    value={friendSearch}
                    onChange={(event) => setFriendSearch(event.target.value)}
                    placeholder="Name or presence"
                  />
                  <button type="button" className="oldschool-button" onClick={props.onRefreshContacts}>Refresh</button>
                </div>
                <div className="oldschool-list oldschool-inset compact">
                  {filteredFriends.length ? filteredFriends.map((friend) => (
                    <div key={friend.id} className="oldschool-social-row">
                      <div>
                        <strong>{friend.username}</strong>
                        <span>{friend.presence}</span>
                      </div>
                      <div className="oldschool-inline-form">
                        <button type="button" className="oldschool-button" onClick={() => props.onCreateDirect(friend.id)}>Chat</button>
                        <button type="button" className="oldschool-button" onClick={() => props.onRemoveFriend(friend.id)}>Remove</button>
                        <button type="button" className="oldschool-button oldschool-danger-button" onClick={() => props.onBlockUser(friend.id)}>Block</button>
                      </div>
                    </div>
                  )) : (
                    <div className="oldschool-empty-note">No friends match this search.</div>
                  )}
                </div>
              </section>
            )}

            {socialTab === "add" && (
              <section className="oldschool-group oldschool-bevel">
                <form
                  className="stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    props.onSendFriendRequest({
                      username: String(form.get("username")),
                      message: String(form.get("message") || "")
                    }, () => {
                      event.currentTarget.reset();
                    }, () => undefined);
                  }}
                >
                  <label className="oldschool-field">
                    <span>Invite by username</span>
                    <input name="username" required />
                  </label>
                  <label className="oldschool-field">
                    <span>Optional note</span>
                    <input name="message" />
                  </label>
                  <button type="submit" className="oldschool-button active">Send request</button>
                </form>
              </section>
            )}
          </div>
        </section>
      </aside>
    );
  }

  if (props.mode === "settings") {
    return (
      <aside className="oldschool-overlay live-floating-window settings-window">
        <section className="oldschool-dialog oldschool-bevel">
          <div className="oldschool-titlebar">
            <span>Settings Window</span>
            <button type="button" className="oldschool-titlebar-close" onClick={props.onClose}>X</button>
          </div>

          <div className="oldschool-dialog-body">
            <section className="oldschool-group oldschool-bevel">
              <div className="oldschool-inline-form">
                <strong>Sessions</strong>
                <button type="button" className="oldschool-button" onClick={props.onRefreshSessions}>Refresh</button>
              </div>
              <div className="oldschool-list oldschool-inset compact">
                {props.sessions?.map((session) => (
                  <div className="oldschool-session-row" key={session.id}>
                    <div>
                      <strong>{session.userAgent}</strong>
                      <span>{session.ipAddress}</span>
                    </div>
                    {!session.isCurrent ? (
                      <button type="button" className="oldschool-button" onClick={() => props.onRevokeSession(session.id)}>Revoke</button>
                    ) : (
                      <span className="oldschool-log-flag">Current</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="oldschool-group oldschool-bevel">
              <div className="oldschool-group-title">Password and recovery</div>
              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  props.onChangePassword({
                    currentPassword: String(form.get("currentPassword")),
                    newPassword: String(form.get("newPassword"))
                  }, () => {
                    event.currentTarget.reset();
                  });
                }}
              >
                <label className="oldschool-field">
                  <span>Current password</span>
                  <input name="currentPassword" type="password" required />
                </label>
                <label className="oldschool-field">
                  <span>New password</span>
                  <input name="newPassword" type="password" minLength={8} required />
                </label>
                <button type="submit" className="oldschool-button active">Change password</button>
              </form>
            </section>

            <section className="oldschool-group oldschool-bevel oldschool-danger-panel">
              <div className="oldschool-group-title">Danger zone</div>
              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (deleteConfirm !== "DELETE") {
                    return;
                  }
                  props.onDeleteAccount();
                }}
              >
                <label className="oldschool-field">
                  <span>Type DELETE to remove account</span>
                  <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
                </label>
                <div className="oldschool-inline-form">
                  <button type="submit" className="oldschool-button oldschool-danger-button" disabled={deleteConfirm !== "DELETE"}>Delete account</button>
                  <button type="button" className="oldschool-button" onClick={props.onClose}>Close</button>
                </div>
              </form>
            </section>
          </div>
        </section>
      </aside>
    );
  }

  return (
    <aside className="oldschool-overlay live-floating-window details-window">
      <section className="oldschool-dialog oldschool-bevel">
        <div className="oldschool-titlebar">
          <span>{props.conversationTitle}</span>
          <button type="button" className="oldschool-titlebar-close" onClick={props.onClose}>X</button>
        </div>

        <div className="oldschool-dialog-body">
          <section className="oldschool-group oldschool-bevel">
            <div className="oldschool-group-title">Members</div>
            <div className="oldschool-list oldschool-inset compact">
              {props.members?.length ? props.members.map((member) => (
                <div key={member.userId} className={`oldschool-member-row ${member.presence}`}>
                  <span className="oldschool-member-role">{member.role === "owner" ? "~" : member.role === "admin" ? "@" : "+"}</span>
                  <span>{member.username}</span>
                </div>
              )) : (
                <div className="oldschool-empty-note">Open room or direct chat to inspect people here.</div>
              )}
            </div>
            <div className="oldschool-inline-form">
              <button type="button" className="oldschool-button" onClick={() => props.onChangeMode("social")}>Friends</button>
              <button type="button" className="oldschool-button" onClick={() => props.onChangeMode("settings")}>Settings</button>
            </div>
          </section>
        </div>
      </section>
    </aside>
  );
}
