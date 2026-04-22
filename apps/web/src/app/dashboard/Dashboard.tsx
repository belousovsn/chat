import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "../../features/chat/store";
import { api } from "../../lib/api";
import { ChatPanel } from "./ChatPanel";
import { ConversationSidebar } from "./ConversationSidebar";
import { DashboardToolbar } from "./DashboardToolbar";
import { InfoSidebar, type UtilityPanelMode } from "./InfoSidebar";
import { CreateRoomModal, ManageRoomModal, RoomDirectoryModal } from "./RoomModals";
import type { ConversationDetails, ConversationMember, ConversationSummary } from "./types";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardRealtime } from "./hooks/useDashboardRealtime";
import { useRoomModalState } from "./hooks/useRoomModalState";
import { dashboardQueryKeys } from "./queryKeys";

type MobileView = "sidebar" | "chat";
type UserMenuActionId = "add" | "ban" | "chat" | "demote" | "poke" | "promote";
type UserMenuState = {
  role: ConversationMember["role"] | null;
  userId: string;
  username: string;
  x: number;
  y: number;
};

const toConversationSummary = (conversation: ConversationDetails): ConversationSummary => ({
  description: conversation.description,
  directPeer: conversation.directPeer,
  id: conversation.id,
  isFrozen: conversation.isFrozen,
  kind: conversation.kind,
  lastMessageAt: conversation.lastMessageAt,
  memberCount: conversation.memberCount,
  name: conversation.name,
  ownerId: conversation.ownerId,
  unreadCount: conversation.unreadCount,
  unreadMentionCount: conversation.unreadMentionCount,
  visibility: conversation.visibility
});

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
  const [userMenu, setUserMenu] = useState<UserMenuState | null>(null);
  const roomModals = useRoomModalState();

  const {
    contacts,
    conversationDetails,
    conversations,
    me,
    messages,
    publicRooms,
    selectedSummary,
    sessions,
    xmppAccount,
    xmppStatus
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

  useEffect(() => {
    setUserMenu(null);
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
  const blockedIds = useMemo(
    () => new Set((contacts.data?.blocked ?? []).map((blocked) => blocked.id)),
    [contacts.data?.blocked]
  );
  const directPeer = conversationDetails.data?.kind === "direct"
    ? conversationDetails.data.directPeer
    : null;
  const roomMembership = useMemo(
    () => conversationDetails.data?.kind === "room"
      ? conversationDetails.data.members.find((member) => member.userId === me.data?.user.id) ?? null
      : null,
    [conversationDetails.data, me.data?.user.id]
  );
  const canManageRoom = Boolean(roomMembership && (roomMembership.role === "owner" || roomMembership.role === "admin"));

  const createRoom = useMutation({
    mutationFn: api.createRoom,
    onSuccess: (conversation) => {
      const summary = toConversationSummary(conversation);

      roomModals.closeCreateRoom();
      roomModals.closeRoomDirectory();
      queryClient.setQueryData(dashboardQueryKeys.conversation(conversation.id), conversation);
      queryClient.setQueryData(dashboardQueryKeys.conversations(), (current: ConversationSummary[] | undefined) => [
        summary,
        ...(current ?? []).filter((item) => item.id !== summary.id)
      ]);
      setSelectedConversationId(conversation.id);
      setMobileView("chat");
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
      const summary = toConversationSummary(conversation);

      roomModals.closeRoomDirectory();
      queryClient.setQueryData(dashboardQueryKeys.conversation(conversation.id), conversation);
      queryClient.setQueryData(dashboardQueryKeys.conversations(), (current: ConversationSummary[] | undefined) => [
        summary,
        ...(current ?? []).filter((item) => item.id !== summary.id)
      ]);
      setSelectedConversationId(conversation.id);
      setMobileView("chat");
      setStatus(`Joined #${conversation.name}.`);
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

  useEffect(() => {
    if (!userMenu) {
      return;
    }

    const closeMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".oldschool-context-menu")) {
        return;
      }
      setUserMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUserMenu(null);
      }
    };
    const closeOnViewportChange = () => setUserMenu(null);

    window.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);

    return () => {
      window.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [userMenu]);

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
      return false;
    }

    if (blockedIds.has(userId)) {
      setStatus(`${username} is blocked. Unblock in Friends to chat again.`);
      return false;
    }

    if (!friendIds.has(userId)) {
      setStatus(`Direct chat with ${username} needs friendship first.`);
      return false;
    }

    try {
      await createDirect.mutateAsync(userId);
      setMobileView("chat");
      setUtilityPanel(null);
      setStatus(`Opened chat with ${username}.`);
      setUserMenu(null);
      return true;
    } catch {
      return false;
    }
  };

  const openUserMenuAt = (
    target: { role?: ConversationMember["role"] | null; userId: string; username: string },
    element: HTMLElement
  ) => {
    if (target.userId === me.data?.user.id) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const menuWidth = 188;
    const viewportWidth = window.innerWidth;
    setUserMenu({
      role: target.role ?? null,
      userId: target.userId,
      username: target.username,
      x: Math.max(8, Math.min(rect.left, viewportWidth - menuWidth - 8)),
      y: rect.bottom + 6
    });
  };

  const refreshSelectedConversation = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.conversations() }),
      invalidateActiveConversation(selectedConversationId)
    ]);
  };

  const sendPoke = async (username: string) => {
    if (!selectedConversationId || !me.data?.user.username) {
      setStatus("Open chat first.");
      return;
    }

    try {
      const message = await api.sendMessage(selectedConversationId, {
        attachmentIds: [],
        body: `${me.data.user.username} poked @${username}`,
        replyToMessageId: null
      });
      await Promise.all([
        refreshSelectedConversation(),
        api.markRead(selectedConversationId, { messageId: message.id })
      ]);
      setStatus(`${username} poked.`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const runRoomMemberAction = async (
    action: () => Promise<unknown>,
    successMessage: string
  ) => {
    try {
      await action();
      await refreshSelectedConversation();
      setStatus(successMessage);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const userMenuActions = useMemo(() => {
    if (!userMenu) {
      return [];
    }

    const actions: Array<{ danger?: boolean; id: UserMenuActionId; label: string }> = [];
    actions.push({ id: "chat", label: "Chat" });
    if (selectedConversationId) {
      actions.push({ id: "poke", label: "Poke" });
    }
    if (!friendIds.has(userMenu.userId)) {
      actions.push({ id: "add", label: "Add friend" });
    }
    if (selectedSummary?.kind === "room" && roomMembership) {
      if (roomMembership.role === "owner" && userMenu.role === "member") {
        actions.push({ id: "promote", label: "Promote" });
      }
      if (userMenu.role === "admin" && (roomMembership.role === "owner" || roomMembership.userId !== userMenu.userId)) {
        actions.push({ id: "demote", label: "Demote" });
      }
      if (
        userMenu.role
        && userMenu.role !== "owner"
        && userMenu.userId !== me.data?.user.id
        && (roomMembership.role === "owner" || userMenu.role === "member")
      ) {
        actions.push({ danger: true, id: "ban", label: "Ban" });
      }
    }
    return actions;
  }, [friendIds, me.data?.user.id, roomMembership, selectedConversationId, selectedSummary?.kind, userMenu]);

  const handleUserMenuAction = async (actionId: UserMenuActionId) => {
    if (!userMenu) {
      return;
    }

    const target = userMenu;
    setUserMenu(null);

    switch (actionId) {
      case "add":
        await sendFriendRequestFromRoom(target.username);
        return;
      case "ban":
        if (!selectedConversationId) {
          return;
        }
        await runRoomMemberAction(
          () => api.removeMember(selectedConversationId, target.userId),
          `${target.username} banned.`
        );
        return;
      case "chat":
        await openDirectFromMember(target.userId, target.username);
        return;
      case "demote":
        if (!selectedConversationId) {
          return;
        }
        await runRoomMemberAction(
          () => api.removeAdmin(selectedConversationId, target.userId),
          `${target.username} demoted.`
        );
        return;
      case "poke":
        await sendPoke(target.username);
        return;
      case "promote":
        if (!selectedConversationId) {
          return;
        }
        await runRoomMemberAction(
          () => api.makeAdmin(selectedConversationId, target.userId),
          `${target.username} promoted.`
        );
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
          onOpenJabber={() => setUtilityPanel("jabber")}
          onOpenRooms={() => {
            setUtilityPanel(null);
            roomModals.openRoomDirectory();
            void publicRooms.refetch();
          }}
          onOpenCreateRoom={() => {
            roomModals.closeRoomDirectory();
            roomModals.openCreateRoom();
          }}
          onOpenSettings={() => setUtilityPanel("settings")}
          onOpenSocial={() => setUtilityPanel("social")}
          onSignOut={() => logout.mutate()}
          showJabber={Boolean(me.data?.user.canViewXmppAdmin || xmppAccount.data?.passwordManaged || xmppAccount.data?.exists)}
          windowTitle={windowTitle}
        />

        <div className={`workspace oldschool-workspace live-chat-workspace ${mobileView === "chat" ? "show-chat" : "show-sidebar"}`}>
          <ConversationSidebar
            conversations={conversations.data}
            onOpenSocial={() => setUtilityPanel("social")}
            onSelectConversation={(conversationId) => {
              setSelectedConversationId(conversationId);
              setMobileView("chat");
            }}
            requestCount={contacts.data?.requests.length ?? 0}
            selectedConversationId={selectedConversationId}
          />

          <ChatPanel
            addUploadedAttachment={addUploadedAttachment}
            canManageRoom={canManageRoom}
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
            onOpenUserMenu={openUserMenuAt}
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
              {selectedSummary?.kind === "room" && canManageRoom ? (
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
                >
                  <span className="oldschool-member-role">{member.role === "owner" ? "~" : member.role === "admin" ? "@" : "+"}</span>
                  {member.userId === me.data?.user.id ? (
                    <div className="oldschool-member-copy">
                      <strong>{member.username}</strong>
                      <span>{member.presence}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="oldschool-member-identity"
                      onClick={(event) => openUserMenuAt(member, event.currentTarget)}
                      title="Open member actions"
                  >
                      <div className="oldschool-member-copy">
                        <strong>{member.username}</strong>
                        <span>{member.presence}</span>
                      </div>
                    </button>
                  )}
                </div>
              )) : directPeer ? (
                <div className={`oldschool-member-row ${directPeer.presence}`}>
                  <span className="oldschool-member-role">@</span>
                  <button
                    type="button"
                    className="oldschool-member-identity"
                    onClick={(event) => openUserMenuAt({
                      role: null,
                      userId: directPeer.id,
                      username: directPeer.username
                    }, event.currentTarget)}
                    title="Open member actions"
                  >
                    <div className="oldschool-member-copy">
                      <strong>{directPeer.username}</strong>
                      <span>{directPeer.presence}</span>
                    </div>
                  </button>
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
          blocked={contacts.data?.blocked}
          conversationTitle={selectedConversationTitle}
          friends={contacts.data?.friends}
          meUserId={me.data?.user.id}
          members={conversationDetails.data?.members}
          mode={utilityPanel}
          onAcceptFriendRequest={(requestId) => {
            void api.acceptFriendRequest(requestId).then(async () => {
              setStatus("Friend request accepted.");
              await contacts.refetch();
            }).catch((error: Error) => setStatus(error.message));
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
              void xmppAccount.refetch();
            }).catch((error: Error) => setStatus(error.message));
          }}
          onClose={() => setUtilityPanel(null)}
          onCreateDirect={async (userId) => {
            const friend = contacts.data?.friends.find((item) => item.id === userId);
            await openDirectFromMember(userId, friend?.username ?? "user");
          }}
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
          onRefreshXmppAccount={() => {
            void xmppAccount.refetch();
          }}
          onRefreshXmpp={() => {
            void xmppStatus.refetch();
          }}
          onProvisionXmppAccount={(currentPassword, onSuccess) => {
            void api.provisionXmppAccount(currentPassword).then(async () => {
              setStatus("Jabber account synced.");
              onSuccess();
              await xmppAccount.refetch();
            }).catch((error: Error) => setStatus(error.message));
          }}
          onRevokeSession={(sessionId) => {
            void api.revokeSession(sessionId).then(async () => {
              setStatus("Session revoked.");
              await sessions.refetch();
            }).catch((error: Error) => setStatus(error.message));
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
          onUnblockUser={(userId) => {
            void api.unblockUser(userId).then(async () => {
              setStatus("User unblocked.");
              await refreshContactsAndConversations();
            }).catch((error: Error) => setStatus(error.message));
          }}
          requests={contacts.data?.requests}
          sessions={sessions.data?.sessions}
          xmppAccount={xmppAccount.data}
          xmppStatus={xmppStatus.data}
        />
      )}

      {roomModals.roomDirectoryOpen && (
        <RoomDirectoryModal
          onClose={roomModals.closeRoomDirectory}
          onJoinRoom={(roomId) => joinRoom.mutate(roomId)}
          onOpenCreateRoom={() => {
            roomModals.closeRoomDirectory();
            roomModals.openCreateRoom();
          }}
          onOpenRoom={(roomId) => {
            roomModals.closeRoomDirectory();
            setSelectedConversationId(roomId);
            setMobileView("chat");
          }}
          onRefreshRooms={() => {
            void publicRooms.refetch();
          }}
          publicRooms={publicRooms.data}
          publicSearch={publicSearch}
          selectedConversationId={selectedConversationId}
          setPublicSearch={setPublicSearch}
        />
      )}

      {userMenu && userMenuActions.length > 0 && (
        <div
          className="oldschool-context-menu oldschool-bevel"
          style={{ left: userMenu.x, top: userMenu.y }}
        >
          <div className="oldschool-context-title">{userMenu.username}</div>
          {userMenuActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`oldschool-context-action ${action.danger ? "danger" : ""}`}
              onClick={() => void handleUserMenuAction(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>
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
