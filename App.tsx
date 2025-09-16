

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header.tsx';
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
import { AlertTriangleIcon, BarChart2Icon, BellIcon, BriefcaseIcon, CheckCircleIcon, CheckSquareIcon, ChevronDownIcon, ClockIcon, DollarSignIcon, FileCodeIcon, FileTextIcon, LogOutIcon, PlusIcon, SettingsIcon, ShoppingCartIcon, SparklesIcon, StoreIcon, UsersIcon, DatabaseIcon } from './components/icons.tsx';
import { AuthProvider, useAuth } from './hooks/useAuth.ts';
import { TokenUsageProvider } from './hooks/useTokenUsage.ts';
import { OnboardingGuide } from './components/OnboardingGuide.tsx';
import { AdminRegistration } from './components/AdminRegistration.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import type { UserRole, Settings } from './types.ts';

// Import all settings pages
import { SeishatProductsPage } from './components/settings/ProductsPage.tsx';
import { AssociationPage } from './components/settings/AssociationPage.tsx';
import { UsersPage } from './components/settings/UsersPage.tsx';
import { NotificationsPage } from './components/settings/NotificationsPage.tsx';
import { AdvancedPage } from './components/settings/ClientsPage.tsx';
import { PromptPage } from './components/settings/PromptPage.tsx';
import { ApiHistoryPage } from './components/settings/ApiHistoryPage.tsx';


export type AppMode = 'isis' | 'seishat';

// --- Seishat CRM / Settings Components ---

export type SeishatPageName = 
    // General
    | 'association' | 'users' | 'notifications'
    // Seishat
    | 'products' | 'patients' | 'prescribers' | 'documents' | 'orders' | 'expenses' | 'reports'
    // Isis
    | 'prompt' | 'apiHistory' | 'advanced';

interface NavItemProps {
  pageName: SeishatPageName;
  label: string;
  icon: React.ReactElement;
  activePage: SeishatPageName;
  onClick: (page: SeishatPageName) => void;
  disabled?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ pageName, label, icon, activePage, onClick, disabled }) => (
    <button
      onClick={() => !disabled && onClick(pageName)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        activePage === pageName
          ? 'bg-fuchsia-600/20 text-fuchsia-300 font-semibold'
          : disabled 
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
      }`}
      aria-current={activePage === pageName ? 'page' : undefined}
      disabled={disabled}
    >
      {/* FIX: The icon is now passed with its className, so we can render it directly
      instead of using React.cloneElement, which caused a type error. */}
      {icon}
      <span>{label}</span>
      {disabled && <span className="text-xs text-gray-500 ml-auto">(Em breve)</span>}
    </button>
);

type AccordionName = 'general' | 'seishat' | 'isis' | 'none';

const AccordionItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
  isActiveSection: boolean;
}> = ({ label, icon, children, isOpen, onClick, isActiveSection }) => (
  <div>
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActiveSection && !isOpen ? 'bg-fuchsia-600/10 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
      }`}
      aria-expanded={isOpen}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <div
      className={`pl-4 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}
    >
        <div className="border-l border-gray-600/50 flex flex-col gap-1 pl-4 py-1 mt-1">
            {children}
        </div>
    </div>
  </div>
);

interface SeishatSidebarProps {
  activePage: SeishatPageName;
  setActivePage: (page: SeishatPageName) => void;
  onLogout: () => void;
  userRole: UserRole;
  formState: Settings;
  setFormState: React.Dispatch<React.SetStateAction<Settings>>;
}

const SeishatSidebar: React.FC<SeishatSidebarProps> = ({ activePage, setActivePage, onLogout, userRole, formState, setFormState }) => {
    const [openAccordion, setOpenAccordion] = useState<AccordionName>('general');
    
    const handleToggleChange = (name: string, value: boolean) => {
        setFormState(prev => ({ ...prev, [name]: value }));
    };
    
    const generalItems = [
        // FIX: Added className to icons to avoid using React.cloneElement and fix a type error.
        // FIX: Added 'disabled' property to ensure consistent object shape and fix TypeScript error.
        { page: 'association' as SeishatPageName, label: 'Associação', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin', 'manager', 'user'], disabled: false },
        { page: 'users' as SeishatPageName, label: 'Usuários do Sistema', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin'], disabled: false },
        { page: 'notifications' as SeishatPageName, label: 'Notificações', icon: <BellIcon className="w-5 h-5" />, roles: ['admin', 'manager', 'user'], disabled: false },
    ];
    
    const seishatItems = [
        // FIX: Added className to icons to avoid using React.cloneElement and fix a type error.
        // FIX: Added 'disabled' property to ensure consistent object shape and fix TypeScript error.
        { page: 'products' as SeishatPageName, label: 'Produtos', icon: <StoreIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: false },
        { page: 'patients' as SeishatPageName, label: 'Pacientes', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'prescribers' as SeishatPageName, label: 'Prescritores', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'documents' as SeishatPageName, label: 'Documentos', icon: <FileTextIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'orders' as SeishatPageName, label: 'Pedidos', icon: <ShoppingCartIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'expenses' as SeishatPageName, label: 'Despesas', icon: <DollarSignIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'reports' as SeishatPageName, label: 'Relatórios', icon: <BarChart2Icon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
    ];
    
    const isisItems = [
        // FIX: Added className to icons to avoid using React.cloneElement and fix a type error.
        // FIX: Added 'disabled' property to ensure consistent object shape and fix TypeScript error.
        { page: 'prompt' as SeishatPageName, label: 'Prompt do Sistema', icon: <FileCodeIcon className="w-5 h-5" />, roles: ['admin'], disabled: false },
        { page: 'apiHistory' as SeishatPageName, label: 'Log de Chamadas', icon: <ClockIcon className="w-5 h-5" />, roles: ['admin'], disabled: false },
        { page: 'advanced' as SeishatPageName, label: 'Avançado', icon: <DatabaseIcon className="w-5 h-5" />, roles: ['admin'], disabled: false },
    ];

    const handleAccordionClick = (name: AccordionName) => {
      setOpenAccordion(prev => (prev === name ? 'none' : name));
    };

    const isGeneralSectionActive = useMemo(() => generalItems.some(item => item.page === activePage), [activePage]);
    const isSeishatSectionActive = useMemo(() => seishatItems.some(item => item.page === activePage), [activePage]);
    const isIsisSectionActive = useMemo(() => isisItems.some(item => item.page === activePage), [activePage]);

    useEffect(() => {
        if (isGeneralSectionActive) setOpenAccordion('general');
        else if (isSeishatSectionActive) setOpenAccordion('seishat');
        else if (isIsisSectionActive) setOpenAccordion('isis');
    }, [isGeneralSectionActive, isSeishatSectionActive, isIsisSectionActive]);
    
    return (
        <aside className="w-64 flex-shrink-0 bg-[#2d2d30] p-3 flex flex-col font-sans">
            <h2 className="text-lg font-bold text-white px-2 mb-4">Painel de Controle</h2>
            <nav className="flex-grow space-y-3">
                 <AccordionItem
                    label="Geral"
                    icon={<SettingsIcon className="w-5 h-5" />}
                    isOpen={openAccordion === 'general'}
                    onClick={() => handleAccordionClick('general')}
                    isActiveSection={isGeneralSectionActive}
                >
                    {/* FIX: Pass props to NavItem explicitly to match the NavItemProps interface (page -> pageName)
                    and avoid spreading unnecessary props like 'roles'. */}
                    {generalItems.filter(i => i.roles.includes(userRole)).map(item => (
                        <NavItem key={item.page} pageName={item.page} label={item.label} icon={item.icon} disabled={item.disabled} activePage={activePage} onClick={setActivePage} />
                    ))}
                </AccordionItem>

                 <AccordionItem
                    label="Seishat (CRM)"
                    icon={<BriefcaseIcon className="w-5 h-5" />}
                    isOpen={openAccordion === 'seishat'}
                    onClick={() => handleAccordionClick('seishat')}
                    isActiveSection={isSeishatSectionActive}
                >
                    {/* FIX: Pass props to NavItem explicitly to match the NavItemProps interface (page -> pageName)
                    and avoid spreading unnecessary props like 'roles'. */}
                    {seishatItems.filter(i => i.roles.includes(userRole)).map(item => (
                        <NavItem key={item.page} pageName={item.page} label={item.label} icon={item.icon} disabled={item.disabled} activePage={activePage} onClick={setActivePage} />
                    ))}
                </AccordionItem>

                {userRole === 'admin' && (
                     <AccordionItem
                        label="Ísis (IA)"
                        icon={<SparklesIcon className="w-5 h-5" />}
                        isOpen={openAccordion === 'isis'}
                        onClick={() => handleAccordionClick('isis')}
                        isActiveSection={isIsisSectionActive}
                    >
                         {/* FIX: Pass props to NavItem explicitly to match the NavItemProps interface (page -> pageName)
                         and avoid spreading unnecessary props like 'roles'. */}
                         {isisItems.filter(i => i.roles.includes(userRole)).map(item => (
                            <NavItem key={item.page} pageName={item.page} label={item.label} icon={item.icon} disabled={item.disabled} activePage={activePage} onClick={setActivePage} />
                        ))}
                        <div className="mt-2 pt-2 border-t border-gray-600/50">
                            <div className="flex items-center justify-between p-2 rounded-lg text-sm" title="Permite que os usuários acessem as funcionalidades de inteligência artificial.">
                                <label htmlFor="isis-toggle-sidebar" className="flex items-center gap-3 cursor-pointer flex-grow">
                                    <SparklesIcon className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-300">Habilitar Isis</span>
                                </label>
                                <button
                                    type="button"
                                    id="isis-toggle-sidebar"
                                    onClick={() => handleToggleChange('isIsisAiEnabled', !formState.isIsisAiEnabled)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#202124] ${formState.isIsisAiEnabled ? 'bg-green-600' : 'bg-gray-600'}`}
                                    role="switch"
                                    aria-checked={formState.isIsisAiEnabled}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formState.isIsisAiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </AccordionItem>
                )}
            </nav>
            <button onClick={onLogout} className="w-full mt-4 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-900/40 hover:text-red-300 transition-colors">
                <LogOutIcon className="w-5 h-5" />
                Sair
            </button>
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

const SeishatLayout: React.FC<{ onLogout: () => void; }> = ({ onLogout }) => {
    const auth = useAuth();
    const { formState, setFormState, saveSettings, hasUnsavedChanges, validateSettings } = useSettings();
    
    const [activePage, setActivePage] = useState<SeishatPageName>('association');
    const [isSaving, setIsSaving] = useState(false);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [showErrorToast, setShowErrorToast] = useState(false);

    const handleSave = async () => {
        if (!hasUnsavedChanges) return;

        if (!validateSettings(formState)) {
            setShowErrorToast(true);
            setTimeout(() => setShowErrorToast(false), 3000);
            return;
        }

        setIsSaving(true);
        await saveSettings(formState);
        setIsSaving(false);
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 2500);
    };

    const renderPage = () => {
        if (!auth.user) return <Loader />;

        switch (activePage) {
            // General
            case 'association': return <AssociationPage />;
            case 'users': return <UsersPage />;
            case 'notifications': return <NotificationsPage />;
            // Seishat
            case 'products': return <SeishatProductsPage />;
            case 'patients': return <ComingSoon pageName="Pacientes" />;
            case 'prescribers': return <ComingSoon pageName="Prescritores" />;
            case 'documents': return <ComingSoon pageName="Documentos" />;
            case 'orders': return <ComingSoon pageName="Pedidos" />;
            case 'expenses': return <ComingSoon pageName="Despesas" />;
            case 'reports': return <ComingSoon pageName="Relatórios" />;
            // Isis
            case 'prompt': return <PromptPage />;
            case 'apiHistory': return <ApiHistoryPage />;
            case 'advanced': return <AdvancedPage />;
            default: return <AssociationPage />;
        }
    };

    if (!auth.user) return <div className="flex h-full items-center justify-center"><Loader /></div>;

    return (
        <div className="flex h-full">
            <SeishatSidebar 
                activePage={activePage}
                setActivePage={setActivePage}
                onLogout={onLogout}
                userRole={auth.user.role}
                formState={formState}
                setFormState={setFormState}
            />
            <div className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto bg-[#131314]">
                {renderPage()}
            </div>
             <div 
                className={`fixed bottom-8 right-0 left-0 flex justify-center md:right-8 z-50 transition-all duration-300 ease-in-out ${
                (hasUnsavedChanges || showSavedToast || showErrorToast) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'
                }`}
            >
                <div className="relative">
                    {hasUnsavedChanges && !showErrorToast && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center justify-center w-14 h-14 bg-green-600 text-white rounded-full shadow-2xl hover:bg-green-700 transition-transform hover:scale-105 disabled:opacity-70 disabled:cursor-wait"
                            aria-label="Salvar alterações"
                        >
                            {isSaving ? <Loader /> : <CheckSquareIcon className="w-7 h-7" />}
                        </button>
                    )}
                    {showSavedToast && (
                        <div className="flex items-center gap-3 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-2xl border border-green-500/50" role="status">
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            <span className="font-semibold text-sm">Alterações salvas!</span>
                        </div>
                    )}
                    {showErrorToast && (
                        <div className="flex items-center gap-3 bg-red-800 text-white px-6 py-3 rounded-lg shadow-2xl border border-red-500/50" role="alert">
                            <AlertTriangleIcon className="w-5 h-5 text-red-300" />
                            <span className="font-semibold text-sm">Corrija os erros antes de salvar.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

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

                    const updatedNotifiedIds = [...notifiedIds, ...newOverdueReminders.map(r => r.id)];
                    localStorage.setItem(NOTIFIED_REMINDERS_KEY, JSON.stringify(updatedNotifiedIds));
                }
            } catch (error) {
                console.error("Failed to process reminder notifications:", error);
            }
        }
    }, [reminders, permission, isEnabled, showNotification]);

    return null;
};

const LoadingScreen: React.FC<{ message: string; mode: AppMode }> = ({ message, mode }) => {
    const modeDetails = {
        isis: { name: 'Isis Chat', icon: <SparklesIcon className="w-5 h-5 text-gray-400" /> },
        seishat: { name: 'Seishat CRM', icon: <BriefcaseIcon className="w-5 h-5 text-gray-400" /> }
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
    
    React.useEffect(() => {
        if (!settings.isIsisAiEnabled && auth.user?.role !== 'admin' && currentMode === 'isis') {
            setCurrentMode('seishat');
        }
    }, [settings.isIsisAiEnabled, auth.user, currentMode]);
    
    if (isInitialSyncing) {
        return <LoadingScreen message={initialSyncMessage} mode={currentMode} />;
    }

    if (auth.isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader /></div>;
    }

    if (!auth.isAdminSetup) {
        return <div className="flex h-full items-center justify-center p-4"><AdminRegistration onRegistrationSuccess={auth.checkSetup} /></div>;
    }

    if (!auth.isAuthenticated) {
        return <div className="flex h-full items-center justify-center p-4"><AdminLogin /></div>;
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
            return <SeishatLayout onLogout={auth.logout} />;
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
