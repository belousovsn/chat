import { api } from "../../lib/api";

export type ContactsData = Awaited<ReturnType<typeof api.contacts>>;
export type ContactBlocked = ContactsData["blocked"][number];
export type ContactFriend = ContactsData["friends"][number];
export type ContactRequest = ContactsData["requests"][number];
export type ConversationDetails = Awaited<ReturnType<typeof api.conversation>>;
export type ConversationMember = ConversationDetails["members"][number];
export type ConversationSummary = Awaited<ReturnType<typeof api.conversations>>[number];
export type PublicRoom = Awaited<ReturnType<typeof api.publicRooms>>[number];
export type RoomBan = Awaited<ReturnType<typeof api.roomBans>>[number];
export type SessionEntry = Awaited<ReturnType<typeof api.sessions>>["sessions"][number];
export type XmppAccount = Awaited<ReturnType<typeof api.xmppAccount>>;
export type XmppStatus = Awaited<ReturnType<typeof api.xmppStatus>>;
