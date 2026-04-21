import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "../../features/chat/store";
import { api } from "../../lib/api";
import { ChatPanel } from "./ChatPanel";
import { ConversationSidebar } from "./ConversationSidebar";
import { DashboardToolbar } from "./DashboardToolbar";
import { InfoSidebar, type UtilityPanelMode } from "./InfoSidebar";
import { CreateRoomModal, ManageRoomModal } from "./RoomModals";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardRealtime } from "./hooks/useDashboardRealtime";
import { useRoomModalState } from "./hooks/useRoomModalState";
import { dashboardQueryKeys } from "./queryKeys";

type MobileView = "sidebar" | "chat";

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
  const [mobileView, setMobileView] = useState<MobileView>("sidebar");
  const [publicSearch, setPublicSearch] = useState("");
  const [status, setStatus] = useState("");
  const [utilityPanel, setUtilityPanel] = useState<UtilityPanelMode | null>(null);
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

  useDashboardRealtime({
    latestMessageId: messages.data?.items.at(-1)?.id ?? null,
    queryClient,
    selectedConversationId
  });

  useEffect(() => {
    clearUploadedAttachments();
    setReplyToMessageId(null);
  }, [clearUploadedAttachments, selectedConversationId, setReplyToMessageId]);

  useEffect(() => {
    setMobileView(selectedConversationId ? "chat" : "sidebar");
  }, [selectedConversationId]);

  const selectedConversationTitle = useMemo(() => {
    if (conversationDetails.data?.kind === "direct") {
      return conversationDetails.data.directPeer?.username ?? conversationDetails.data.name;
    }

    return conversationDetails.data?.name ?? "Conversation details";
  }, [conversationDetails.data]);
  const friendIds = useMemo(
    () => new Set((contacts.data?.friends ?? []).map((friend) => friend.id)),
    [contacts.data?.friends]
  );

  const createRoom = useMutation({
    mutationFn: api.createRoom,
    onSuccess: (conversation) => {
      roomModals.closeCreateRoom();
      setSelectedConversationId(conversation.id);
      setStatus("Room created.");
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.publicRoomsRoot() });
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
    },
    onError: (error: Error) => {
      setStatus(error.message);
    }
  });

  const joinRoom = useMutation({
    mutationFn: api.joinRoom,
    onSuccess: (conversation) => {
      setSelectedConversationId(conversation.id);
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.publicRoomsRoot() });
    },
    onError: (error: Error) => {
      setStatus(error.message);
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
  const statusText = status || createRoom.error?.message || sendMessage.error?.message || "Ready";
  const windowTitle = selectedConversationId
    ? `Northstar Chat - ${selectedSummary?.kind === "room" ? `#${selectedConversationTitle}` : selectedConversationTitle}`
    : "Northstar Chat";

  const sendFriendRequestFromRoom = async (username: string) => {
    try {
      await api.sendFriendRequest({ username, message: null });
      setStatus(`Friend request sent to ${username}.`);
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.contacts() });
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const openDirectFromMember = async (userId: string, username: string) => {
    if (userId === me.data?.user.id) {
      return;
    }

    if (!friendIds.has(userId)) {
      setStatus(`Direct chat with ${username} needs friendship first.`);
      return;
    }

    try {
      await createDirect.mutateAsync(userId);
    } catch {
      return;
    }
  };

  if (me.isLoading) {
    return <div className="center-note">Loading chat...</div>;
  }

  return (
    <div className="dashboard oldschool-page live-chat-page">
      <div className="oldschool-window oldschool-bevel live-chat-window">
        <DashboardToolbar
          onOpenCreateRoom={roomModals.openCreateRoom}
          onOpenSettings={() => setUtilityPanel("settings")}
          onOpenSocial={() => setUtilityPanel("social")}
          onSignOut={() => logout.mutate()}
          windowTitle={windowTitle}
        />

        <div className={`workspace oldschool-workspace live-chat-workspace ${mobileView === "chat" ? "show-chat" : "show-sidebar"}`}>
          <ConversationSidebar
            conversations={conversations.data}
            onJoinRoom={(roomId) => joinRoom.mutate(roomId)}
            onOpenCreateRoom={roomModals.openCreateRoom}
            onOpenSocial={() => setUtilityPanel("social")}
            onSelectConversation={(conversationId) => {
              setSelectedConversationId(conversationId);
              setMobileView("chat");
            }}
            publicRooms={publicRooms.data}
            publicSearch={publicSearch}
            requestCount={contacts.data?.requests.length ?? 0}
            selectedConversationId={selectedConversationId}
            setPublicSearch={setPublicSearch}
          />

          <ChatPanel
            addUploadedAttachment={addUploadedAttachment}
            canManageRoom={Boolean(selectedConversationId && selectedSummary?.kind === "room")}
            conversationDetails={conversationDetails.data}
            isSending={sendMessage.isPending}
            meUserId={me.data?.user.id}
            messages={messages.data}
            onBackToList={() => setMobileView("sidebar")}
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
            onOpenDetails={() => setUtilityPanel("social")}
            onOpenManageRoom={roomModals.openManageRoom}
            onRemoveAttachment={removeUploadedAttachment}
            onSendMessage={async (body) => {
              if (!selectedConversationId) {
                return false;
              }
              try {
                await sendMessage.mutateAsync({ conversationId: selectedConversationId, body });
                return true;
              } catch {
                return false;
              }
            }}
            queryClient={queryClient}
            replyToMessageId={replyToMessageId}
            selectedConversationId={selectedConversationId}
            selectedSummary={selectedSummary}
            setReplyToMessageId={setReplyToMessageId}
            showBackButton={mobileView === "chat"}
            uploadedAttachments={uploadedAttachments}
          />

          <aside className="oldschool-members oldschool-bevel live-members-pane">
            <div className="live-members-toolbar">
              {selectedSummary?.kind === "room" ? (
                <button type="button" className="oldschool-button" onClick={roomModals.openManageRoom}>Manage</button>
              ) : (
                <button type="button" className="oldschool-button" onClick={() => setUtilityPanel("social")}>Friends</button>
              )}
            </div>
            <div className="oldschool-pane-title">
              {selectedSummary?.kind === "room" ? "Room members" : "Contact"}
            </div>
            <div className="oldschool-list oldschool-inset compact">
              {conversationDetails.data?.kind === "room" ? conversationDetails.data.members.map((member) => (
                <div
                  key={member.userId}
                  className={`oldschool-member-row ${member.presence}`}
                  onDoubleClick={() => void openDirectFromMember(member.userId, member.username)}
                  title={member.userId === me.data?.user.id ? "You" : friendIds.has(member.userId) ? "Double click to open direct chat." : "Send friend request first."}
                >
                  <span className="oldschool-member-role">{member.role === "owner" ? "~" : member.role === "admin" ? "@" : "+"}</span>
                  <div className="oldschool-member-copy">
                    <strong>{member.username}</strong>
                    <span>{member.presence}</span>
                  </div>
                  {member.userId !== me.data?.user.id && !friendIds.has(member.userId) && (
                    <button
                      type="button"
                      className="oldschool-member-action"
                      onClick={() => void sendFriendRequestFromRoom(member.username)}
                    >
                      Add
                    </button>
                  )}
                </div>
              )) : conversationDetails.data?.kind === "direct" && conversationDetails.data.directPeer ? (
                <div className={`oldschool-member-row ${conversationDetails.data.directPeer.presence}`}>
                  <span className="oldschool-member-role">@</span>
                  <div className="oldschool-member-copy">
                    <strong>{conversationDetails.data.directPeer.username}</strong>
                    <span>{conversationDetails.data.directPeer.presence}</span>
                  </div>
                </div>
              ) : (
                <div className="oldschool-empty-note">No active room.</div>
              )}
            </div>
          </aside>
        </div>

        <div className="oldschool-statusbar live-chat-statusbar">
          <span>{statusText}</span>
          <span>{selectedSummary?.kind === "room" ? `${conversationDetails.data?.memberCount ?? 0} members` : "UTF-8"}</span>
          <span>{selectedConversationId ? "connected" : "desktop draft"}</span>
        </div>
      </div>

      {utilityPanel && (
        <InfoSidebar
          conversationTitle={selectedConversationTitle}
          friends={contacts.data?.friends}
          meUserId={me.data?.user.id}
          members={conversationDetails.data?.members}
          mode={utilityPanel}
          onAcceptFriendRequest={(requestId) => {
            void api.acceptFriendRequest(requestId).then(() => contacts.refetch());
          }}
          onBlockUser={(userId) => {
            if (!window.confirm("Block this user?")) {
              return;
            }

            void api.blockUser(userId).then(async () => {
              setStatus("User blocked.");
              await refreshContactsAndConversations();
            }).catch((error: Error) => setStatus(error.message));
          }}
          onChangeMode={setUtilityPanel}
          onChangePassword={(input, onSuccess) => {
            void api.changePassword(input.currentPassword, input.newPassword).then(() => {
              setStatus("Password changed.");
              onSuccess();
            }).catch((error: Error) => setStatus(error.message));
          }}
          onClose={() => setUtilityPanel(null)}
          onCreateDirect={(userId) => createDirect.mutate(userId)}
          onDeleteAccount={() => {
            void api.deleteAccount().then(() => {
              window.location.reload();
            }).catch((error: Error) => setStatus(error.message));
          }}
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
          onRefreshSessions={() => {
            void sessions.refetch();
          }}
          onRevokeSession={(sessionId) => {
            void api.revokeSession(sessionId).then(() => sessions.refetch());
          }}
          onSendFriendRequest={(input, onSuccess, onError) => {
            void api.sendFriendRequest(input).then(() => {
              setStatus(`Friend request sent to ${input.username}.`);
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
      )}

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
    </div>
  );
}
