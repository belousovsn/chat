async function request(path, method = "GET", body, isFormData = false) {
    const init = {
        method,
        credentials: "include"
    };
    if (!isFormData) {
        init.headers = { "Content-Type": "application/json" };
    }
    if (body) {
        init.body = isFormData ? body : JSON.stringify(body);
    }
    const response = await fetch(path, init);
    if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(payload.error ?? "Request failed");
    }
    return response.json();
}
export const api = {
    me: () => request("/api/me"),
    register: (input) => request("/api/auth/register", "POST", input),
    login: (input) => request("/api/auth/login", "POST", input),
    logout: () => request("/api/auth/logout", "POST"),
    forgotPassword: (email) => request("/api/auth/forgot-password", "POST", { email }),
    resetPassword: (token, password) => request("/api/auth/reset-password", "POST", { token, password }),
    changePassword: (currentPassword, newPassword) => request("/api/auth/change-password", "POST", { currentPassword, newPassword }),
    deleteAccount: () => request("/api/me", "DELETE"),
    sessions: () => request("/api/sessions"),
    revokeSession: (sessionId) => request("/api/sessions/revoke", "POST", { sessionId }),
    contacts: () => request("/api/contacts"),
    sendFriendRequest: (input) => request("/api/contacts/requests", "POST", input),
    acceptFriendRequest: (requestId) => request(`/api/contacts/requests/${requestId}/accept`, "POST"),
    removeFriend: (userId) => request(`/api/contacts/${userId}`, "DELETE"),
    blockUser: (userId) => request(`/api/contacts/${userId}/block`, "POST"),
    conversations: () => request("/api/conversations"),
    conversation: (id) => request(`/api/conversations/${id}`),
    publicRooms: (search) => request(`/api/rooms/public${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    createRoom: (input) => request("/api/rooms", "POST", input),
    updateRoom: (id, input) => request(`/api/rooms/${id}`, "PATCH", input),
    joinRoom: (id) => request(`/api/rooms/${id}/join`, "POST"),
    leaveRoom: (id) => request(`/api/rooms/${id}/leave`, "POST"),
    deleteRoom: (id) => request(`/api/rooms/${id}`, "DELETE"),
    inviteToRoom: (id, username) => request(`/api/rooms/${id}/invite`, "POST", { username }),
    roomBans: (id) => request(`/api/rooms/${id}/bans`),
    unbanUser: (roomId, userId) => request(`/api/rooms/${roomId}/bans/${userId}`, "DELETE"),
    makeAdmin: (roomId, userId) => request(`/api/rooms/${roomId}/admins/${userId}`, "POST"),
    removeAdmin: (roomId, userId) => request(`/api/rooms/${roomId}/admins/${userId}`, "DELETE"),
    removeMember: (roomId, userId) => request(`/api/rooms/${roomId}/remove-member/${userId}`, "POST"),
    createDirectConversation: (userId) => request(`/api/directs/${userId}`, "POST"),
    messages: (conversationId, cursor) => request(`/api/conversations/${conversationId}/messages${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    sendMessage: (conversationId, input) => request(`/api/conversations/${conversationId}/messages`, "POST", input),
    editMessage: (messageId, input) => request(`/api/messages/${messageId}`, "PATCH", input),
    deleteMessage: (messageId) => request(`/api/messages/${messageId}`, "DELETE"),
    markRead: (conversationId, input) => request(`/api/conversations/${conversationId}/read`, "POST", input),
    uploadAttachment: (conversationId, file, comment) => {
        const data = new FormData();
        data.append("file", file);
        if (comment) {
            data.append("comment", comment);
        }
        return request(`/api/conversations/${conversationId}/uploads`, "POST", data, true);
    }
};
//# sourceMappingURL=api.js.map