import { useEffect, useRef, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type {
  ChatMessage,
  ContactsResponse,
  PaginatedMessages,
  PresenceSnapshot,
  RoomDetails,
  RoomSummary,
  SocketMessageEnvelope
} from "@chat/shared";
import { api } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import { dashboardQueryKeys } from "../queryKeys";

type UseDashboardRealtimeArgs = {
  latestMessageId: string | null;
  queryClient: QueryClient;
  selectedConversationId: string | null;
};

const upsertMessage = (messages: PaginatedMessages | undefined, message: ChatMessage): PaginatedMessages | undefined => {
  if (!messages) {
    return messages;
  }

  const existingIndex = messages.items.findIndex((item) => item.id === message.id);
  if (existingIndex >= 0) {
    const items = [...messages.items];
    items[existingIndex] = message;
    return { ...messages, items };
  }

  return {
    ...messages,
    items: [...messages.items, message]
  };
};

const removeMessage = (messages: PaginatedMessages | undefined, messageId: string): PaginatedMessages | undefined => {
  if (!messages) {
    return messages;
  }
  return {
    ...messages,
    items: messages.items.filter((item) => item.id !== messageId)
  };
};

const patchPresenceInContacts = (
  contacts: ContactsResponse | undefined,
  presence: PresenceSnapshot
): ContactsResponse | undefined => {
  if (!contacts) {
    return contacts;
  }

  return {
    ...contacts,
    friends: contacts.friends.map((friend) => (
      friend.id === presence.userId
        ? { ...friend, presence: presence.presence }
        : friend
    ))
  };
};

const patchPresenceInSummaries = (
  conversations: RoomSummary[] | undefined,
  presence: PresenceSnapshot
): RoomSummary[] | undefined => {
  if (!conversations) {
    return conversations;
  }

  return conversations.map((conversation) => (
    conversation.directPeer?.id === presence.userId
      ? {
          ...conversation,
          directPeer: {
            ...conversation.directPeer,
            presence: presence.presence
          }
        }
      : conversation
  ));
};

const patchPresenceInDetails = (
  details: RoomDetails | undefined,
  presence: PresenceSnapshot
): RoomDetails | undefined => {
  if (!details) {
    return details;
  }

  return {
    ...details,
    directPeer: details.directPeer?.id === presence.userId
      ? { ...details.directPeer, presence: presence.presence }
      : details.directPeer,
    members: details.members.map((member) => (
      member.userId === presence.userId
        ? { ...member, presence: presence.presence }
        : member
    ))
  };
};

const patchPresenceInMessages = (
  messages: PaginatedMessages | undefined,
  presence: PresenceSnapshot
): PaginatedMessages | undefined => {
  if (!messages) {
    return messages;
  }

  return {
    ...messages,
    items: messages.items.map((message) => (
      message.author.id === presence.userId
        ? {
            ...message,
            author: {
              ...message.author,
              presence: presence.presence
            }
          }
        : message
    ))
  };
};

const patchUnreadInSummaries = (
  conversations: RoomSummary[] | undefined,
  conversationId: string,
  unreadCount: number,
  unreadMentionCount: number
): RoomSummary[] | undefined => {
  if (!conversations) {
    return conversations;
  }

  return conversations.map((conversation) => (
    conversation.id === conversationId
      ? { ...conversation, unreadCount, unreadMentionCount }
      : conversation
  ));
};

export function useDashboardRealtime(args: UseDashboardRealtimeArgs) {
  const [activityTick, setActivityTick] = useState(0);
  const activityTimestampRef = useRef(Date.now());
  const tabIdRef = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `tab-${Date.now()}`);
  const { latestMessageId, queryClient, selectedConversationId } = args;

  useEffect(() => {
    const socket = getSocket();
    const onEvent = (event: SocketMessageEnvelope) => {
      switch (event.type) {
        case "message.created": {
          if (selectedConversationId === event.payload.conversationId) {
            queryClient.setQueryData<PaginatedMessages | undefined>(
              dashboardQueryKeys.messages(event.payload.conversationId),
              (messages) => upsertMessage(messages, event.payload)
            );
          }
          void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
          break;
        }
        case "message.updated": {
          queryClient.setQueryData<PaginatedMessages | undefined>(
            dashboardQueryKeys.messages(event.payload.conversationId),
            (messages) => upsertMessage(messages, event.payload)
          );
          break;
        }
        case "message.deleted": {
          if (selectedConversationId) {
            queryClient.setQueryData<PaginatedMessages | undefined>(
              dashboardQueryKeys.messages(selectedConversationId),
              (messages) => removeMessage(messages, event.payload.messageId)
            );
          }
          void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
          break;
        }
        case "presence.updated": {
          queryClient.setQueryData<ContactsResponse | undefined>(
            dashboardQueryKeys.contacts(),
            (contacts) => patchPresenceInContacts(contacts, event.payload)
          );
          queryClient.setQueryData<RoomSummary[] | undefined>(
            dashboardQueryKeys.conversations(),
            (conversations) => patchPresenceInSummaries(conversations, event.payload)
          );
          if (selectedConversationId) {
            queryClient.setQueryData<RoomDetails | undefined>(
              dashboardQueryKeys.conversation(selectedConversationId),
              (details) => patchPresenceInDetails(details, event.payload)
            );
            queryClient.setQueryData<PaginatedMessages | undefined>(
              dashboardQueryKeys.messages(selectedConversationId),
              (messages) => patchPresenceInMessages(messages, event.payload)
            );
          }
          break;
        }
        case "unread.updated": {
          queryClient.setQueryData<RoomSummary[] | undefined>(
            dashboardQueryKeys.conversations(),
            (conversations) => patchUnreadInSummaries(
              conversations,
              event.payload.conversationId,
              event.payload.unreadCount,
              event.payload.unreadMentionCount
            )
          );
          break;
        }
        case "conversation.updated": {
          void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
          if (selectedConversationId && selectedConversationId === event.payload.id) {
            void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversation(selectedConversationId) });
          }
          break;
        }
      }
    };
    socket.on("chat:event", onEvent);
    return () => {
      socket.off("chat:event", onEvent);
    };
  }, [queryClient, selectedConversationId]);

  useEffect(() => {
    const socket = getSocket();
    const sendActivity = (hasInteraction: boolean) => {
      if (hasInteraction) {
        activityTimestampRef.current = Date.now();
      }

      socket.emit("presence.activity", {
        active: document.visibilityState === "visible",
        tabId: tabIdRef.current,
        timestamp: new Date(activityTimestampRef.current).toISOString()
      });
      setActivityTick((value) => value + 1);
    };

    const pingPresence = () => sendActivity(false);
    const noteInteraction = () => sendActivity(true);

    sendActivity(true);
    const interval = window.setInterval(pingPresence, 15_000);
    window.addEventListener("focus", pingPresence);
    document.addEventListener("visibilitychange", pingPresence);
    window.addEventListener("pointerdown", noteInteraction);
    window.addEventListener("keydown", noteInteraction);
    window.addEventListener("scroll", noteInteraction, true);
    window.addEventListener("touchstart", noteInteraction);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", pingPresence);
      document.removeEventListener("visibilitychange", pingPresence);
      window.removeEventListener("pointerdown", noteInteraction);
      window.removeEventListener("keydown", noteInteraction);
      window.removeEventListener("scroll", noteInteraction, true);
      window.removeEventListener("touchstart", noteInteraction);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId || !latestMessageId) {
      return;
    }

    void api.markRead(selectedConversationId, { messageId: latestMessageId })
      .then(() => queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() }))
      .catch(() => undefined);
  }, [latestMessageId, queryClient, selectedConversationId]);

  return activityTick;
}
