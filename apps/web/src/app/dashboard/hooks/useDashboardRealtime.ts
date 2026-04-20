import { useEffect, useState } from "react";
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
  unreadCount: number
): RoomSummary[] | undefined => {
  if (!conversations) {
    return conversations;
  }

  return conversations.map((conversation) => (
    conversation.id === conversationId
      ? { ...conversation, unreadCount }
      : conversation
  ));
};

export function useDashboardRealtime(args: UseDashboardRealtimeArgs) {
  const [activityTick, setActivityTick] = useState(0);
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
            (conversations) => patchUnreadInSummaries(conversations, event.payload.conversationId, event.payload.unreadCount)
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
    const sendActivity = () => {
      socket.emit("presence.activity", {
        active: document.visibilityState === "visible",
        tabId: "main",
        timestamp: new Date().toISOString()
      });
      setActivityTick((value) => value + 1);
    };

    sendActivity();
    const interval = window.setInterval(sendActivity, 15_000);
    window.addEventListener("focus", sendActivity);
    window.addEventListener("visibilitychange", sendActivity);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", sendActivity);
      window.removeEventListener("visibilitychange", sendActivity);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId || !latestMessageId) {
      return;
    }

    void api.markRead(selectedConversationId, { messageId: latestMessageId }).catch(() => undefined);
  }, [latestMessageId, selectedConversationId]);

  return activityTick;
}
