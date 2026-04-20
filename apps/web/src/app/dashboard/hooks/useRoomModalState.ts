import { useState } from "react";

export function useRoomModalState() {
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [manageRoomOpen, setManageRoomOpen] = useState(false);

  return {
    closeCreateRoom: () => setCreateRoomOpen(false),
    closeManageRoom: () => setManageRoomOpen(false),
    createRoomOpen,
    manageRoomOpen,
    openCreateRoom: () => setCreateRoomOpen(true),
    openManageRoom: () => setManageRoomOpen(true)
  };
}
