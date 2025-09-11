
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { Modal } from '../components/Modal.tsx';
import { AlertTriangleIcon, CheckCircleIcon } from '../components/icons.tsx';

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
  
  // FIX: Reconstructed the renderModal function to correctly handle different modal types and use valid JSX.
  const renderModal = () => {
    if (!modalState.isOpen) return null;

    if (modalState.type === 'alert') {
        const { title, message } = modalState.options;
        return (
            <Modal
                title={title}
                onClose={handleClose}
                icon={<CheckCircleIcon className="w-6 h-6 text-fuchsia-400" />}
                footer={
                    <button onClick={handleClose} className="px-5 py-2 bg-fuchsia-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-fuchsia-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-fuchsia-500">
                        OK
                    </button>
                }
            >
                <p>{message}</p>
            </Modal>
        );
    }

    if (modalState.type === 'confirm') {
        const { title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false } = modalState.options;
        const confirmButtonClass = danger
            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            : 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
        
        return (
            <Modal
                title={title}
                onClose={handleClose}
                icon={<AlertTriangleIcon className="w-6 h-6 text-yellow-400" />}
                footer={
                    <>
                        <button onClick={handleClose} className="px-5 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500">
                            {cancelLabel}
                        </button>
                        <button onClick={handleConfirm} className={`px-5 py-2 text-white font-semibold text-sm rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${confirmButtonClass}`}>
                            {confirmLabel}
                        </button>
                    </>
                }
            >
                 <p>{message}</p>
            </Modal>
        );
    }
    
    return null;
  };

  // FIX: Added a return statement to the ModalProvider to render the context provider and the modal itself.
  return (
    <ModalContext.Provider value={{ alert, confirm }}>
      {children}
      {renderModal()}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
