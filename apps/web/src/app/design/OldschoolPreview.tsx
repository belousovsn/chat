import { useState } from "react";

type PreviewDialog = "settings" | "room" | null;

const rooms = [
  { activity: "12:04", name: "# lobby", note: "General chat and system notices", unread: 3 },
  { activity: "11:48", name: "# design", note: "UI draft review today", unread: 0 },
  { activity: "10:31", name: "# support", note: "Open room, 7 users", unread: 1 },
  { activity: "09:12", name: "vasya", note: "offline now", unread: 0 }
];

const messages = [
  { time: "12:01", author: "northstar", body: "Topic: Oldstyle shell review. Keep layout simple, dense, readable.", tone: "system" },
  { time: "12:03", author: "kinzul", body: "This direction closer to mIRC: title bar, menu strip, room tree, user list.", tone: "peer" },
  { time: "12:04", author: "ser", body: "Need settings and room admin still easy to reach, but not giant rounded sheet.", tone: "self" },
  { time: "12:05", author: "northstar", body: "Draft idea: dialogs float above main chat. Main screen stay focused on message flow.", tone: "system" },
  { time: "12:07", author: "kinzul", body: "Nick list on right, message log in center, channels on left. Bottom line for status.", tone: "peer" }
];

const members = [
  { name: "kinzul", role: "~ owner", state: "online" },
  { name: "ser", role: "@ admin", state: "online" },
  { name: "vasya", role: "+ member", state: "away" },
  { name: "maria", role: "+ member", state: "offline" },
  { name: "ops-bot", role: "* bot", state: "online" }
];

const sessions = [
  { title: "Firefox 137 / Windows", meta: "172.18.0.1", current: true },
  { title: "Chrome 135 / Windows", meta: "172.18.0.22", current: false }
];

const roomMembers = [
  { name: "kinzul", role: "owner" },
  { name: "ser", role: "admin" },
  { name: "vasya", role: "member" }
];

const bans = [
  { name: "mike", by: "kinzul" }
];

export function OldschoolPreview() {
  const [dialog, setDialog] = useState<PreviewDialog>("settings");

  return (
    <div className="oldschool-page">
      <div className="oldschool-intro oldschool-bevel">
        <div>
          <strong>Oldstyle Preview</strong>
          <p>Design draft only. Layout review first, app wiring later.</p>
        </div>
        <div className="oldschool-toolbar-actions">
          <button type="button" className="oldschool-button active">Main shell</button>
          <button type="button" className="oldschool-button" onClick={() => setDialog("settings")}>Settings dialog</button>
          <button type="button" className="oldschool-button" onClick={() => setDialog("room")}>Room manager</button>
          <button type="button" className="oldschool-button" onClick={() => setDialog(null)}>Hide dialog</button>
        </div>
      </div>

      <div className="oldschool-window oldschool-bevel">
        <div className="oldschool-titlebar">
          <span>Northstar Chat - #lobby</span>
          <div className="oldschool-window-buttons" aria-hidden="true">
            <span>_</span>
            <span>[]</span>
            <span>X</span>
          </div>
        </div>

        <div className="oldschool-menubar">
          <span>File</span>
          <span>View</span>
          <span>Rooms</span>
          <span>People</span>
          <span>Settings</span>
          <span>Help</span>
        </div>

        <div className="oldschool-banner">
          Inspired by IRC clients: dense layout, square controls, classic dialogs, less empty space.
        </div>

        <div className="oldschool-workspace">
          <aside className="oldschool-sidebar oldschool-bevel">
            <div className="oldschool-pane-title">Rooms and chats</div>
            <div className="oldschool-tabstrip">
              <button type="button" className="oldschool-mini-tab active">Chats</button>
              <button type="button" className="oldschool-mini-tab">Rooms</button>
              <button type="button" className="oldschool-mini-tab">People</button>
            </div>

            <label className="oldschool-field">
              <span>Quick filter</span>
              <input defaultValue="#lobby" />
            </label>

            <div className="oldschool-list oldschool-inset">
              {rooms.map((room, index) => (
                <button
                  key={room.name}
                  type="button"
                  className={`oldschool-room-row ${index === 0 ? "selected" : ""}`}
                >
                  <span className="oldschool-room-time">{room.activity}</span>
                  <span className="oldschool-room-name">{room.name}</span>
                  <span className="oldschool-room-note">{room.note}</span>
                  {room.unread > 0 && <span className="oldschool-room-badge">{room.unread}</span>}
                </button>
              ))}
            </div>

            <div className="oldschool-sidebar-footer oldschool-inset">
              Connected as <strong>ser</strong>
              <span>Server: local / 28 ms</span>
            </div>
          </aside>

          <main className="oldschool-chat oldschool-bevel">
            <div className="oldschool-chat-header">
              <div>
                <strong>#lobby</strong>
                <span>Topic: redesign toward old-school desktop chat</span>
              </div>
              <div className="oldschool-chat-actions">
                <button type="button" className="oldschool-button">Join room</button>
                <button type="button" className="oldschool-button" onClick={() => setDialog("room")}>Manage room</button>
                <button type="button" className="oldschool-button" onClick={() => setDialog("settings")}>Settings</button>
              </div>
            </div>

            <div className="oldschool-message-log oldschool-inset">
              {messages.map((message) => (
                <div key={`${message.time}-${message.author}`} className={`oldschool-log-row ${message.tone}`}>
                  <span className="oldschool-log-time">[{message.time}]</span>
                  <span className="oldschool-log-author">&lt;{message.author}&gt;</span>
                  <span className="oldschool-log-body">{message.body}</span>
                </div>
              ))}
            </div>

            <div className="oldschool-composer">
              <div className="oldschool-composer-row">
                <span className="oldschool-composer-label">Message</span>
                <input className="oldschool-grow" defaultValue="Need feedback on classic shell before wiring whole app." />
                <button type="button" className="oldschool-button">Send</button>
              </div>
              <div className="oldschool-composer-row small">
                <button type="button" className="oldschool-button">Attach</button>
                <button type="button" className="oldschool-button">Reply</button>
                <button type="button" className="oldschool-button">Details</button>
                <span className="oldschool-status-text">Status: main view clean, dialogs compact, member list always visible.</span>
              </div>
            </div>
          </main>

          <aside className="oldschool-members oldschool-bevel">
            <div className="oldschool-pane-title">People in room</div>
            <div className="oldschool-list oldschool-inset compact">
              {members.map((member) => (
                <div key={member.name} className={`oldschool-member-row ${member.state}`}>
                  <span className="oldschool-member-role">{member.role}</span>
                  <span>{member.name}</span>
                </div>
              ))}
            </div>
            <div className="oldschool-sidebar-footer oldschool-inset">
              <span>5 online / 1 away / 1 offline</span>
            </div>
          </aside>
        </div>

        <div className="oldschool-statusbar">
          <span>Ready</span>
          <span>UTF-8</span>
          <span>Desktop preview route</span>
        </div>
      </div>

      {dialog && (
        <div className="oldschool-overlay">
          {dialog === "settings" ? (
            <section className="oldschool-dialog oldschool-bevel">
              <div className="oldschool-titlebar">
                <span>Settings</span>
                <button type="button" className="oldschool-titlebar-close" onClick={() => setDialog(null)}>X</button>
              </div>

              <div className="oldschool-dialog-tabs">
                <button type="button" className="oldschool-mini-tab">Details</button>
                <button type="button" className="oldschool-mini-tab">People</button>
                <button type="button" className="oldschool-mini-tab active">Settings</button>
              </div>

              <div className="oldschool-dialog-body">
                <section className="oldschool-group oldschool-bevel">
                  <div className="oldschool-group-title">Sessions</div>
                  <div className="oldschool-list oldschool-inset compact">
                    {sessions.map((session) => (
                      <div key={session.title} className="oldschool-session-row">
                        <div>
                          <strong>{session.title}</strong>
                          <span>{session.meta}</span>
                        </div>
                        <button type="button" className="oldschool-button">{session.current ? "Current" : "Revoke"}</button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="oldschool-group oldschool-bevel">
                  <div className="oldschool-group-title">Password and recovery</div>
                  <label className="oldschool-field">
                    <span>Current password</span>
                    <input type="password" />
                  </label>
                  <label className="oldschool-field">
                    <span>New password</span>
                    <input type="password" />
                  </label>
                  <div className="oldschool-dialog-actions">
                    <button type="button" className="oldschool-button active">Change password</button>
                  </div>
                </section>

                <section className="oldschool-group oldschool-bevel danger">
                  <div className="oldschool-group-title">Danger zone</div>
                  <label className="oldschool-field">
                    <span>Type DELETE to remove account</span>
                    <input defaultValue="" />
                  </label>
                  <div className="oldschool-dialog-actions">
                    <button type="button" className="oldschool-button danger">Delete account</button>
                    <button type="button" className="oldschool-button" onClick={() => setDialog(null)}>Close</button>
                  </div>
                </section>
              </div>
            </section>
          ) : (
            <section className="oldschool-dialog oldschool-bevel">
              <div className="oldschool-titlebar">
                <span>Manage room - #lobby</span>
                <button type="button" className="oldschool-titlebar-close" onClick={() => setDialog(null)}>X</button>
              </div>

              <div className="oldschool-dialog-body">
                <section className="oldschool-group oldschool-bevel">
                  <div className="oldschool-group-title">Room settings</div>
                  <div className="oldschool-two-column">
                    <label className="oldschool-field">
                      <span>Name</span>
                      <input defaultValue="lobby" />
                    </label>
                    <label className="oldschool-field">
                      <span>Visibility</span>
                      <select defaultValue="public">
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </label>
                  </div>
                  <label className="oldschool-field">
                    <span>Description</span>
                    <input defaultValue="General chat and system notices" />
                  </label>
                </section>

                <section className="oldschool-group oldschool-bevel">
                  <div className="oldschool-group-title">Invite user</div>
                  <div className="oldschool-inline-form">
                    <input defaultValue="" placeholder="username" />
                    <button type="button" className="oldschool-button">Send invite</button>
                  </div>
                </section>

                <section className="oldschool-group oldschool-bevel">
                  <div className="oldschool-group-title">Members</div>
                  <div className="oldschool-list oldschool-inset compact">
                    {roomMembers.map((member) => (
                      <div key={member.name} className="oldschool-session-row">
                        <div>
                          <strong>{member.name}</strong>
                          <span>{member.role}</span>
                        </div>
                        <button type="button" className="oldschool-button">{member.role === "member" ? "Promote" : "Edit"}</button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="oldschool-group oldschool-bevel">
                  <div className="oldschool-group-title">Bans</div>
                  <div className="oldschool-list oldschool-inset compact">
                    {bans.map((ban) => (
                      <div key={ban.name} className="oldschool-session-row">
                        <div>
                          <strong>{ban.name}</strong>
                          <span>banned by {ban.by}</span>
                        </div>
                        <button type="button" className="oldschool-button">Unban</button>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="oldschool-dialog-actions">
                  <button type="button" className="oldschool-button active">Save changes</button>
                  <button type="button" className="oldschool-button">Close</button>
                  <button type="button" className="oldschool-button danger">Delete room</button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
