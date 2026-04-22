import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { ConversationDetails, PublicRoom, RoomBan } from "./types";

export function RoomDirectoryModal(props: {
  onClose: () => void;
  onJoinRoom: (roomId: string) => void;
  onOpenCreateRoom: () => void;
  onOpenRoom: (roomId: string) => void;
  onRefreshRooms: () => void;
  publicRooms: PublicRoom[] | undefined;
  publicSearch: string;
  selectedConversationId: string | null;
  setPublicSearch: (value: string) => void;
}) {
  return (
    <div className="oldschool-overlay live-floating-window room-window">
      <section className="oldschool-dialog oldschool-bevel">
        <div className="oldschool-titlebar">
          <span>Rooms Window</span>
          <button type="button" className="oldschool-titlebar-close" onClick={props.onClose}>X</button>
        </div>

        <div className="oldschool-dialog-body oldschool-room-directory-body">
          <section className="oldschool-group oldschool-bevel">
            <div className="oldschool-inline-form oldschool-room-directory-toolbar">
              <strong>Available rooms</strong>
              <span className="oldschool-status-text">{props.publicRooms?.length ?? 0} public rooms</span>
              <span className="oldschool-room-directory-spacer" />
              <button type="button" className="oldschool-button active" onClick={props.onOpenCreateRoom}>Create new room</button>
              <button type="button" className="oldschool-button" onClick={props.onRefreshRooms}>Refresh</button>
            </div>

            <label className="oldschool-field">
              <span>Find room</span>
              <input
                value={props.publicSearch}
                onChange={(event) => props.setPublicSearch(event.target.value)}
                placeholder="public rooms"
              />
            </label>

            <div className="oldschool-list oldschool-inset compact">
              {props.publicRooms === undefined ? (
                <div className="oldschool-empty-note">Loading rooms...</div>
              ) : props.publicRooms.length ? props.publicRooms.map((room) => (
                <div
                  key={String(room.id)}
                  className={`oldschool-room-row oldschool-public-row ${props.selectedConversationId === String(room.id) ? "selected" : ""}`}
                >
                  <span className="oldschool-room-time">{room.member_count}</span>
                  <span className="oldschool-room-name">#{String(room.name)}</span>
                  <span className="oldschool-room-note">{String(room.description ?? "Open room")}</span>
                  <button
                    type="button"
                    className="oldschool-public-action"
                    onClick={() => {
                      if (room.is_member) {
                        props.onOpenRoom(String(room.id));
                        return;
                      }

                      props.onJoinRoom(String(room.id));
                    }}
                  >
                    {room.is_member ? "Open" : "Join"}
                  </button>
                </div>
              )) : (
                <div className="oldschool-empty-note">No rooms found. Create one to start chatting.</div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export function CreateRoomModal(props: {
  onClose: () => void;
  onCreate: (input: { description: string; name: string; visibility: "public" | "private" }) => void;
}) {
  return (
    <div className="oldschool-overlay live-floating-window room-window">
      <form
        className="oldschool-dialog oldschool-bevel"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          props.onCreate({
            name: String(form.get("name")),
            description: String(form.get("description") || ""),
            visibility: String(form.get("visibility")) as "public" | "private"
          });
        }}
      >
        <div className="oldschool-titlebar">
          <span>Room Window</span>
          <button type="button" className="oldschool-titlebar-close" onClick={props.onClose}>X</button>
        </div>

        <div className="oldschool-dialog-body">
          <section className="oldschool-group oldschool-bevel">
            <div className="oldschool-group-title">Create room</div>
            <label className="oldschool-field">
              <span>Name</span>
              <input name="name" required />
            </label>
            <label className="oldschool-field">
              <span>Description</span>
              <input name="description" />
            </label>
            <label className="oldschool-field">
              <span>Visibility</span>
              <select name="visibility" defaultValue="public">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
            <div className="oldschool-inline-form">
              <button type="submit" className="oldschool-button active">Create</button>
              <button type="button" className="oldschool-button" onClick={props.onClose}>Close</button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}

export function ManageRoomModal(props: {
  onClose: () => void;
  onRefresh: () => Promise<void>;
  room: ConversationDetails;
  roomId: string;
}) {
  const [bans, setBans] = useState<RoomBan[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    void refreshBans();
  }, [props.roomId]);

  const refreshBans = async () => {
    try {
      setBans(await api.roomBans(props.roomId));
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const runRoomAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
    refresh: () => Promise<unknown> = props.onRefresh
  ) => {
    try {
      await action();
      setStatus(successMessage);
      await refresh();
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <div className="oldschool-overlay live-floating-window room-window">
      <div className="oldschool-dialog oldschool-bevel">
        <div className="oldschool-titlebar">
          <span>Manage room - #{props.room.name}</span>
          <button type="button" className="oldschool-titlebar-close" onClick={props.onClose}>X</button>
        </div>

        <div className="oldschool-dialog-body">
          <form
            className="oldschool-group oldschool-bevel"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              api.updateRoom(props.roomId, {
                name: String(form.get("name")),
                description: String(form.get("description") || ""),
                visibility: String(form.get("visibility")) as "public" | "private"
              }).then(async () => {
                setStatus("Room updated.");
                await props.onRefresh();
              }).catch((error: Error) => setStatus(error.message));
            }}
          >
            <div className="oldschool-two-column">
              <label className="oldschool-field">
                <span>Name</span>
                <input name="name" defaultValue={props.room.name} />
              </label>
              <label className="oldschool-field">
                <span>Visibility</span>
                <select name="visibility" defaultValue={props.room.visibility ?? "public"}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>
            </div>
            <label className="oldschool-field">
              <span>Description</span>
              <input name="description" defaultValue={props.room.description ?? ""} />
            </label>
            <div className="oldschool-inline-form">
              <input
                name="username"
                placeholder="Invite by username"
                value={inviteUsername}
                onChange={(event) => setInviteUsername(event.target.value)}
              />
              <button
                type="button"
                className="oldschool-button"
                onClick={async () => {
                  const username = inviteUsername.trim();
                  if (!username) {
                    return;
                  }
                  try {
                    await api.inviteToRoom(props.roomId, username);
                    setStatus("Invite sent.");
                    setInviteUsername("");
                  } catch (error) {
                    setStatus((error as Error).message);
                  }
                }}
              >
                Send invite
              </button>
              <button
                type="button"
                className="oldschool-button"
                onClick={async () => {
                  try {
                    const result = await api.addAssistantToRoom(props.roomId);
                    setStatus(`AI bot ready. Mention @${result.assistantUsername}.`);
                    await props.onRefresh();
                  } catch (error) {
                    setStatus((error as Error).message);
                  }
                }}
              >
                Add AI bot
              </button>
            </div>

            <div className="oldschool-modal-columns">
              <section className="oldschool-group oldschool-bevel">
                <div className="oldschool-group-title">Members</div>
                <div className="oldschool-list oldschool-inset compact">
                  {props.room.members.map((member) => (
                    <div key={member.userId} className="oldschool-session-row">
                      <div>
                        <strong>{member.username}</strong>
                        <span>{member.role}</span>
                      </div>
                      <div className="oldschool-inline-form">
                        {member.role === "member" && (
                          <button
                            type="button"
                            className="oldschool-button"
                            onClick={() => void runRoomAction(
                              () => api.makeAdmin(props.roomId, member.userId),
                              `${member.username} promoted.`
                            )}
                          >
                            Promote
                          </button>
                        )}
                        {member.role === "admin" && (
                          <button
                            type="button"
                            className="oldschool-button"
                            onClick={() => void runRoomAction(
                              () => api.removeAdmin(props.roomId, member.userId),
                              `${member.username} demoted.`
                            )}
                          >
                            Demote
                          </button>
                        )}
                        {member.role !== "owner" && (
                          <button
                            type="button"
                            className="oldschool-button"
                            onClick={() => void runRoomAction(
                              () => api.removeMember(props.roomId, member.userId),
                              `${member.username} banned.`
                            )}
                          >
                            Ban
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="oldschool-group oldschool-bevel">
                <div className="oldschool-group-title">Bans</div>
                <div className="oldschool-list oldschool-inset compact">
                  {bans.length ? bans.map((ban) => (
                    <div key={ban.user_id} className="oldschool-session-row">
                      <div>
                        <strong>{ban.username}</strong>
                        <span>banned by {ban.banned_by_username}</span>
                      </div>
                      <button
                        type="button"
                        className="oldschool-button"
                        onClick={() => void runRoomAction(
                          () => api.unbanUser(props.roomId, ban.user_id),
                          `${ban.username} unbanned.`,
                          refreshBans
                        )}
                      >
                        Unban
                      </button>
                    </div>
                  )) : (
                    <div className="oldschool-empty-note">No bans.</div>
                  )}
                </div>
              </section>
            </div>

            <div className="oldschool-inline-form oldschool-modal-actions">
              <button type="submit" className="oldschool-button active">Save changes</button>
              <button type="button" className="oldschool-button" onClick={props.onClose}>Close</button>
              <button
                type="button"
                className="oldschool-button oldschool-danger-button"
                onClick={() => api.deleteRoom(props.roomId).then(() => {
                  props.onClose();
                  window.location.reload();
                }).catch((error: Error) => setStatus(error.message))}
              >
                Delete room
              </button>
            </div>

            {status && <p className="oldschool-status-text">{status}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
