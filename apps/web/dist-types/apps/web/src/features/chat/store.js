import { create } from "zustand";
export const useChatStore = create((set) => ({
    selectedConversationId: null,
    replyToMessageId: null,
    uploadedAttachments: [],
    setSelectedConversationId: (value) => set({ selectedConversationId: value }),
    setReplyToMessageId: (value) => set({ replyToMessageId: value }),
    addUploadedAttachment: (value) => set((state) => ({ uploadedAttachments: [...state.uploadedAttachments, value] })),
    clearUploadedAttachments: () => set({ uploadedAttachments: [] }),
    removeUploadedAttachment: (id) => set((state) => ({ uploadedAttachments: state.uploadedAttachments.filter((item) => item.id !== id) }))
}));
//# sourceMappingURL=store.js.map