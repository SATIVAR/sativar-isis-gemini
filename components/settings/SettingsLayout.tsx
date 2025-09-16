import React, { useState, useEffect } from 'react';
import { SettingsSidebar, type SettingsPageName } from './SettingsSidebar.tsx';
import { AssociationPage } from './AssociationPage.tsx';
import { ApiConfigPage } from './ApiConfigPage.tsx';
import { AdvancedPage } from './ClientsPage.tsx';
import { PromptPage } from './PromptPage.tsx';
import { ApiHistoryPage } from './ApiHistoryPage.tsx';
import { NotificationsPage } from './NotificationsPage.tsx';
import { AdminLogin } from '../AdminLogin.tsx';
import { AdminRegistration } from '../AdminRegistration.tsx';
import { Loader } from '../Loader.tsx';
import { useSettings } from '../../hooks/useSettings.ts';
import { CheckCircleIcon, AlertTriangleIcon, CheckIcon } from '../icons.tsx';
import { useAuth } from '../../hooks/useAuth.ts';
import { UsersPage } from './UsersPage.tsx';
import { SeishatProductsPage } from './ProductsPage.tsx';

interface SettingsLayoutProps {
  onLogout: () => void;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ onLogout }) => {
  const [currentPage, setCurrentPage] = useState<SettingsPageName>('association');
  
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  const { formState, saveSettings, hasUnsavedChanges, validateSettings } = useSettings();
  const auth = useAuth();

  useEffect(() => {
    auth.checkSetup();
  }, [auth.checkSetup]);
  
  // Effect to reset to a valid page if a non-admin user somehow lands on an admin page
  useEffect(() => {
    if (auth.user?.role === 'user') {
        const allowedPagesForUser: SettingsPageName[] = ['association', 'notifications'];
        if (!allowedPagesForUser.includes(currentPage)) {
            setCurrentPage('association');
        }
    }
  }, [currentPage, auth.user?.role]);

  const handleInternalLogout = () => {
    auth.logout();
    onLogout();
  }

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
    switch (currentPage) {
      case 'association':
        return <AssociationPage />;
      case 'users':
        return <UsersPage />;
      case 'products':
        return <SeishatProductsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'advanced':
        return <AdvancedPage />;
      case 'apiHistory':
        return <ApiHistoryPage />;
      case 'prompt':
        return <PromptPage />;
      default:
        return <AssociationPage />;
    }
  };
  
  if (auth.isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader />
        </div>
      );
  }

  if (!auth.isAdminSetup) {
    return <AdminRegistration onRegistrationSuccess={auth.checkSetup} />
  }

  if (!auth.isAuthenticated) {
    return <AdminLogin />
  }


  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      <SettingsSidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        onLogout={handleInternalLogout}
        userRole={auth.user.role}
      />
      <div className="flex-grow overflow-y-auto">
        {renderPage()}
      </div>

      {/* Floating Save Button Container */}
      <div 
        className={`fixed bottom-8 right-0 left-0 md:left-auto flex justify-center md:right-8 z-50 transition-all duration-300 ease-in-out ${
          (hasUnsavedChanges || showSavedToast || showErrorToast) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'
        }`}
      >
        <div className="relative">
            {/* Save Button */}
            {hasUnsavedChanges && !showErrorToast && (
                 <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center justify-center w-14 h-14 bg-green-600 text-white rounded-full shadow-2xl hover:bg-green-700 transition-transform hover:scale-105 disabled:opacity-70 disabled:cursor-wait"
                    aria-label="Salvar alterações"
                >
                    {isSaving ? <Loader /> : <CheckIcon className="w-7 h-7" />}
                </button>
            )}
            {/* Saved Confirmation Toast */}
            {showSavedToast && (
                <div className="flex items-center gap-3 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-2xl border border-green-500/50" role="status">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span className="font-semibold text-sm">Alterações salvas!</span>
                </div>
            )}
            {/* Error Toast */}
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