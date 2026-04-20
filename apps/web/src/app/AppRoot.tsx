import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useChatStore } from "../features/chat/store";
import type { ChatMessage } from "@chat/shared";

type AuthMode = "login" | "register" | "forgot" | "reset";

function AuthGate() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [message, setMessage] = useState<string>("");
  const search = new URLSearchParams(window.location.search);
  const resetToken = search.get("token");

  const login = useMutation({
    mutationFn: (input: { email: string; password: string }) => api.login(input)
  });
  const register = useMutation({
    mutationFn: (input: { email: string; username: string; password: string }) => api.register(input)
  });
  const forgot = useMutation({
    mutationFn: (email: string) => api.forgotPassword(email)
  });
  const reset = useMutation({
    mutationFn: (password: string) => api.resetPassword(resetToken ?? "", password)
  });

  return (
    <div className="auth-shell">
      <div className="brand-panel">
        <span className="badge">Classic Chat MVP</span>
        <h1>Old-school web chat, modern enough to ship.</h1>
        <p>Public rooms, private invites, direct messages, presence, attachments, moderation, and persistent history.</p>
      </div>
      <div className="auth-card">
        <div className="auth-tabs">
          <button className={clsx({ active: mode === "login" })} onClick={() => setMode("login")}>Sign in</button>
          <button className={clsx({ active: mode === "register" })} onClick={() => setMode("register")}>Register</button>
          <button className={clsx({ active: mode === "forgot" })} onClick={() => setMode("forgot")}>Reset</button>
        </div>
        {mode === "login" && (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              login.mutate({
                email: String(form.get("email")),
                password: String(form.get("password"))
              });
            }}
          >
            <label>Email<input name="email" type="email" required /></label>
            <label>Password<input name="password" type="password" required /></label>
            <button type="submit" className="primary">Sign in</button>
          </form>
        )}
        {mode === "register" && (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              register.mutate({
                email: String(form.get("email")),
                username: String(form.get("username")),
                password: String(form.get("password"))
              });
            }}
          >
            <label>Email<input name="email" type="email" required /></label>
            <label>Username<input name="username" minLength={3} required /></label>
            <label>Password<input name="password" type="password" minLength={8} required /></label>
            <button type="submit" className="primary">Create account</button>
          </form>
        )}
        {mode === "forgot" && (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              forgot.mutate(String(form.get("email")), {
                onSuccess: () => setMessage("Reset mail sent to Mailpit")
              });
            }}
          >
            <label>Email<input name="email" type="email" required /></label>
            <button type="submit" className="primary">Send reset link</button>
          </form>
        )}
        {resetToken && (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              reset.mutate(String(form.get("password")), {
                onSuccess: () => setMessage("Password updated, sign in now")
              });
            }}
          >
            <label>Reset token<input value={resetToken} disabled /></label>
            <label>New password<input name="password" type="password" minLength={8} required /></label>
            <button type="submit" className="primary">Reset password</button>
          </form>
        )}
        <p className="auth-feedback">{login.error?.message ?? register.error?.message ?? forgot.error?.message ?? reset.error?.message ?? message}</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const queryClient = useQueryClient();
  const { selectedConversationId, setSelectedConversationId, replyToMessageId, setReplyToMessageId, uploadedAttachments, addUploadedAttachment, clearUploadedAttachments, removeUploadedAttachment } = useChatStore();
  const [publicSearch, setPublicSearch] = useState("");
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [activityTick, setActivityTick] = useState(0);

  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  const conversations = useQuery({ queryKey: ["conversations"], queryFn: api.conversations });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: api.contacts });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: api.sessions });
  const publicRooms = useQuery({ queryKey: ["public-rooms", publicSearch], queryFn: () => api.publicRooms(publicSearch) });
  const conversationDetails = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: () => api.conversation(selectedConversationId!),
    enabled: Boolean(selectedConversationId)
  });
  const messages = useQuery({
    queryKey: ["messages", selectedConversationId],
    queryFn: () => api.messages(selectedConversationId!),
    enabled: Boolean(selectedConversationId)
  });

  useEffect(() => {
    if (!selectedConversationId && conversations.data?.[0]) {
      setSelectedConversationId(conversations.data[0].id);
    }
  }, [conversations.data, selectedConversationId, setSelectedConversationId]);

  useEffect(() => {
    const socket = getSocket();
    const onEvent = (event: { type: string; payload: unknown }) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      if (selectedConversationId) {
        void queryClient.invalidateQueries({ queryKey: ["messages", selectedConversationId] });
        void queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
      }
      if (event.type === "presence.updated") {
        void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      }
    };
    socket.on("chat:event", onEvent);
    return () => {
      socket.off("chat:event", onEvent);
    };
  }, [queryClient, selectedConversationId]);

  useEffect(() => {
    const socket = getSocket();
    const send = () => {
      socket.emit("presence.activity", {
        tabId: "main",
        active: document.visibilityState === "visible",
        timestamp: new Date().toISOString()
      });
      setActivityTick((value) => value + 1);
    };
    send();
    const interval = window.setInterval(send, 15_000);
    window.addEventListener("focus", send);
    window.addEventListener("visibilitychange", send);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", send);
      window.removeEventListener("visibilitychange", send);
    };
  }, []);

  const createRoom = useMutation({
    mutationFn: api.createRoom,
    onSuccess: (conversation) => {
      setRoomFormOpen(false);
      setSelectedConversationId(conversation.id);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  const sendMessage = useMutation({
    mutationFn: (input: { conversationId: string; body: string }) => api.sendMessage(input.conversationId, {
      body: input.body,
      replyToMessageId,
      attachmentIds: uploadedAttachments.map((item) => item.id)
    }),
    onSuccess: (message) => {
      setReplyToMessageId(null);
      clearUploadedAttachments();
      void queryClient.invalidateQueries({ queryKey: ["messages", message.conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void api.markRead(message.conversationId, { messageId: message.id });
    }
  });

  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => window.location.reload()
  });

  const createDirect = useMutation({
    mutationFn: api.createDirectConversation,
    onSuccess: (conversation) => {
      setSelectedConversationId(conversation.id);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  const joinRoom = useMutation({
    mutationFn: api.joinRoom,
    onSuccess: (conversation) => {
      setSelectedConversationId(conversation.id);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["public-rooms"] });
    }
  });

  const selectedSummary = useMemo(
    () => conversations.data?.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations.data, selectedConversationId]
  );

  useEffect(() => {
    const latest = messages.data?.items.at(-1);
    if (selectedConversationId && latest) {
      void api.markRead(selectedConversationId, { messageId: latest.id }).catch(() => undefined);
    }
  }, [messages.data, selectedConversationId]);

  if (me.isLoading) {
    return <div className="center-note">Loading chat...</div>;
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="logo">ChatLogo</div>
        <nav className="topnav">
          <button onClick={() => setRoomFormOpen(true)}>Create room</button>
          <button onClick={() => setManageOpen(true)} disabled={!selectedConversationId || selectedSummary?.kind !== "room"}>Manage room</button>
          <button onClick={() => sessions.refetch()}>Sessions</button>
          <button onClick={() => contacts.refetch()}>Contacts</button>
          <button onClick={() => logout.mutate()}>Sign out</button>
        </nav>
      </header>

      <div className="workspace">
        <aside className="left-panel">
          <section className="panel-card">
            <div className="panel-heading">
              <h3>Chats</h3>
              <span>{conversations.data?.length ?? 0}</span>
            </div>
            <div className="conversation-list">
              {conversations.data?.map((conversation) => (
                <button
                  key={conversation.id}
                  className={clsx("conversation-item", { active: conversation.id === selectedConversationId })}
                  onClick={() => setSelectedConversationId(conversation.id)}
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
              <input value={publicSearch} onChange={(event) => setPublicSearch(event.target.value)} placeholder="Search" />
            </div>
            <div className="public-list">
              {publicRooms.data?.map((room) => (
                <div key={String(room.id)} className="mini-row">
                  <div>
                    <strong>{String(room.name)}</strong>
                    <small>{String(room.description ?? "")}</small>
                  </div>
                  <button
                    className="ghost"
                    onClick={() => joinRoom.mutate(String(room.id))}
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
              <button className="ghost" onClick={() => contacts.refetch()}>Refresh</button>
            </div>
            <div className="public-list">
              {contacts.data?.friends.map((friend) => (
                <div key={friend.id} className="mini-row">
                  <div>
                    <strong>{friend.username}</strong>
                    <small>{friend.presence}</small>
                  </div>
                  <button className="ghost" onClick={() => createDirect.mutate(friend.id)}>Chat</button>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="chat-panel">
          <section className="chat-header">
            <div>
              <h2>{conversationDetails.data?.kind === "direct" ? conversationDetails.data.directPeer?.username ?? conversationDetails.data.name : `# ${conversationDetails.data?.name ?? "Choose a conversation"}`}</h2>
              <p>{conversationDetails.data?.description ?? (selectedSummary?.isFrozen ? "Conversation frozen by block rule" : "Classic room description here...")}</p>
            </div>
            <div className="meta">
              <span>{conversationDetails.data?.memberCount ?? 0} members</span>
              <span>tick {activityTick}</span>
            </div>
          </section>

          <section className="messages">
            {messages.data?.nextCursor && selectedConversationId && (
              <button
                className="ghost older"
                onClick={async () => {
                  const older = await api.messages(selectedConversationId, messages.data?.nextCursor ?? undefined);
                  queryClient.setQueryData(["messages", selectedConversationId], {
                    items: [...older.items, ...(messages.data?.items ?? [])],
                    nextCursor: older.nextCursor
                  });
                }}
              >
                Load older messages
              </button>
            )}

            {messages.data?.items.map((message: ChatMessage) => (
              <article key={message.id} className="message-card">
                <header>
                  <strong>{message.author.username}</strong>
                  <span>{new Date(message.createdAt).toLocaleString()}</span>
                  {message.isEdited && <em>edited</em>}
                  {message.author.id === me.data?.user.id && (
                    <button className="inline-action" onClick={() => setReplyToMessageId(message.id)}>Reply</button>
                  )}
                </header>
                {message.replyTo && <blockquote>{message.replyTo.authorUsername}: {message.replyTo.body}</blockquote>}
                <p>{message.body}</p>
                {message.attachments.length > 0 && (
                  <div className="attachment-strip">
                    {message.attachments.map((attachment: ChatMessage["attachments"][number]) => (
                      <a key={attachment.id} href={attachment.downloadUrl} target="_blank" rel="noreferrer">
                        {attachment.originalName}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const body = String(form.get("body") ?? "");
              if (!selectedConversationId) {
                return;
              }
              sendMessage.mutate({ conversationId: selectedConversationId, body });
              event.currentTarget.reset();
            }}
            onPaste={async (event) => {
              const file = event.clipboardData.files?.[0];
              if (file && selectedConversationId) {
                const attachment = await api.uploadAttachment(selectedConversationId, file);
                addUploadedAttachment({
                  id: attachment.id,
                  originalName: attachment.originalName,
                  downloadUrl: attachment.downloadUrl
                });
              }
            }}
          >
            {replyToMessageId && (
              <div className="reply-banner">
                Replying to {replyToMessageId}
                <button type="button" className="ghost" onClick={() => setReplyToMessageId(null)}>x</button>
              </div>
            )}
            <div className="composer-row">
              <label className="ghost file-picker">
                Attach
                <input
                  type="file"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file || !selectedConversationId) {
                      return;
                    }
                    const attachment = await api.uploadAttachment(selectedConversationId, file);
                    addUploadedAttachment({
                      id: attachment.id,
                      originalName: attachment.originalName,
                      downloadUrl: attachment.downloadUrl
                    });
                  }}
                />
              </label>
              <textarea name="body" placeholder="Write message..." rows={3} />
              <button type="submit" className="primary" disabled={!selectedConversationId}>Send</button>
            </div>
            {uploadedAttachments.length > 0 && (
              <div className="attachment-strip">
                {uploadedAttachments.map((attachment) => (
                  <button key={attachment.id} type="button" className="ghost" onClick={() => removeUploadedAttachment(attachment.id)}>
                    {attachment.originalName}
                  </button>
                ))}
              </div>
            )}
          </form>
        </main>

        <aside className="right-panel">
          <section className="panel-card">
            <div className="panel-heading">
              <h3>Members</h3>
              <span>{conversationDetails.data?.members.length ?? 0}</span>
            </div>
            <div className="public-list">
              {conversationDetails.data?.members.map((member: Awaited<ReturnType<typeof api.conversation>>["members"][number]) => (
                <div className="mini-row" key={member.userId}>
                  <div>
                    <strong>{member.username}</strong>
                    <small>{member.role} · {member.presence}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-heading">
              <h3>Sessions</h3>
              <button className="ghost" onClick={() => sessions.refetch()}>Refresh</button>
            </div>
            <div className="public-list">
              {sessions.data?.sessions.map((session: Awaited<ReturnType<typeof api.sessions>>["sessions"][number]) => (
                <div className="mini-row" key={session.id}>
                  <div>
                    <strong>{session.userAgent}</strong>
                    <small>{session.ipAddress}</small>
                  </div>
                  {!session.isCurrent && (
                    <button className="ghost" onClick={() => api.revokeSession(session.id).then(() => sessions.refetch())}>Log out</button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-heading">
              <h3>Friend requests</h3>
              <button className="ghost" onClick={() => contacts.refetch()}>Refresh</button>
            </div>
            <div className="public-list">
              {contacts.data?.requests.map((request) => (
                <div key={String(request.id)} className="mini-row">
                  <div>
                    <strong>{String(request.requester_username)}</strong>
                    <small>{String(request.message ?? "")}</small>
                  </div>
                  {String(request.receiver_id) === me.data?.user.id && (
                    <button className="ghost" onClick={() => api.acceptFriendRequest(String(request.id)).then(() => contacts.refetch())}>Accept</button>
                  )}
                </div>
              ))}
            </div>
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                api.sendFriendRequest({
                  username: String(form.get("username")),
                  message: String(form.get("message") || "")
                }).then(() => {
                  event.currentTarget.reset();
                  contacts.refetch();
                }).catch((error: Error) => setStatus(error.message));
              }}
            >
              <label>Invite by username<input name="username" required /></label>
              <label>Optional note<input name="message" /></label>
              <button type="submit" className="primary">Send friend request</button>
            </form>
          </section>
        </aside>
      </div>

      {roomFormOpen && (
        <div className="modal-backdrop">
          <form
            className="modal-card stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createRoom.mutate({
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
              <button type="button" className="ghost" onClick={() => setRoomFormOpen(false)}>Cancel</button>
              <button type="submit" className="primary">Create</button>
            </div>
          </form>
        </div>
      )}

      {manageOpen && selectedConversationId && conversationDetails.data && (
        <ManageRoomModal
          roomId={selectedConversationId}
          room={conversationDetails.data}
          onClose={() => setManageOpen(false)}
          onRefresh={async () => {
            await queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
            await queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }}
        />
      )}

      <div className="status-line">{status || createRoom.error?.message || sendMessage.error?.message}</div>
    </div>
  );
}

function ManageRoomModal(props: {
  roomId: string;
  room: Awaited<ReturnType<typeof api.conversation>>;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [bans, setBans] = useState<Array<Record<string, unknown>>>([]);
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
          {props.room.members.map((member: Awaited<ReturnType<typeof api.conversation>>["members"][number]) => (
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
            <div key={String(ban.user_id)} className="mini-row">
              <div>
                <strong>{String(ban.username)}</strong>
                <small>banned by {String(ban.banned_by_username)}</small>
              </div>
              <button className="ghost" onClick={() => api.unbanUser(props.roomId, String(ban.user_id)).then(() => api.roomBans(props.roomId).then(setBans))}>Unban</button>
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

export function AppRoot() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false
  });

  if (me.isLoading) {
    return <div className="center-note">Checking session...</div>;
  }

  if (me.isError) {
    return <AuthGate />;
  }

  return <Dashboard />;
}
