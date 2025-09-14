import React, { useState } from 'react';
import { SeishatSettingsSidebar, type SeishatSettingsPageName } from './SeishatSettingsSidebar.tsx';
import { SeishatProductsPage } from '../ProductsPage.tsx';
import { useAuth } from '../../hooks/useAuth.ts';
import { useSettings } from '../../hooks/useSettings.ts';
import { CheckCircleIcon, AlertTriangleIcon, CheckIcon } from '../icons.tsx';
import { Loader } from '../../Loader.tsx';

interface SeishatSettingsLayoutProps {
  onLogout: () => void;
}

export const SeishatSettingsLayout: React.FC<SeishatSettingsLayoutProps> = ({ onLogout }) => {
  const [currentPage, setCurrentPage] = useState<SeishatSettingsPageName>('products');
  const auth = useAuth();
  const { formState, saveSettings, hasUnsavedChanges, validateSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

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
      case 'products':
        return <SeishatProductsPage />;
      // Add other cases for future pages like patients, prescribers etc.
      default:
        return <SeishatProductsPage />;
    }
  };

  if (!auth.user) {
    return <div className="flex justify-center items-center h-full"><Loader /></div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      <SeishatSettingsSidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        onLogout={handleInternalLogout}
        userRole={auth.user.role}
      />
      <div className="flex-grow overflow-y-auto">
        {renderPage()}
      </div>

       {/* Floating Save Button - only for pages that use it, like manual products */}
      {currentPage === 'products' && (
         <div 
            className={`fixed bottom-8 right-0 left-0 md:left-auto flex justify-center md:right-8 z-50 transition-all duration-300 ease-in-out ${
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
                        {isSaving ? <Loader /> : <CheckIcon className="w-7 h-7" />}
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
      )}
    </div>
  );
};
