
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

interface ModalOptions {
  title: string;
  message: ReactNode;
}

interface ConfirmOptions extends ModalOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // For destructive actions
}

type ModalState =
  | { type: 'alert'; options: ModalOptions; isOpen: true }
  | { type: 'confirm'; options: ConfirmOptions; isOpen: true; resolve: (value: boolean) => void }
  | { isOpen: false };

interface ModalContextType {
  alert: (options: ModalOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  modalState: ModalState;
  handleClose: () => void;
  handleConfirm: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false });

  const alert = useCallback((options: ModalOptions) => {
    setModalState({ type: 'alert', options, isOpen: true });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setModalState({ type: 'confirm', options, isOpen: true, resolve });
    });
  }, []);

  const handleClose = () => {
    if (modalState.isOpen && modalState.type === 'confirm') {
      modalState.resolve(false);
    }
    setModalState({ isOpen: false });
  };

  const handleConfirm = () => {
    if (modalState.isOpen && modalState.type === 'confirm') {
      modalState.resolve(true);
    }
    setModalState({ isOpen: false });
  };

  return React.createElement(ModalContext.Provider, {
    value: { alert, confirm, modalState, handleClose, handleConfirm }
  }, children);
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
