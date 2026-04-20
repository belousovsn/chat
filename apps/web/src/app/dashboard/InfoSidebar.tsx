import { useState } from "react";
import clsx from "clsx";
import type { ContactRequest, ConversationMember, SessionEntry } from "./types";

export type UtilityPanelMode = "details" | "social" | "settings";

type InfoSidebarProps = {
  conversationTitle: string;
  meUserId: string | undefined;
  members: ConversationMember[] | undefined;
  mode: UtilityPanelMode;
  onAcceptFriendRequest: (requestId: string) => void;
  onChangeMode: (mode: UtilityPanelMode) => void;
  onChangePassword: (input: { currentPassword: string; newPassword: string }, onSuccess: () => void) => void;
  onClose: () => void;
  onDeleteAccount: () => void;
  onRefreshContacts: () => void;
  onRefreshSessions: () => void;
  onRevokeSession: (sessionId: string) => void;
  onSendFriendRequest: (input: { message: string; username: string }, onSuccess: () => void, onError: (error: Error) => void) => void;
  requests: ContactRequest[] | undefined;
  sessions: SessionEntry[] | undefined;
};

export function InfoSidebar(props: InfoSidebarProps) {
  const [deleteConfirm, setDeleteConfirm] = useState("");

  return (
    <aside className="utility-sheet">
      <div className="utility-sheet-header">
        <div>
          <p className="eyebrow">Menu</p>
          <h3>{props.mode === "details" ? props.conversationTitle : props.mode === "social" ? "People" : "Settings"}</h3>
        </div>
        <button className="ghost" onClick={props.onClose}>Close</button>
      </div>

      <div className="sidebar-tabs utility-tabs" role="tablist" aria-label="Utility panel areas">
        <button
          className={clsx("sidebar-tab", { active: props.mode === "details" })}
          onClick={() => props.onChangeMode("details")}
        >
          Details
        </button>
        <button
          className={clsx("sidebar-tab", { active: props.mode === "social" })}
          onClick={() => props.onChangeMode("social")}
        >
          People
        </button>
        <button
          className={clsx("sidebar-tab", { active: props.mode === "settings" })}
          onClick={() => props.onChangeMode("settings")}
        >
          Settings
        </button>
      </div>

      {props.mode === "details" && (
        <section className="panel-card sidebar-section utility-section">
          <div className="panel-heading sidebar-heading">
            <div>
              <p className="eyebrow">Conversation</p>
              <h3>Members</h3>
            </div>
            <span className="count-pill">{props.members?.length ?? 0}</span>
          </div>
          <div className="public-list">
            {props.members?.length ? props.members.map((member) => (
              <div className="mini-row" key={member.userId}>
                <div className="mini-copy">
                  <strong>{member.username}</strong>
                  <small>{member.role}</small>
                  <small className={`presence-pill ${member.presence}`}>{member.presence}</small>
                </div>
              </div>
            )) : (
              <div className="empty-panel">Open room or direct chat to inspect people here.</div>
            )}
          </div>
        </section>
      )}

      {props.mode === "social" && (
        <section className="panel-card sidebar-section utility-section">
          <div className="panel-heading sidebar-heading">
            <div>
              <p className="eyebrow">Social</p>
              <h3>Friend requests</h3>
            </div>
            <button className="ghost" onClick={props.onRefreshContacts}>Refresh</button>
          </div>
          <div className="public-list">
            {props.requests?.length ? props.requests.map((request) => (
              <div key={request.id} className="mini-row">
                <div className="mini-copy">
                  <strong>{request.requester_username}</strong>
                  <small>{request.message ?? ""}</small>
                </div>
                {request.receiver_id === props.meUserId && (
                  <button className="ghost" onClick={() => props.onAcceptFriendRequest(request.id)}>Accept</button>
                )}
              </div>
            )) : (
              <div className="empty-panel">No pending requests.</div>
            )}
          </div>
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
            <label>Invite by username<input name="username" required /></label>
            <label>Optional note<input name="message" /></label>
            <button type="submit" className="primary">Send friend request</button>
          </form>
        </section>
      )}

      {props.mode === "settings" && (
        <section className="utility-stack">
          <section className="panel-card sidebar-section utility-section">
            <div className="panel-heading sidebar-heading">
              <div>
                <p className="eyebrow">Security</p>
                <h3>Sessions</h3>
              </div>
              <button className="ghost" onClick={props.onRefreshSessions}>Refresh</button>
            </div>
            <div className="public-list">
              {props.sessions?.map((session) => (
                <div className="mini-row" key={session.id}>
                  <div className="mini-copy">
                    <strong>{session.userAgent}</strong>
                    <small>{session.ipAddress}</small>
                    {session.isCurrent && <small className="status-chip">Current session</small>}
                  </div>
                  {!session.isCurrent && (
                    <button className="ghost" onClick={() => props.onRevokeSession(session.id)}>Log out</button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card sidebar-section utility-section">
            <div className="panel-heading sidebar-heading">
              <div>
                <p className="eyebrow">Account</p>
                <h3>Password and recovery</h3>
              </div>
            </div>
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
              <label>Current password<input name="currentPassword" type="password" required /></label>
              <label>New password<input name="newPassword" type="password" minLength={8} required /></label>
              <button type="submit" className="primary">Change password</button>
            </form>

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
              <label>
                Type DELETE to confirm account removal
                <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
              </label>
              <button type="submit" className="danger" disabled={deleteConfirm !== "DELETE"}>Delete account</button>
            </form>
          </section>
        </section>
      )}
    </aside>
  );
}
