import { useState } from "react";
import type { ContactRequest, ConversationMember, SessionEntry } from "./types";

type InfoSidebarProps = {
  meUserId: string | undefined;
  members: ConversationMember[] | undefined;
  onAcceptFriendRequest: (requestId: string) => void;
  onChangePassword: (input: { currentPassword: string; newPassword: string }, onSuccess: () => void) => void;
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
    <aside className="right-panel">
      <section className="panel-card">
        <div className="panel-heading">
          <h3>Members</h3>
          <span>{props.members?.length ?? 0}</span>
        </div>
        <div className="public-list">
          {props.members?.map((member) => (
            <div className="mini-row" key={member.userId}>
              <div>
                <strong>{member.username}</strong>
                <small>{member.role} - {member.presence}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <h3>Sessions</h3>
          <button className="ghost" onClick={props.onRefreshSessions}>Refresh</button>
        </div>
        <div className="public-list">
          {props.sessions?.map((session) => (
            <div className="mini-row" key={session.id}>
              <div>
                <strong>{session.userAgent}</strong>
                <small>{session.ipAddress}</small>
              </div>
              {!session.isCurrent && (
                <button className="ghost" onClick={() => props.onRevokeSession(session.id)}>Log out</button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <h3>Account security</h3>
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

      <section className="panel-card">
        <div className="panel-heading">
          <h3>Friend requests</h3>
          <button className="ghost" onClick={props.onRefreshContacts}>Refresh</button>
        </div>
        <div className="public-list">
          {props.requests?.map((request) => (
            <div key={request.id} className="mini-row">
              <div>
                <strong>{request.requester_username}</strong>
                <small>{request.message ?? ""}</small>
              </div>
              {request.receiver_id === props.meUserId && (
                <button className="ghost" onClick={() => props.onAcceptFriendRequest(request.id)}>Accept</button>
              )}
            </div>
          ))}
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
    </aside>
  );
}
