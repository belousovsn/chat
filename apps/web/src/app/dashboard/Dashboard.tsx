import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "../../features/chat/store";
import { api } from "../../lib/api";
import { ChatPanel } from "./ChatPanel";
import { ConversationSidebar } from "./ConversationSidebar";
import { DashboardToolbar } from "./DashboardToolbar";
import { InfoSidebar } from "./InfoSidebar";
import { CreateRoomModal, ManageRoomModal } from "./RoomModals";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardRealtime } from "./hooks/useDashboardRealtime";
import { useRoomModalState } from "./hooks/useRoomModalState";
import { dashboardQueryKeys } from "./queryKeys";

export function Dashboard() {
  const queryClient = useQueryClient();
  const {
    selectedConversationId,
    setSelectedConversationId,
    replyToMessageId,
    setReplyToMessageId,
    uploadedAttachments,
    addUploadedAttachment,
    clearUploadedAttachments,
    removeUploadedAttachment
  } = useChatStore();
  const [publicSearch, setPublicSearch] = useState("");
  const [status, setStatus] = useState("");
  const roomModals = useRoomModalState();

  const {
    contacts,
    conversationDetails,
    conversations,
    me,
    messages,
    publicRooms,
    selectedSummary,
    sessions
  } = useDashboardData({
    publicSearch,
    selectedConversationId,
    setSelectedConversationId
  });
  const activityTick = useDashboardRealtime({
    latestMessageId: messages.data?.items.at(-1)?.id ?? null,
    queryClient,
    selectedConversationId
  });

  const createRoom = useMutation({
    mutationFn: api.createRoom,
    onSuccess: (conversation) => {
      roomModals.closeCreateRoom();
      setSelectedConversationId(conversation.id);
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
    }
  });

  const sendMessage = useMutation({
    mutationFn: (input: { body: string; conversationId: string }) => api.sendMessage(input.conversationId, {
      body: input.body,
      replyToMessageId,
      attachmentIds: uploadedAttachments.map((item) => item.id)
    }),
    onSuccess: (message) => {
      setReplyToMessageId(null);
      clearUploadedAttachments();
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.messages(message.conversationId) });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
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
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
    }
  });

  const joinRoom = useMutation({
    mutationFn: api.joinRoom,
    onSuccess: (conversation) => {
      setSelectedConversationId(conversation.id);
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.publicRoomsRoot() });
    }
  });

  const invalidateActiveConversation = async (conversationId: string | null) => {
    if (!conversationId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversation(conversationId) }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.messages(conversationId) })
    ]);
  };

  const refreshContactsAndConversations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.contacts() }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.publicRoomsRoot() }),
      invalidateActiveConversation(selectedConversationId)
    ]);
  };

  if (me.isLoading) {
    return <div className="center-note">Loading chat...</div>;
  }

  return (
    <div className="dashboard">
      <DashboardToolbar
        canManageRoom={Boolean(selectedConversationId && selectedSummary?.kind === "room")}
        onOpenCreateRoom={roomModals.openCreateRoom}
        onOpenManageRoom={roomModals.openManageRoom}
        onRefreshContacts={() => {
          void contacts.refetch();
        }}
        onRefreshSessions={() => {
          void sessions.refetch();
        }}
        onSignOut={() => logout.mutate()}
      />

      <div className="workspace">
        <ConversationSidebar
          contacts={contacts.data?.friends}
          conversations={conversations.data}
          onBlockUser={(userId) => {
            if (!window.confirm("Block this user?")) {
              return;
            }

            void api.blockUser(userId).then(async () => {
              setStatus("User blocked.");
              await refreshContactsAndConversations();
            }).catch((error: Error) => setStatus(error.message));
          }}
          onCreateDirect={(userId) => createDirect.mutate(userId)}
          onJoinRoom={(roomId) => joinRoom.mutate(roomId)}
          onRemoveFriend={(userId) => {
            if (!window.confirm("Remove this friend?")) {
              return;
            }

            void api.removeFriend(userId).then(async () => {
              setStatus("Friend removed.");
              await refreshContactsAndConversations();
            }).catch((error: Error) => setStatus(error.message));
          }}
          onRefreshContacts={() => {
            void contacts.refetch();
          }}
          onSelectConversation={setSelectedConversationId}
          publicRooms={publicRooms.data}
          publicSearch={publicSearch}
          selectedConversationId={selectedConversationId}
          setPublicSearch={setPublicSearch}
        />

        <ChatPanel
          activityTick={activityTick}
          addUploadedAttachment={addUploadedAttachment}
          conversationDetails={conversationDetails.data}
          meUserId={me.data?.user.id}
          messages={messages.data}
          onDeleteMessage={async (messageId) => {
            try {
              await api.deleteMessage(messageId);
              setStatus("Message deleted.");
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() }),
                invalidateActiveConversation(selectedConversationId)
              ]);
            } catch (error) {
              setStatus((error as Error).message);
              throw error;
            }
          }}
          onEditMessage={async (messageId, body) => {
            try {
              await api.editMessage(messageId, { body });
              setStatus("Message updated.");
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() }),
                invalidateActiveConversation(selectedConversationId)
              ]);
            } catch (error) {
              setStatus((error as Error).message);
              throw error;
            }
          }}
          onLeaveRoom={async () => {
            if (!selectedConversationId) {
              return;
            }

            try {
              const remainingConversations = await api.leaveRoom(selectedConversationId);
              clearUploadedAttachments();
              setReplyToMessageId(null);
              roomModals.closeManageRoom();
              setSelectedConversationId(remainingConversations[0]?.id ?? null);
              setStatus("Left room.");
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() }),
                queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.publicRoomsRoot() }),
                invalidateActiveConversation(selectedConversationId)
              ]);
            } catch (error) {
              setStatus((error as Error).message);
              throw error;
            }
          }}
          onRemoveAttachment={removeUploadedAttachment}
          onSendMessage={(body) => {
            if (!selectedConversationId) {
              return;
            }
            sendMessage.mutate({ conversationId: selectedConversationId, body });
          }}
          queryClient={queryClient}
          replyToMessageId={replyToMessageId}
          selectedConversationId={selectedConversationId}
          selectedSummary={selectedSummary}
          setReplyToMessageId={setReplyToMessageId}
          uploadedAttachments={uploadedAttachments}
        />

        <InfoSidebar
          meUserId={me.data?.user.id}
          members={conversationDetails.data?.members}
          onAcceptFriendRequest={(requestId) => {
            void api.acceptFriendRequest(requestId).then(() => contacts.refetch());
          }}
          onChangePassword={(input, onSuccess) => {
            void api.changePassword(input.currentPassword, input.newPassword).then(() => {
              setStatus("Password changed.");
              onSuccess();
            }).catch((error: Error) => setStatus(error.message));
          }}
          onDeleteAccount={() => {
            void api.deleteAccount().then(() => {
              window.location.reload();
            }).catch((error: Error) => setStatus(error.message));
          }}
          onRefreshContacts={() => {
            void contacts.refetch();
          }}
          onRefreshSessions={() => {
            void sessions.refetch();
          }}
          onRevokeSession={(sessionId) => {
            void api.revokeSession(sessionId).then(() => sessions.refetch());
          }}
          onSendFriendRequest={(input, onSuccess, onError) => {
            void api.sendFriendRequest(input).then(() => {
              onSuccess();
              contacts.refetch();
            }).catch((error: Error) => {
              setStatus(error.message);
              onError(error);
            });
          }}
          requests={contacts.data?.requests}
          sessions={sessions.data?.sessions}
        />
      </div>

      {roomModals.createRoomOpen && (
        <CreateRoomModal
          onClose={roomModals.closeCreateRoom}
          onCreate={(input) => createRoom.mutate(input)}
        />
      )}

      {roomModals.manageRoomOpen && selectedConversationId && conversationDetails.data && (
        <ManageRoomModal
          roomId={selectedConversationId}
          room={conversationDetails.data}
          onClose={roomModals.closeManageRoom}
          onRefresh={async () => {
            await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversation(selectedConversationId) });
            await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
          }}
        />
      )}

      <div className="status-line">{status || createRoom.error?.message || sendMessage.error?.message}</div>
    </div>
  );
}
