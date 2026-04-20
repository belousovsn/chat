import { create } from "zustand";

type UploadedAttachment = {
  id: string;
  originalName: string;
  downloadUrl: string;
};

type ChatStore = {
  selectedConversationId: string | null;
  replyToMessageId: string | null;
  uploadedAttachments: UploadedAttachment[];
  setSelectedConversationId: (value: string | null) => void;
  setReplyToMessageId: (value: string | null) => void;
  addUploadedAttachment: (value: UploadedAttachment) => void;
  clearUploadedAttachments: () => void;
  removeUploadedAttachment: (id: string) => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  selectedConversationId: null,
  replyToMessageId: null,
  uploadedAttachments: [],
  setSelectedConversationId: (value) => set({ selectedConversationId: value }),
  setReplyToMessageId: (value) => set({ replyToMessageId: value }),
  addUploadedAttachment: (value) => set((state) => ({ uploadedAttachments: [...state.uploadedAttachments, value] })),
  clearUploadedAttachments: () => set({ uploadedAttachments: [] }),
  removeUploadedAttachment: (id) => set((state) => ({ uploadedAttachments: state.uploadedAttachments.filter((item) => item.id !== id) }))
}));
