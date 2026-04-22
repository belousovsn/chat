import { useState } from "react";

export function useRoomModalState() {
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [manageRoomOpen, setManageRoomOpen] = useState(false);
  const [roomDirectoryOpen, setRoomDirectoryOpen] = useState(false);

  return {
    closeCreateRoom: () => setCreateRoomOpen(false),
    closeManageRoom: () => setManageRoomOpen(false),
    closeRoomDirectory: () => setRoomDirectoryOpen(false),
    createRoomOpen,
    manageRoomOpen,
    roomDirectoryOpen,
    openCreateRoom: () => setCreateRoomOpen(true),
    openManageRoom: () => setManageRoomOpen(true),
    openRoomDirectory: () => setRoomDirectoryOpen(true)
  };
}
