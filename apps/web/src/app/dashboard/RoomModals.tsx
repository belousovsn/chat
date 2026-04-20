import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { ConversationDetails, RoomBan } from "./types";

export function CreateRoomModal(props: {
  onClose: () => void;
  onCreate: (input: { description: string; name: string; visibility: "public" | "private" }) => void;
}) {
  return (
    <div className="modal-backdrop">
      <form
        className="modal-card stack"
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
        <h3>Create room</h3>
        <label>Name<input name="name" required /></label>
        <label>Description<input name="description" /></label>
        <label>Visibility
          <select name="visibility" defaultValue="public">
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={props.onClose}>Cancel</button>
          <button type="submit" className="primary">Create</button>
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
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.roomBans(props.roomId).then(setBans).catch((error: Error) => setStatus(error.message));
  }, [props.roomId]);

  return (
    <div className="modal-backdrop">
      <div className="modal-card stack">
        <h3>Manage room</h3>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            api.updateRoom(props.roomId, {
              name: String(form.get("name")),
              description: String(form.get("description") || ""),
              visibility: String(form.get("visibility")) as "public" | "private"
            }).then(props.onRefresh).catch((error: Error) => setStatus(error.message));
          }}
        >
          <label>Name<input name="name" defaultValue={props.room.name} /></label>
          <label>Description<input name="description" defaultValue={props.room.description ?? ""} /></label>
          <label>Visibility
            <select name="visibility" defaultValue={props.room.visibility ?? "public"}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <button type="submit" className="primary">Save changes</button>
        </form>

        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            api.inviteToRoom(props.roomId, String(form.get("username"))).then(() => {
              setStatus("Invite sent");
              event.currentTarget.reset();
            }).catch((error: Error) => setStatus(error.message));
          }}
        >
          <label>Invite by username<input name="username" /></label>
          <button type="submit" className="ghost">Send invite</button>
        </form>

        <div className="public-list">
          {props.room.members.map((member) => (
            <div key={member.userId} className="mini-row">
              <div>
                <strong>{member.username}</strong>
                <small>{member.role}</small>
              </div>
              <div className="inline-actions">
                {member.role === "member" && <button className="ghost" onClick={() => api.makeAdmin(props.roomId, member.userId).then(props.onRefresh)}>Make admin</button>}
                {member.role === "admin" && <button className="ghost" onClick={() => api.removeAdmin(props.roomId, member.userId).then(props.onRefresh)}>Remove admin</button>}
                {member.role !== "owner" && <button className="ghost" onClick={() => api.removeMember(props.roomId, member.userId).then(props.onRefresh)}>Ban</button>}
              </div>
            </div>
          ))}
        </div>

        <div className="public-list">
          {bans.map((ban) => (
            <div key={ban.user_id} className="mini-row">
              <div>
                <strong>{ban.username}</strong>
                <small>banned by {ban.banned_by_username}</small>
              </div>
              <button className="ghost" onClick={() => api.unbanUser(props.roomId, ban.user_id).then(() => api.roomBans(props.roomId).then(setBans))}>Unban</button>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="ghost" onClick={props.onClose}>Close</button>
          <button
            className="danger"
            onClick={() => api.deleteRoom(props.roomId).then(() => {
              props.onClose();
              window.location.reload();
            }).catch((error: Error) => setStatus(error.message))}
          >
            Delete room
          </button>
        </div>
        <p className="status-line">{status}</p>
      </div>
    </div>
  );
}
