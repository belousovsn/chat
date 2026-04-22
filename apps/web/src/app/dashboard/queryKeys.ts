export const dashboardQueryKeys = {
  contacts: () => ["contacts"] as const,
  conversation: (conversationId: string) => ["conversation", conversationId] as const,
  conversations: () => ["conversations"] as const,
  me: () => ["me"] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  publicRooms: (search: string) => ["public-rooms", search] as const,
  publicRoomsRoot: () => ["public-rooms"] as const,
  sessions: () => ["sessions"] as const,
  xmppStatus: () => ["xmpp-status"] as const
};
