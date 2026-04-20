export const presenceStates = ["online", "afk", "offline"] as const;
export type PresenceState = (typeof presenceStates)[number];

export const conversationKinds = ["room", "direct"] as const;
export type ConversationKind = (typeof conversationKinds)[number];

export const roomVisibilities = ["public", "private"] as const;
export type RoomVisibility = (typeof roomVisibilities)[number];

export const membershipRoles = ["owner", "admin", "member"] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const attachmentKinds = ["image", "file"] as const;
export type AttachmentKind = (typeof attachmentKinds)[number];

export const friendshipStatuses = ["pending", "accepted"] as const;
export type FriendshipStatus = (typeof friendshipStatuses)[number];

export const conversationMemberStatuses = ["active", "left", "banned"] as const;
export type ConversationMemberStatus = (typeof conversationMemberStatuses)[number];
