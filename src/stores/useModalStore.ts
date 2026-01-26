import { create } from 'zustand';

export type ModalType = 'info' | 'warning' | 'success' | 'danger';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel?: () => void;
  showCancel: boolean;

  openModal: (params: {
    type?: ModalType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
  }) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>(set => ({
  isOpen: false,
  type: 'info',
  title: '',
  message: '',
  confirmText: '확인',
  cancelText: '취소',
  onConfirm: () => {},
  onCancel: undefined,
  showCancel: true,

  openModal: params =>
    set({
      isOpen: true,
      type: params.type || 'info',
      title: params.title,
      message: params.message,
      confirmText: params.confirmText || '확인',
      cancelText: params.cancelText || '취소',
      onConfirm: params.onConfirm,
      onCancel: params.onCancel,
      showCancel: params.showCancel !== undefined ? params.showCancel : true,
    }),

  closeModal: () => set({ isOpen: false }),
}));
