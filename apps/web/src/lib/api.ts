import type {
  AuthSession,
  ChatMessage,
  ContactsResponse,
  CreateRoomInput,
  EditMessageInput,
  FriendRequestInput,
  LoginInput,
  MarkReadInput,
  PaginatedMessages,
  PublicRoom,
  RegisterInput,
  RoomBan,
  RoomDetails,
  RoomSummary,
  SendMessageInput
} from "@chat/shared";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(path: string, method: HttpMethod = "GET", body?: unknown, isFormData = false): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "include"
  };

  if (!isFormData) {
    init.headers = { "Content-Type": "application/json" };
  }
  if (body) {
    init.body = isFormData ? body as BodyInit : JSON.stringify(body);
  }

  const response = await fetch(path, init);

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(payload.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<AuthSession>("/api/me"),
  register: (input: RegisterInput) => request<AuthSession>("/api/auth/register", "POST", input),
  login: (input: LoginInput) => request<AuthSession>("/api/auth/login", "POST", input),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", "POST"),
  forgotPassword: (email: string) => request<{ ok: boolean }>("/api/auth/forgot-password", "POST", { email }),
  resetPassword: (token: string, password: string) => request<{ ok: boolean }>("/api/auth/reset-password", "POST", { token, password }),
  changePassword: (currentPassword: string, newPassword: string) => request<{ ok: boolean }>("/api/auth/change-password", "POST", { currentPassword, newPassword }),
  deleteAccount: () => request<{ ok: boolean }>("/api/me", "DELETE"),
  sessions: () => request<AuthSession>("/api/sessions"),
  revokeSession: (sessionId: string) => request<AuthSession>("/api/sessions/revoke", "POST", { sessionId }),
  contacts: () => request<ContactsResponse>("/api/contacts"),
  sendFriendRequest: (input: FriendRequestInput) => request("/api/contacts/requests", "POST", input),
  acceptFriendRequest: (requestId: string) => request(`/api/contacts/requests/${requestId}/accept`, "POST"),
  removeFriend: (userId: string) => request(`/api/contacts/${userId}`, "DELETE"),
  blockUser: (userId: string) => request(`/api/contacts/${userId}/block`, "POST"),
  conversations: () => request<RoomSummary[]>("/api/conversations"),
  conversation: (id: string) => request<RoomDetails>(`/api/conversations/${id}`),
  publicRooms: (search?: string) => request<PublicRoom[]>(`/api/rooms/public${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createRoom: (input: CreateRoomInput) => request<RoomDetails>("/api/rooms", "POST", input),
  updateRoom: (id: string, input: Partial<CreateRoomInput>) => request<RoomDetails>(`/api/rooms/${id}`, "PATCH", input),
  joinRoom: (id: string) => request<RoomDetails>(`/api/rooms/${id}/join`, "POST"),
  leaveRoom: (id: string) => request<Array<RoomSummary>>(`/api/rooms/${id}/leave`, "POST"),
  deleteRoom: (id: string) => request<Array<RoomSummary>>(`/api/rooms/${id}`, "DELETE"),
  inviteToRoom: (id: string, username: string) => request<{ ok: boolean }>(`/api/rooms/${id}/invite`, "POST", { username }),
  roomBans: (id: string) => request<RoomBan[]>(`/api/rooms/${id}/bans`),
  unbanUser: (roomId: string, userId: string) => request(`/api/rooms/${roomId}/bans/${userId}`, "DELETE"),
  makeAdmin: (roomId: string, userId: string) => request(`/api/rooms/${roomId}/admins/${userId}`, "POST"),
  removeAdmin: (roomId: string, userId: string) => request(`/api/rooms/${roomId}/admins/${userId}`, "DELETE"),
  removeMember: (roomId: string, userId: string) => request(`/api/rooms/${roomId}/remove-member/${userId}`, "POST"),
  createDirectConversation: (userId: string) => request<RoomDetails>(`/api/directs/${userId}`, "POST"),
  messages: (conversationId: string, cursor?: string) => request<PaginatedMessages>(`/api/conversations/${conversationId}/messages${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  sendMessage: (conversationId: string, input: SendMessageInput) => request<ChatMessage>(`/api/conversations/${conversationId}/messages`, "POST", input),
  editMessage: (messageId: string, input: EditMessageInput) => request<ChatMessage>(`/api/messages/${messageId}`, "PATCH", input),
  deleteMessage: (messageId: string) => request<{ ok: boolean }>(`/api/messages/${messageId}`, "DELETE"),
  markRead: (conversationId: string, input: MarkReadInput) => request<{ ok: boolean }>(`/api/conversations/${conversationId}/read`, "POST", input),
  uploadAttachment: (conversationId: string, file: File, comment?: string) => {
    const data = new FormData();
    data.append("file", file);
    if (comment) {
      data.append("comment", comment);
    }
    return request<ChatMessage["attachments"][number]>(`/api/conversations/${conversationId}/uploads`, "POST", data, true);
  }
};
