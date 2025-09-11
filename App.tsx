
import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
import { SettingsLayout } from './components/settings/SettingsLayout.tsx';
import { SettingsProvider, useSettings } from './hooks/useSettings.ts';
import { RemindersProvider, useReminders } from './hooks/useReminders.ts';
import { ConnectionProvider } from './hooks/useConnection.ts';
import { ApiHistoryProvider } from './hooks/useApiHistory.ts';
import { NotificationProvider, useNotifications } from './hooks/useNotifications.ts';
import { QuoteGenerator } from './components/QuoteGenerator.tsx';
import { Logo } from './components/Logo.tsx';
import { Loader } from './components/Loader.tsx';
import { ChatHistoryProvider } from './hooks/useChatHistory.ts';
import { ModalProvider, useModal } from './hooks/useModal.ts';
import { Modal } from './components/Modal.tsx';
import { AlertTriangleIcon, CheckCircleIcon } from './components/icons.tsx';

export type Page = 'chat' | 'settings';

// This component contains the logic to trigger notifications.
// It's placed inside the App component to have access to all necessary contexts.
const NotificationTrigger: React.FC = () => {
    const { reminders } = useReminders();
    const { showNotification, permission, isEnabled } = useNotifications();
    const NOTIFIED_REMINDERS_KEY = 'sativar_isis_notified_reminders';

    React.useEffect(() => {
        if (permission !== 'granted' || !isEnabled) return;

        const now = new Date();
        const overdueReminders = reminders.filter(r => !r.isCompleted && new Date(r.dueDate) <= now);

        if (overdueReminders.length > 0) {
            try {
                const notifiedIds: string[] = JSON.parse(localStorage.getItem(NOTIFIED_REMINDERS_KEY) || '[]');
                const newOverdueReminders = overdueReminders.filter(r => !notifiedIds.includes(r.id));

                if (newOverdueReminders.length > 0) {
                    const firstNewOverdue = newOverdueReminders[0];
                    const remainingCount = newOverdueReminders.length - 1;
                    
                    let title = `Lembrete pendente: ${firstNewOverdue.patientName}`;
                    let body = (firstNewOverdue.tasks && firstNewOverdue.tasks.length > 0 ? firstNewOverdue.tasks[0].text : 'Verifique suas tarefas pendentes.');
                    if (remainingCount > 0) {
                        body += ` E mais ${remainingCount} outro(s).`;
                    }
                    
                    showNotification(title, { body });

                    // Update notified list
                    const updatedNotifiedIds = [...notifiedIds, ...newOverdueReminders.map(r => r.id)];
                    localStorage.setItem(NOTIFIED_REMINDERS_KEY, JSON.stringify(updatedNotifiedIds));
                }
            } catch (error) {
                console.error("Failed to process reminder notifications:", error);
            }
        }
    }, [reminders, permission, isEnabled, showNotification]);

    return null; // This component doesn't render anything visible
};

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#131314] text-gray-300 font-sans">
            <Logo className="h-24 w-24 mb-6" />
            <h1 className="text-3xl font-bold text-white mb-2">SATIVAR - Isis</h1>
            <div className="flex items-center gap-4 mt-4">
                <Loader />
                <p className="text-lg text-gray-400">{message}</p>
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
    const { isInitialSyncing, initialSyncMessage } = useSettings();
    const [currentPage, setCurrentPage] = useState<Page>('chat');

    const handleLogout = () => {
        setCurrentPage('chat'); // Redirect to chat page on logout
    };
    
    if (isInitialSyncing) {
        return <LoadingScreen message={initialSyncMessage} />;
    }

    return (
        <div className="flex h-screen flex-col bg-[#131314] font-sans text-gray-200">
            <Header setCurrentPage={setCurrentPage} currentPage={currentPage} />
            <main className="flex-grow overflow-y-auto">
                {currentPage === 'chat' && (
                <QuoteGenerator />
                )}
                {currentPage === 'settings' && 
                <div className="p-4 md:p-8 h-full">
                    <SettingsLayout onLogout={handleLogout} />
                </div>
                }
            </main>
        </div>
    );
};

const ModalRenderer: React.FC = () => {
  const { modalState, handleClose, handleConfirm } = useModal();

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
}

function App() {
  return (
    <ConnectionProvider>
      <SettingsProvider>
        <RemindersProvider>
          <ApiHistoryProvider>
            <NotificationProvider>
              <ModalProvider>
                <ChatHistoryProvider>
                  <NotificationTrigger />
                  <AppContent />
                  <ModalRenderer />
                </ChatHistoryProvider>
              </ModalProvider>
            </NotificationProvider>
          </ApiHistoryProvider>
        </RemindersProvider>
      </SettingsProvider>
    </ConnectionProvider>
  );
}

export default App;
