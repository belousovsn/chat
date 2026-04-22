import { useMemo, useState } from "react";
import clsx from "clsx";
import type {
  ContactBlocked,
  ContactFriend,
  ContactRequest,
  ConversationMember,
  SessionEntry,
  XmppStatus
} from "./types";

export type UtilityPanelMode = "details" | "social" | "settings" | "jabber";
type SocialTab = "requests" | "friends" | "add";

type InfoSidebarProps = {
  blocked: ContactBlocked[] | undefined;
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
  onCreateDirect: (userId: string, username: string) => Promise<void> | void;
  onDeleteAccount: () => void;
  onRefreshContacts: () => void;
  onRefreshSessions: () => void;
  onRefreshXmpp: () => void;
  onRemoveFriend: (userId: string) => void;
  onRevokeSession: (sessionId: string) => void;
  onSendFriendRequest: (input: { message: string; username: string }, onSuccess: () => void, onError: (error: Error) => void) => void;
  onUnblockUser: (userId: string) => void;
  requests: ContactRequest[] | undefined;
  sessions: SessionEntry[] | undefined;
  xmppStatus: XmppStatus | undefined;
};

export function InfoSidebar(props: InfoSidebarProps) {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [socialError, setSocialError] = useState("");
  const [socialTab, setSocialTab] = useState<SocialTab>("requests");

  const filteredContacts = useMemo(() => {
    const search = friendSearch.trim().toLowerCase();
    const merged = new Map<string, {
      blockedAt: string | null;
      id: string;
      isBlocked: boolean;
      isFriend: boolean;
      presence: string;
      username: string;
    }>();

    for (const friend of props.friends ?? []) {
      merged.set(friend.id, {
        blockedAt: null,
        id: friend.id,
        isBlocked: false,
        isFriend: true,
        presence: friend.presence,
        username: friend.username
      });
    }

    for (const blocked of props.blocked ?? []) {
      const existing = merged.get(blocked.id);
      merged.set(blocked.id, {
        blockedAt: blocked.blockedAt,
        id: blocked.id,
        isBlocked: true,
        isFriend: existing?.isFriend ?? false,
        presence: blocked.presence,
        username: blocked.username
      });
    }

    const items = [...merged.values()].sort((left, right) => left.username.localeCompare(right.username));
    if (!search) {
      return items;
    }

    return items.filter((contact) => (
      contact.username.toLowerCase().includes(search)
      || contact.presence.toLowerCase().includes(search)
      || (contact.isBlocked && "blocked".includes(search))
    ));
  }, [friendSearch, props.blocked, props.friends]);

  const socialWindowTitle = socialTab === "requests"
    ? "Friends Requests Window"
    : socialTab === "friends"
      ? "Contacts Window"
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
              onClick={() => {
                setSocialError("");
                setSocialTab("requests");
              }}
            >
              Requests
            </button>
            <button
              type="button"
              className={clsx("oldschool-mini-tab", { active: socialTab === "friends" })}
              onClick={() => {
                setSocialError("");
                setSocialTab("friends");
              }}
            >
              Friends
            </button>
            <button
              type="button"
              className={clsx("oldschool-mini-tab", { active: socialTab === "add" })}
              onClick={() => {
                setSocialError("");
                setSocialTab("add");
              }}
            >
              Add friend
            </button>
          </div>

          <div className="oldschool-dialog-body">
            {socialError && <div className="oldschool-inline-error">{socialError}</div>}

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
                  {filteredContacts.length ? filteredContacts.map((contact) => (
                    <div key={contact.id} className="oldschool-social-row">
                      <div>
                        <strong>{contact.username}</strong>
                        <span>{contact.isBlocked ? `${contact.presence} · blocked` : contact.presence}</span>
                      </div>
                      <div className="oldschool-inline-form">
                        {contact.isBlocked ? (
                          <button type="button" className="oldschool-button" onClick={() => props.onUnblockUser(contact.id)}>Unblock</button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="oldschool-button"
                              onClick={() => {
                                setSocialError("");
                                void props.onCreateDirect(contact.id, contact.username);
                              }}
                            >
                              Chat
                            </button>
                            <button type="button" className="oldschool-button" onClick={() => props.onRemoveFriend(contact.id)}>Remove</button>
                            <button type="button" className="oldschool-button oldschool-danger-button" onClick={() => props.onBlockUser(contact.id)}>Block</button>
                          </>
                        )}
                        {contact.isBlocked && contact.isFriend && (
                          <button type="button" className="oldschool-button" onClick={() => props.onRemoveFriend(contact.id)}>Remove</button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="oldschool-empty-note">No contacts match this search.</div>
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
                      setSocialError("");
                      event.currentTarget.reset();
                    }, (error) => {
                      setSocialError(error.message);
                    });
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

            {props.xmppStatus && (
              <section className="oldschool-group oldschool-bevel">
                <div className="oldschool-inline-form">
                  <strong>Jabber / XMPP</strong>
                  <button type="button" className="oldschool-button" onClick={() => props.onChangeMode("jabber")}>Open dashboard</button>
                </div>
                <div className="oldschool-empty-note">
                  {props.xmppStatus.enabled
                    ? `Client host ${props.xmppStatus.clientHost ?? "not set"}:${props.xmppStatus.ports.client}`
                    : "Thin-slice XMPP is configured in repo but not enabled in this app env."}
                </div>
              </section>
            )}

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

  if (props.mode === "jabber") {
    return (
      <aside className="oldschool-overlay live-floating-window jabber-window">
        <section className="oldschool-dialog oldschool-bevel">
          <div className="oldschool-titlebar">
            <span>Jabber Control Window</span>
            <button type="button" className="oldschool-titlebar-close" onClick={props.onClose}>X</button>
          </div>

          <div className="oldschool-dialog-body">
            <section className="oldschool-group oldschool-bevel">
              <div className="oldschool-inline-form">
                <strong>Status</strong>
                <button type="button" className="oldschool-button" onClick={props.onRefreshXmpp}>Refresh</button>
                <button type="button" className="oldschool-button" onClick={() => props.onChangeMode("settings")}>Back to settings</button>
              </div>
              {props.xmppStatus ? (
                <div className="oldschool-jabber-statgrid">
                  <div className="oldschool-kv-card oldschool-inset">
                    <strong>Mode</strong>
                    <span>{props.xmppStatus.enabled ? props.xmppStatus.federation.mode : "disabled"}</span>
                  </div>
                  <div className="oldschool-kv-card oldschool-inset">
                    <strong>Domain</strong>
                    <span>{props.xmppStatus.domain ?? "not set"}</span>
                  </div>
                  <div className="oldschool-kv-card oldschool-inset">
                    <strong>Connected users</strong>
                    <span>{props.xmppStatus.metrics.connectedUsers ?? "n/a"}</span>
                  </div>
                  <div className="oldschool-kv-card oldschool-inset">
                    <strong>Incoming federation</strong>
                    <span>{props.xmppStatus.metrics.incomingS2S ?? "n/a"}</span>
                  </div>
                  <div className="oldschool-kv-card oldschool-inset">
                    <strong>Outgoing federation</strong>
                    <span>{props.xmppStatus.metrics.outgoingS2S ?? "n/a"}</span>
                  </div>
                  <div className="oldschool-kv-card oldschool-inset">
                    <strong>Fetched</strong>
                    <span>{props.xmppStatus.metrics.fetchedAt ? new Date(props.xmppStatus.metrics.fetchedAt).toLocaleString() : "not yet"}</span>
                  </div>
                </div>
              ) : (
                <div className="oldschool-empty-note">No XMPP data loaded for this account.</div>
              )}
            </section>

            {props.xmppStatus && (
              <>
                <section className="oldschool-group oldschool-bevel">
                  <div className="oldschool-group-title">Client setup</div>
                  <div className="oldschool-jabber-grid">
                    <div className="oldschool-inset oldschool-kv-panel">
                      <div><strong>Host:</strong> {props.xmppStatus.clientHost ?? "not set"}</div>
                      <div><strong>Client port:</strong> {props.xmppStatus.ports.client}</div>
                      <div><strong>Admin port:</strong> {props.xmppStatus.ports.admin}</div>
                      <div><strong>Federation port:</strong> {props.xmppStatus.ports.federation}</div>
                      <div><strong>Compose profile:</strong> {props.xmppStatus.composeProfile}</div>
                      <div><strong>Admin JID:</strong> {props.xmppStatus.adminJid ?? "not set"}</div>
                    </div>
                    <div className="oldschool-inset oldschool-command-panel">
                      <strong>Thin-slice commands</strong>
                      <ul className="oldschool-code-list">
                        {props.xmppStatus.testCommands.map((command) => (
                          <li key={command}>
                            <code>{command}</code>
                          </li>
                        ))}
                      </ul>
                      {props.xmppStatus.adminUrl && (
                        <a className="oldschool-button" href={props.xmppStatus.adminUrl} target="_blank" rel="noreferrer">Open admin URL</a>
                      )}
                    </div>
                  </div>
                </section>

                <section className="oldschool-group oldschool-bevel">
                  <div className="oldschool-group-title">Sample sessions</div>
                  <div className="oldschool-list oldschool-inset compact">
                    {props.xmppStatus.metrics.sampleSessions.length ? props.xmppStatus.metrics.sampleSessions.map((session) => (
                      <div key={session.jid} className="oldschool-session-row">
                        <div>
                          <strong>{session.jid}</strong>
                          <span>{session.ip}:{session.port} via {session.connection} / {session.status || "available"}</span>
                        </div>
                        <span>{session.uptime}s</span>
                      </div>
                    )) : (
                      <div className="oldschool-empty-note">No active XMPP sessions reported yet.</div>
                    )}
                  </div>
                </section>

                <section className="oldschool-group oldschool-bevel">
                  <div className="oldschool-group-title">Warnings</div>
                  <div className="oldschool-inset oldschool-warning-panel">
                    {props.xmppStatus.warnings.length ? (
                      <ul className="oldschool-warning-list">
                        {props.xmppStatus.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                      </ul>
                    ) : (
                      <div className="oldschool-empty-note">No XMPP warnings.</div>
                    )}
                    {props.xmppStatus.lastError && (
                      <div className="oldschool-inline-error">Last error: {props.xmppStatus.lastError}</div>
                    )}
                  </div>
                </section>
              </>
            )}
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
              {props.xmppStatus && <button type="button" className="oldschool-button" onClick={() => props.onChangeMode("jabber")}>Jabber</button>}
              <button type="button" className="oldschool-button" onClick={() => props.onChangeMode("settings")}>Settings</button>
            </div>
          </section>
        </div>
      </section>
    </aside>
  );
}
