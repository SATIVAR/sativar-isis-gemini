import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
import { SettingsLayout } from './components/settings/SettingsLayout.tsx';
import { SeishatSettingsLayout } from './components/settings/seishat/SeishatSettingsLayout.tsx';
// FIX: Import the 'useSettings' hook.
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
import { AlertTriangleIcon, BookIcon, BookOpenIcon, BriefcaseIcon, CalendarIcon, CheckCircleIcon, CheckSquareIcon, CoffeeIcon, DollarSignIcon, EditIcon, PersonRunningIcon, PlusIcon, SparklesIcon, SunriseIcon, TableIcon, UtensilsIcon } from './components/icons.tsx';
import { AuthProvider, useAuth } from './hooks/useAuth.ts';
import { TokenUsageProvider } from './hooks/useTokenUsage.ts';
import { OnboardingGuide } from './components/OnboardingGuide.tsx';
import { AdminRegistration } from './components/AdminRegistration.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';

export type Page = 'main' | 'settings';
export type AppMode = 'isis' | 'seishat';

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

const LoadingScreen: React.FC<{ message: string; mode: AppMode }> = ({ message, mode }) => {
    const modeDetails = {
        isis: {
            name: 'Isis Chat',
            icon: <SparklesIcon className="w-5 h-5 text-gray-400" />
        },
        seishat: {
            name: 'Seishat CRM',
            icon: <BriefcaseIcon className="w-5 h-5 text-gray-400" />
        }
    };
    const currentModeDetails = modeDetails[mode];

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#131314] text-gray-300 font-sans">
            <Logo className="h-24 w-24 mb-6" />
            <h1 className="text-3xl font-bold text-white mb-1">SATIVAR</h1>
            <div className="flex items-center gap-2 text-lg text-gray-400 mb-6">
                {currentModeDetails.icon}
                <span>{currentModeDetails.name}</span>
            </div>
            <div className="flex items-center gap-3 mt-4">
                <div className="w-3 h-3 bg-fuchsia-500 rounded-full animate-pulse"></div>
                <p className="text-lg text-gray-400">{message}</p>
            </div>
        </div>
    );
};


const StatusBadge: React.FC<{ status: 'Concluído' | 'Em andamento' | 'Não iniciada' }> = ({ status }) => {
    const statusStyles = {
        'Concluído': 'bg-green-800 text-green-300',
        'Em andamento': 'bg-yellow-800 text-yellow-300',
        'Não iniciada': 'bg-gray-700 text-gray-400',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const SeishatCrm: React.FC = () => {
    const activities = [
        { icon: <SunriseIcon className="w-4 h-4 text-gray-400" />, text: 'Acordar e fazer higiene', status: 'Concluído' as const },
        { icon: <CoffeeIcon className="w-4 h-4 text-gray-400" />, text: 'Tomar café da manhã', status: 'Em andamento' as const },
        { icon: <BookOpenIcon className="w-4 h-4 text-gray-400" />, text: 'Trabalhar ou estudar', status: 'Não iniciada' as const },
        { icon: <UtensilsIcon className="w-4 h-4 text-gray-400" />, text: 'Almoçar', status: 'Não iniciada' as const },
        { icon: <PersonRunningIcon className="w-4 h-4 text-gray-400" />, text: 'Treinar', status: 'Não iniciada' as const },
    ];
    
    const templates = [
        { icon: <BookIcon className="w-6 h-6 text-gray-400" />, title: 'Wiki da vida', author: 'Pelo Notion', image: 'https://i.imgur.com/KFF3fB2.png' },
        { icon: <EditIcon className="w-6 h-6 text-gray-400" />, title: 'Diário', author: 'Pelo Notion', image: 'https://i.imgur.com/lJg0m7A.png' },
        { icon: <CheckSquareIcon className="w-6 h-6 text-gray-400" />, title: 'Lista de tarefas', author: 'Pelo Notion', image: 'https://i.imgur.com/8mP1H4a.png' },
        { icon: <DollarSignIcon className="w-6 h-6 text-gray-400" />, title: 'Orçamento', author: 'Pelo Notion', image: 'https://i.imgur.com/qE4Jc8E.png' },
    ];

    const DashboardSectionTitle: React.FC<{ title: string; icon: React.ReactNode; }> = ({ title, icon }) => (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3 px-1">
            {icon}
            <h2 className="font-semibold">{title}</h2>
        </div>
    );

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 text-gray-300 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                <section>
                    <DashboardSectionTitle title="Próximos eventos" icon={<CalendarIcon className="w-5 h-5" />} />
                    <div className="bg-[#202124] rounded-lg p-12 flex flex-col items-center justify-center text-center border border-gray-700/50 min-h-[200px]">
                        <div className="relative mb-4">
                            <CalendarIcon className="w-16 h-16 text-gray-500" />
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[30%] text-lg font-bold text-gray-500">14</span>
                        </div>
                        <p className="text-gray-400 mb-3">Não há eventos nos próximos 3 dias</p>
                        <button className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 rounded-md transition-colors">
                            <PlusIcon className="w-4 h-4" />
                            Novo evento
                        </button>
                    </div>
                </section>
                
                <section>
                    <DashboardSectionTitle title="Visualizações da página inicial" icon={<TableIcon className="w-5 h-5" />} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 bg-[#202124] rounded-lg p-6 flex flex-col items-start justify-center text-left border border-gray-700/50 h-full">
                            <TableIcon className="w-12 h-12 text-gray-500 mb-4" />
                            <p className="text-gray-400 text-sm mb-4">Fixe uma visualização da base de dados para que você possa acessá-la rapidamente na página inicial.</p>
                            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                Selecionar base de dados
                            </button>
                        </div>
                        <div className="lg:col-span-2 bg-[#202124] rounded-lg p-6 border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-sm text-gray-400">Atividade</h3>
                                <h3 className="font-semibold text-sm text-gray-400">Status</h3>
                            </div>
                            <ul className="space-y-1">
                                {activities.map((activity, index) => (
                                    <li key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {activity.icon}
                                            <span className="text-sm text-gray-200">{activity.text}</span>
                                        </div>
                                        <StatusBadge status={activity.status} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
                
                <section>
                    <DashboardSectionTitle title="Modelos em destaque" icon={<SparklesIcon className="w-5 h-5" />} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {templates.map((template, index) => (
                             <div key={index} className="bg-[#202124] rounded-lg border border-gray-700/50 cursor-pointer hover:bg-gray-700/30 transition-colors">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        {template.icon}
                                        <h4 className="text-sm font-semibold text-white truncate">{template.title}</h4>
                                    </div>
                                    <p className="text-xs text-gray-500">{template.author}</p>
                                </div>
                                <div className="h-24 bg-gray-800 rounded-b-lg overflow-hidden">
                                     <img src={template.image} alt={template.title} className="w-full h-full object-cover"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};


const AppContent: React.FC = () => {
    const { settings, isInitialSyncing, initialSyncMessage } = useSettings();
    const [currentMode, _setCurrentMode] = useState<AppMode>(
        () => (localStorage.getItem('sativar_app_mode') as AppMode) || 'seishat'
    );
    const [currentPage, setCurrentPage] = useState<Page>('main');
    const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);
    const auth = useAuth();
    const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('sativar_isis_onboarding_complete'));

    const setCurrentMode = (mode: AppMode) => {
        localStorage.setItem('sativar_app_mode', mode);
        _setCurrentMode(mode);
    };

    React.useEffect(() => {
        // If the user role is 'user' and they are trying to access settings, redirect them to main page.
        if (auth.isAuthenticated && auth.user?.role === 'user' && currentPage === 'settings') {
            setCurrentPage('main');
        }
    }, [currentPage, auth.isAuthenticated, auth.user?.role]);
    
    // Effect to enforce Isis mode availability
    React.useEffect(() => {
        if (
            !settings.isIsisAiEnabled &&
            auth.user?.role !== 'admin' &&
            currentMode === 'isis'
        ) {
            setCurrentMode('seishat');
        }
    }, [settings.isIsisAiEnabled, auth.user, currentMode]);

    const handleLogout = () => {
        setCurrentPage('main'); // Redirect to main page on logout
    };
    
    if (isInitialSyncing) {
        return <LoadingScreen message={initialSyncMessage} mode={currentMode} />;
    }

    if (auth.isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (!auth.isAdminSetup) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                <AdminRegistration onRegistrationSuccess={auth.checkSetup} />
            </div>
        );
    }

    if (!auth.isAuthenticated) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                <AdminLogin />
            </div>
        );
    }

    const handleOnboardingComplete = (dontShowAgain: boolean) => {
        if (dontShowAgain) {
            localStorage.setItem('sativar_isis_onboarding_complete', 'true');
        }
        setShowOnboarding(false);
        setCurrentPage('settings');
    };

    const renderMainContent = () => {
        if (currentMode === 'isis') {
            return (
                <QuoteGenerator 
                    isMobileHistoryOpen={isMobileHistoryOpen}
                    setIsMobileHistoryOpen={setIsMobileHistoryOpen}
                />
            );
        }
        if (currentMode === 'seishat') {
            return <SeishatCrm />;
        }
        return null;
    };

    const renderSettingsContent = () => {
        if (auth.user?.role === 'user') return null; // Double-check to prevent rendering

        if (currentMode === 'isis') {
            return <SettingsLayout onLogout={handleLogout} />;
        }
        if (currentMode === 'seishat') {
            return <SeishatSettingsLayout onLogout={handleLogout} />;
        }
        return null;
    };

    return (
        <div className="flex h-screen flex-col bg-[#131314] font-sans text-gray-200">
            {showOnboarding && <OnboardingGuide onComplete={handleOnboardingComplete} />}
            <Header 
                setCurrentPage={setCurrentPage} 
                currentPage={currentPage} 
                currentMode={currentMode}
                setCurrentMode={setCurrentMode}
                onToggleMobileHistory={() => setIsMobileHistoryOpen(p => !p)} 
            />
            <main className="flex-grow overflow-hidden">
                {currentPage === 'main' && renderMainContent()}
                {currentPage === 'settings' && (
                    <div className="p-4 md:p-8 h-full">
                        {renderSettingsContent()}
                    </div>
                )}
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
                <AuthProvider>
                  <TokenUsageProvider>
                    <ChatHistoryProvider>
                      <NotificationTrigger />
                      <AppContent />
                      <ModalRenderer />
                    </ChatHistoryProvider>
                  </TokenUsageProvider>
                </AuthProvider>
              </ModalProvider>
            </NotificationProvider>
          </ApiHistoryProvider>
        </RemindersProvider>
      </SettingsProvider>
    </ConnectionProvider>
  );
}

export default App;
