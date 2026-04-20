import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { dashboardQueryKeys } from "../queryKeys";

type UseDashboardDataArgs = {
  publicSearch: string;
  selectedConversationId: string | null;
  setSelectedConversationId: (value: string | null) => void;
};

export function useDashboardData(args: UseDashboardDataArgs) {
  const { publicSearch, selectedConversationId, setSelectedConversationId } = args;

  const me = useQuery({
    queryKey: dashboardQueryKeys.me(),
    queryFn: api.me
  });
  const conversations = useQuery({
    queryKey: dashboardQueryKeys.conversations(),
    queryFn: api.conversations
  });
  const contacts = useQuery({
    queryKey: dashboardQueryKeys.contacts(),
    queryFn: api.contacts
  });
  const sessions = useQuery({
    queryKey: dashboardQueryKeys.sessions(),
    queryFn: api.sessions
  });
  const publicRooms = useQuery({
    queryKey: dashboardQueryKeys.publicRooms(publicSearch),
    queryFn: () => api.publicRooms(publicSearch)
  });
  const conversationDetails = useQuery({
    queryKey: dashboardQueryKeys.conversation(selectedConversationId ?? ""),
    queryFn: () => api.conversation(selectedConversationId!),
    enabled: Boolean(selectedConversationId)
  });
  const messages = useQuery({
    queryKey: dashboardQueryKeys.messages(selectedConversationId ?? ""),
    queryFn: () => api.messages(selectedConversationId!),
    enabled: Boolean(selectedConversationId)
  });

  useEffect(() => {
    if (!selectedConversationId && conversations.data?.[0]) {
      setSelectedConversationId(conversations.data[0].id);
    }
  }, [conversations.data, selectedConversationId, setSelectedConversationId]);

  const selectedSummary = useMemo(
    () => conversations.data?.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations.data, selectedConversationId]
  );

  return {
    contacts,
    conversationDetails,
    conversations,
    me,
    messages,
    publicRooms,
    selectedSummary,
    sessions
  };
}
