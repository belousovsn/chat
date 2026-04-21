import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { ConversationDetails, RoomBan } from "./types";

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
