
import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
// import { SettingsLayout } from './components/settings/SettingsLayout.tsx'; // No longer needed
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
import { AlertTriangleIcon, BarChart2Icon, BookIcon, BookOpenIcon, BriefcaseIcon, CalendarIcon, CheckCircleIcon, CheckSquareIcon, ChevronDownIcon, ChevronUpIcon, CoffeeIcon, DollarSignIcon, EditIcon, FileTextIcon, PersonRunningIcon, PlusIcon, ShoppingCartIcon, SparklesIcon, StoreIcon, SunriseIcon, TableIcon, UtensilsIcon, UsersIcon } from './components/icons.tsx';
import { AuthProvider, useAuth } from './hooks/useAuth.ts';
import { TokenUsageProvider } from './hooks/useTokenUsage.ts';
import { OnboardingGuide } from './components/OnboardingGuide.tsx';
import { AdminRegistration } from './components/AdminRegistration.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { SeishatProductsPage } from './components/settings/ProductsPage.tsx';

export type AppMode = 'isis' | 'seishat';

// --- Seishat CRM Components ---

type SeishatPageName = 'products' | 'patients' | 'prescribers' | 'documents' | 'orders' | 'expenses' | 'reports';

interface NavItemProps {
  pageName: SeishatPageName;
  label: string;
  // FIX: Changed icon type from React.ReactNode to React.ReactElement to fix cloneElement typing issues.
  icon: React.ReactElement;
  activePage: SeishatPageName;
  onClick: (page: SeishatPageName) => void;
  disabled?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ pageName, label, icon, activePage, onClick, disabled }) => (
    <button
      onClick={() => !disabled && onClick(pageName)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        activePage === pageName
          ? 'bg-[#4c2a5a] text-white font-semibold'
          : disabled 
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
      }`}
      aria-current={activePage === pageName ? 'page' : undefined}
      disabled={disabled}
    >
      {/* FIX: Using React.cloneElement with a more specific prop type for 'icon' resolves the overload error. The unnecessary type assertion is removed. */}
      {React.cloneElement(icon, { className: `w-5 h-5 ${activePage === pageName ? 'text-[#d973b5]' : ''}` })}
      <span>{label}</span>
      {disabled && <span className="text-xs text-gray-500 ml-auto">(Em breve)</span>}
    </button>
);

interface SeishatSidebarProps {
  activePage: SeishatPageName;
  setActivePage: (page: SeishatPageName) => void;
}

const SeishatSidebar: React.FC<SeishatSidebarProps> = ({ activePage, setActivePage }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const navItems = [
        { page: 'products' as SeishatPageName, label: 'Produtos', icon: <StoreIcon />, disabled: false },
        { page: 'patients' as SeishatPageName, label: 'Pacientes', icon: <UsersIcon />, disabled: true },
        { page: 'prescribers' as SeishatPageName, label: 'Prescritores', icon: <UsersIcon />, disabled: true },
        { page: 'documents' as SeishatPageName, label: 'Documentos', icon: <FileTextIcon />, disabled: true },
        { page: 'orders' as SeishatPageName, label: 'Pedidos', icon: <ShoppingCartIcon />, disabled: true },
        { page: 'expenses' as SeishatPageName, label: 'Despesas', icon: <DollarSignIcon />, disabled: true },
        { page: 'reports' as SeishatPageName, label: 'Relatórios', icon: <BarChart2Icon />, disabled: true },
    ];
    
    return (
        <aside className="w-64 flex-shrink-0 bg-[#2d2d30] p-3 flex flex-col font-sans">
            <button 
                className="w-full flex items-center justify-between p-2 mb-2"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <BriefcaseIcon className="w-5 h-5 text-gray-400" />
                    <span className="font-bold text-sm text-white">Seishat (CRM)</span>
                </div>
                { isExpanded ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
            </button>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-screen' : 'max-h-0'}`}>
                <nav className="flex flex-col gap-1 mt-2">
                    {navItems.map(item => (
                        <NavItem
                            key={item.page}
                            pageName={item.page}
                            label={item.label}
                            icon={item.icon}
                            activePage={activePage}
                            onClick={setActivePage}
                            disabled={item.disabled}
                        />
                    ))}
                </nav>
            </div>
        </aside>
    );
};

const ComingSoon: React.FC<{ pageName: string }> = ({ pageName }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <BriefcaseIcon className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold text-gray-300">Página de {pageName}</h2>
        <p className="mt-2 text-lg">Este módulo estará disponível em breve.</p>
    </div>
);

const SeishatLayout: React.FC = () => {
    const [activePage, setActivePage] = useState<SeishatPageName>('products');

    const renderPage = () => {
        switch (activePage) {
            case 'products':
                return <SeishatProductsPage />;
            case 'patients':
                return <ComingSoon pageName="Pacientes" />;
            case 'prescribers':
                return <ComingSoon pageName="Prescritores" />;
            case 'documents':
                return <ComingSoon pageName="Documentos" />;
            case 'orders':
                return <ComingSoon pageName="Pedidos" />;
            case 'expenses':
                return <ComingSoon pageName="Despesas" />;
            case 'reports':
                return <ComingSoon pageName="Relatórios" />;
            default:
                return <SeishatProductsPage />;
        }
    };

    return (
        <div className="flex h-full">
            <SeishatSidebar activePage={activePage} setActivePage={setActivePage} />
            <div className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto bg-[#131314]">
                {renderPage()}
            </div>
        </div>
    );
};


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


const AppContent: React.FC = () => {
    const { settings, isInitialSyncing, initialSyncMessage } = useSettings();
    const [currentMode, _setCurrentMode] = useState<AppMode>(
        () => (localStorage.getItem('sativar_app_mode') as AppMode) || 'seishat'
    );
    const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);
    const auth = useAuth();
    const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('sativar_isis_onboarding_complete'));

    const setCurrentMode = (mode: AppMode) => {
        localStorage.setItem('sativar_app_mode', mode);
        _setCurrentMode(mode);
    };
    
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
        setCurrentMode('seishat');
    };

    const renderContent = () => {
        if (currentMode === 'isis') {
            return (
                <QuoteGenerator 
                    isMobileHistoryOpen={isMobileHistoryOpen}
                    setIsMobileHistoryOpen={setIsMobileHistoryOpen}
                />
            );
        }
        if (currentMode === 'seishat') {
            return <SeishatLayout />;
        }
        return null;
    };

    return (
        <div className="flex h-screen flex-col bg-[#131314] font-sans text-gray-200">
            {showOnboarding && <OnboardingGuide onComplete={handleOnboardingComplete} />}
            <Header 
                currentMode={currentMode}
                setCurrentMode={setCurrentMode}
                onToggleMobileHistory={() => setIsMobileHistoryOpen(p => !p)} 
            />
            <main className="flex-grow overflow-hidden">
                {renderContent()}
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