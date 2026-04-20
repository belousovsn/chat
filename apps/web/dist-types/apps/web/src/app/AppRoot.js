import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useChatStore } from "../features/chat/store";
function AuthGate() {
    const [mode, setMode] = useState("login");
    const [message, setMessage] = useState("");
    const search = new URLSearchParams(window.location.search);
    const resetToken = search.get("token");
    const login = useMutation({
        mutationFn: (input) => api.login(input)
    });
    const register = useMutation({
        mutationFn: (input) => api.register(input)
    });
    const forgot = useMutation({
        mutationFn: (email) => api.forgotPassword(email)
    });
    const reset = useMutation({
        mutationFn: (password) => api.resetPassword(resetToken ?? "", password)
    });
    return (_jsxs("div", { className: "auth-shell", children: [_jsxs("div", { className: "brand-panel", children: [_jsx("span", { className: "badge", children: "Classic Chat MVP" }), _jsx("h1", { children: "Old-school web chat, modern enough to ship." }), _jsx("p", { children: "Public rooms, private invites, direct messages, presence, attachments, moderation, and persistent history." })] }), _jsxs("div", { className: "auth-card", children: [_jsxs("div", { className: "auth-tabs", children: [_jsx("button", { className: clsx({ active: mode === "login" }), onClick: () => setMode("login"), children: "Sign in" }), _jsx("button", { className: clsx({ active: mode === "register" }), onClick: () => setMode("register"), children: "Register" }), _jsx("button", { className: clsx({ active: mode === "forgot" }), onClick: () => setMode("forgot"), children: "Reset" })] }), mode === "login" && (_jsxs("form", { className: "stack", onSubmit: (event) => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            login.mutate({
                                email: String(form.get("email")),
                                password: String(form.get("password"))
                            });
                        }, children: [_jsxs("label", { children: ["Email", _jsx("input", { name: "email", type: "email", required: true })] }), _jsxs("label", { children: ["Password", _jsx("input", { name: "password", type: "password", required: true })] }), _jsx("button", { type: "submit", className: "primary", children: "Sign in" })] })), mode === "register" && (_jsxs("form", { className: "stack", onSubmit: (event) => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            register.mutate({
                                email: String(form.get("email")),
                                username: String(form.get("username")),
                                password: String(form.get("password"))
                            });
                        }, children: [_jsxs("label", { children: ["Email", _jsx("input", { name: "email", type: "email", required: true })] }), _jsxs("label", { children: ["Username", _jsx("input", { name: "username", minLength: 3, required: true })] }), _jsxs("label", { children: ["Password", _jsx("input", { name: "password", type: "password", minLength: 8, required: true })] }), _jsx("button", { type: "submit", className: "primary", children: "Create account" })] })), mode === "forgot" && (_jsxs("form", { className: "stack", onSubmit: (event) => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            forgot.mutate(String(form.get("email")), {
                                onSuccess: () => setMessage("Reset mail sent to Mailpit")
                            });
                        }, children: [_jsxs("label", { children: ["Email", _jsx("input", { name: "email", type: "email", required: true })] }), _jsx("button", { type: "submit", className: "primary", children: "Send reset link" })] })), resetToken && (_jsxs("form", { className: "stack", onSubmit: (event) => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            reset.mutate(String(form.get("password")), {
                                onSuccess: () => setMessage("Password updated, sign in now")
                            });
                        }, children: [_jsxs("label", { children: ["Reset token", _jsx("input", { value: resetToken, disabled: true })] }), _jsxs("label", { children: ["New password", _jsx("input", { name: "password", type: "password", minLength: 8, required: true })] }), _jsx("button", { type: "submit", className: "primary", children: "Reset password" })] })), _jsx("p", { className: "auth-feedback", children: login.error?.message ?? register.error?.message ?? forgot.error?.message ?? reset.error?.message ?? message })] })] }));
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
        queryFn: () => api.conversation(selectedConversationId),
        enabled: Boolean(selectedConversationId)
    });
    const messages = useQuery({
        queryKey: ["messages", selectedConversationId],
        queryFn: () => api.messages(selectedConversationId),
        enabled: Boolean(selectedConversationId)
    });
    useEffect(() => {
        if (!selectedConversationId && conversations.data?.[0]) {
            setSelectedConversationId(conversations.data[0].id);
        }
    }, [conversations.data, selectedConversationId, setSelectedConversationId]);
    useEffect(() => {
        const socket = getSocket();
        const onEvent = (event) => {
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
        mutationFn: (input) => api.sendMessage(input.conversationId, {
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
    const selectedSummary = useMemo(() => conversations.data?.find((conversation) => conversation.id === selectedConversationId) ?? null, [conversations.data, selectedConversationId]);
    useEffect(() => {
        const latest = messages.data?.items.at(-1);
        if (selectedConversationId && latest) {
            void api.markRead(selectedConversationId, { messageId: latest.id }).catch(() => undefined);
        }
    }, [messages.data, selectedConversationId]);
    if (me.isLoading) {
        return _jsx("div", { className: "center-note", children: "Loading chat..." });
    }
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("header", { className: "topbar", children: [_jsx("div", { className: "logo", children: "ChatLogo" }), _jsxs("nav", { className: "topnav", children: [_jsx("button", { onClick: () => setRoomFormOpen(true), children: "Create room" }), _jsx("button", { onClick: () => setManageOpen(true), disabled: !selectedConversationId || selectedSummary?.kind !== "room", children: "Manage room" }), _jsx("button", { onClick: () => sessions.refetch(), children: "Sessions" }), _jsx("button", { onClick: () => contacts.refetch(), children: "Contacts" }), _jsx("button", { onClick: () => logout.mutate(), children: "Sign out" })] })] }), _jsxs("div", { className: "workspace", children: [_jsxs("aside", { className: "left-panel", children: [_jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h3", { children: "Chats" }), _jsx("span", { children: conversations.data?.length ?? 0 })] }), _jsx("div", { className: "conversation-list", children: conversations.data?.map((conversation) => (_jsxs("button", { className: clsx("conversation-item", { active: conversation.id === selectedConversationId }), onClick: () => setSelectedConversationId(conversation.id), children: [_jsxs("div", { children: [_jsx("strong", { children: conversation.kind === "direct" ? conversation.directPeer?.username ?? conversation.name : `# ${conversation.name}` }), _jsx("small", { children: conversation.description ?? (conversation.kind === "direct" ? "Direct conversation" : conversation.visibility) })] }), _jsx("span", { className: "badge", children: conversation.unreadCount })] }, conversation.id))) })] }), _jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h3", { children: "Public rooms" }), _jsx("input", { value: publicSearch, onChange: (event) => setPublicSearch(event.target.value), placeholder: "Search" })] }), _jsx("div", { className: "public-list", children: publicRooms.data?.map((room) => (_jsxs("div", { className: "mini-row", children: [_jsxs("div", { children: [_jsx("strong", { children: String(room.name) }), _jsx("small", { children: String(room.description ?? "") })] }), _jsx("button", { className: "ghost", onClick: () => joinRoom.mutate(String(room.id)), disabled: Boolean(room.is_member), children: room.is_member ? "Joined" : "Join" })] }, String(room.id)))) })] }), _jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h3", { children: "Contacts" }), _jsx("button", { className: "ghost", onClick: () => contacts.refetch(), children: "Refresh" })] }), _jsx("div", { className: "public-list", children: contacts.data?.friends.map((friend) => (_jsxs("div", { className: "mini-row", children: [_jsxs("div", { children: [_jsx("strong", { children: friend.username }), _jsx("small", { children: friend.presence })] }), _jsx("button", { className: "ghost", onClick: () => createDirect.mutate(friend.id), children: "Chat" })] }, friend.id))) })] })] }), _jsxs("main", { className: "chat-panel", children: [_jsxs("section", { className: "chat-header", children: [_jsxs("div", { children: [_jsx("h2", { children: conversationDetails.data?.kind === "direct" ? conversationDetails.data.directPeer?.username ?? conversationDetails.data.name : `# ${conversationDetails.data?.name ?? "Choose a conversation"}` }), _jsx("p", { children: conversationDetails.data?.description ?? (selectedSummary?.isFrozen ? "Conversation frozen by block rule" : "Classic room description here...") })] }), _jsxs("div", { className: "meta", children: [_jsxs("span", { children: [conversationDetails.data?.memberCount ?? 0, " members"] }), _jsxs("span", { children: ["tick ", activityTick] })] })] }), _jsxs("section", { className: "messages", children: [messages.data?.nextCursor && selectedConversationId && (_jsx("button", { className: "ghost older", onClick: async () => {
                                            const older = await api.messages(selectedConversationId, messages.data?.nextCursor ?? undefined);
                                            queryClient.setQueryData(["messages", selectedConversationId], {
                                                items: [...older.items, ...(messages.data?.items ?? [])],
                                                nextCursor: older.nextCursor
                                            });
                                        }, children: "Load older messages" })), messages.data?.items.map((message) => (_jsxs("article", { className: "message-card", children: [_jsxs("header", { children: [_jsx("strong", { children: message.author.username }), _jsx("span", { children: new Date(message.createdAt).toLocaleString() }), message.isEdited && _jsx("em", { children: "edited" }), message.author.id === me.data?.user.id && (_jsx("button", { className: "inline-action", onClick: () => setReplyToMessageId(message.id), children: "Reply" }))] }), message.replyTo && _jsxs("blockquote", { children: [message.replyTo.authorUsername, ": ", message.replyTo.body] }), _jsx("p", { children: message.body }), message.attachments.length > 0 && (_jsx("div", { className: "attachment-strip", children: message.attachments.map((attachment) => (_jsx("a", { href: attachment.downloadUrl, target: "_blank", rel: "noreferrer", children: attachment.originalName }, attachment.id))) }))] }, message.id)))] }), _jsxs("form", { className: "composer", onSubmit: (event) => {
                                    event.preventDefault();
                                    const form = new FormData(event.currentTarget);
                                    const body = String(form.get("body") ?? "");
                                    if (!selectedConversationId) {
                                        return;
                                    }
                                    sendMessage.mutate({ conversationId: selectedConversationId, body });
                                    event.currentTarget.reset();
                                }, onPaste: async (event) => {
                                    const file = event.clipboardData.files?.[0];
                                    if (file && selectedConversationId) {
                                        const attachment = await api.uploadAttachment(selectedConversationId, file);
                                        addUploadedAttachment({
                                            id: attachment.id,
                                            originalName: attachment.originalName,
                                            downloadUrl: attachment.downloadUrl
                                        });
                                    }
                                }, children: [replyToMessageId && (_jsxs("div", { className: "reply-banner", children: ["Replying to ", replyToMessageId, _jsx("button", { type: "button", className: "ghost", onClick: () => setReplyToMessageId(null), children: "x" })] })), _jsxs("div", { className: "composer-row", children: [_jsxs("label", { className: "ghost file-picker", children: ["Attach", _jsx("input", { type: "file", hidden: true, onChange: async (event) => {
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
                                                        } })] }), _jsx("textarea", { name: "body", placeholder: "Write message...", rows: 3 }), _jsx("button", { type: "submit", className: "primary", disabled: !selectedConversationId, children: "Send" })] }), uploadedAttachments.length > 0 && (_jsx("div", { className: "attachment-strip", children: uploadedAttachments.map((attachment) => (_jsx("button", { type: "button", className: "ghost", onClick: () => removeUploadedAttachment(attachment.id), children: attachment.originalName }, attachment.id))) }))] })] }), _jsxs("aside", { className: "right-panel", children: [_jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h3", { children: "Members" }), _jsx("span", { children: conversationDetails.data?.members.length ?? 0 })] }), _jsx("div", { className: "public-list", children: conversationDetails.data?.members.map((member) => (_jsx("div", { className: "mini-row", children: _jsxs("div", { children: [_jsx("strong", { children: member.username }), _jsxs("small", { children: [member.role, " \u00B7 ", member.presence] })] }) }, member.userId))) })] }), _jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h3", { children: "Sessions" }), _jsx("button", { className: "ghost", onClick: () => sessions.refetch(), children: "Refresh" })] }), _jsx("div", { className: "public-list", children: sessions.data?.sessions.map((session) => (_jsxs("div", { className: "mini-row", children: [_jsxs("div", { children: [_jsx("strong", { children: session.userAgent }), _jsx("small", { children: session.ipAddress })] }), !session.isCurrent && (_jsx("button", { className: "ghost", onClick: () => api.revokeSession(session.id).then(() => sessions.refetch()), children: "Log out" }))] }, session.id))) })] }), _jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h3", { children: "Friend requests" }), _jsx("button", { className: "ghost", onClick: () => contacts.refetch(), children: "Refresh" })] }), _jsx("div", { className: "public-list", children: contacts.data?.requests.map((request) => (_jsxs("div", { className: "mini-row", children: [_jsxs("div", { children: [_jsx("strong", { children: String(request.requester_username) }), _jsx("small", { children: String(request.message ?? "") })] }), String(request.receiver_id) === me.data?.user.id && (_jsx("button", { className: "ghost", onClick: () => api.acceptFriendRequest(String(request.id)).then(() => contacts.refetch()), children: "Accept" }))] }, String(request.id)))) }), _jsxs("form", { className: "stack", onSubmit: (event) => {
                                            event.preventDefault();
                                            const form = new FormData(event.currentTarget);
                                            api.sendFriendRequest({
                                                username: String(form.get("username")),
                                                message: String(form.get("message") || "")
                                            }).then(() => {
                                                event.currentTarget.reset();
                                                contacts.refetch();
                                            }).catch((error) => setStatus(error.message));
                                        }, children: [_jsxs("label", { children: ["Invite by username", _jsx("input", { name: "username", required: true })] }), _jsxs("label", { children: ["Optional note", _jsx("input", { name: "message" })] }), _jsx("button", { type: "submit", className: "primary", children: "Send friend request" })] })] })] })] }), roomFormOpen && (_jsx("div", { className: "modal-backdrop", children: _jsxs("form", { className: "modal-card stack", onSubmit: (event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        createRoom.mutate({
                            name: String(form.get("name")),
                            description: String(form.get("description") || ""),
                            visibility: String(form.get("visibility"))
                        });
                    }, children: [_jsx("h3", { children: "Create room" }), _jsxs("label", { children: ["Name", _jsx("input", { name: "name", required: true })] }), _jsxs("label", { children: ["Description", _jsx("input", { name: "description" })] }), _jsxs("label", { children: ["Visibility", _jsxs("select", { name: "visibility", defaultValue: "public", children: [_jsx("option", { value: "public", children: "Public" }), _jsx("option", { value: "private", children: "Private" })] })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", className: "ghost", onClick: () => setRoomFormOpen(false), children: "Cancel" }), _jsx("button", { type: "submit", className: "primary", children: "Create" })] })] }) })), manageOpen && selectedConversationId && conversationDetails.data && (_jsx(ManageRoomModal, { roomId: selectedConversationId, room: conversationDetails.data, onClose: () => setManageOpen(false), onRefresh: async () => {
                    await queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] });
                    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
                } })), _jsx("div", { className: "status-line", children: status || createRoom.error?.message || sendMessage.error?.message })] }));
}
function ManageRoomModal(props) {
    const [bans, setBans] = useState([]);
    const [status, setStatus] = useState("");
    useEffect(() => {
        api.roomBans(props.roomId).then(setBans).catch((error) => setStatus(error.message));
    }, [props.roomId]);
    return (_jsx("div", { className: "modal-backdrop", children: _jsxs("div", { className: "modal-card stack", children: [_jsx("h3", { children: "Manage room" }), _jsxs("form", { className: "stack", onSubmit: (event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        api.updateRoom(props.roomId, {
                            name: String(form.get("name")),
                            description: String(form.get("description") || ""),
                            visibility: String(form.get("visibility"))
                        }).then(props.onRefresh).catch((error) => setStatus(error.message));
                    }, children: [_jsxs("label", { children: ["Name", _jsx("input", { name: "name", defaultValue: props.room.name })] }), _jsxs("label", { children: ["Description", _jsx("input", { name: "description", defaultValue: props.room.description ?? "" })] }), _jsxs("label", { children: ["Visibility", _jsxs("select", { name: "visibility", defaultValue: props.room.visibility ?? "public", children: [_jsx("option", { value: "public", children: "Public" }), _jsx("option", { value: "private", children: "Private" })] })] }), _jsx("button", { type: "submit", className: "primary", children: "Save changes" })] }), _jsxs("form", { className: "stack", onSubmit: (event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        api.inviteToRoom(props.roomId, String(form.get("username"))).then(() => {
                            setStatus("Invite sent");
                            event.currentTarget.reset();
                        }).catch((error) => setStatus(error.message));
                    }, children: [_jsxs("label", { children: ["Invite by username", _jsx("input", { name: "username" })] }), _jsx("button", { type: "submit", className: "ghost", children: "Send invite" })] }), _jsx("div", { className: "public-list", children: props.room.members.map((member) => (_jsxs("div", { className: "mini-row", children: [_jsxs("div", { children: [_jsx("strong", { children: member.username }), _jsx("small", { children: member.role })] }), _jsxs("div", { className: "inline-actions", children: [member.role === "member" && _jsx("button", { className: "ghost", onClick: () => api.makeAdmin(props.roomId, member.userId).then(props.onRefresh), children: "Make admin" }), member.role === "admin" && _jsx("button", { className: "ghost", onClick: () => api.removeAdmin(props.roomId, member.userId).then(props.onRefresh), children: "Remove admin" }), member.role !== "owner" && _jsx("button", { className: "ghost", onClick: () => api.removeMember(props.roomId, member.userId).then(props.onRefresh), children: "Ban" })] })] }, member.userId))) }), _jsx("div", { className: "public-list", children: bans.map((ban) => (_jsxs("div", { className: "mini-row", children: [_jsxs("div", { children: [_jsx("strong", { children: String(ban.username) }), _jsxs("small", { children: ["banned by ", String(ban.banned_by_username)] })] }), _jsx("button", { className: "ghost", onClick: () => api.unbanUser(props.roomId, String(ban.user_id)).then(() => api.roomBans(props.roomId).then(setBans)), children: "Unban" })] }, String(ban.user_id)))) }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "ghost", onClick: props.onClose, children: "Close" }), _jsx("button", { className: "danger", onClick: () => api.deleteRoom(props.roomId).then(() => {
                                props.onClose();
                                window.location.reload();
                            }).catch((error) => setStatus(error.message)), children: "Delete room" })] }), _jsx("p", { className: "status-line", children: status })] }) }));
}
export function AppRoot() {
    const me = useQuery({
        queryKey: ["me"],
        queryFn: api.me,
        retry: false
    });
    if (me.isLoading) {
        return _jsx("div", { className: "center-note", children: "Checking session..." });
    }
    if (me.isError) {
        return _jsx(AuthGate, {});
    }
    return _jsx(Dashboard, {});
}
//# sourceMappingURL=AppRoot.js.map