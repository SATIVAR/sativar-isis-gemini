import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuoteGenerator } from './components/QuoteGenerator';
import { SettingsPage } from './components/SettingsPage';
import { AdminLogin } from './components/AdminLogin';
import { AdminRegistration } from './components/AdminRegistration';
import { SettingsProvider } from './hooks/useSettings';
import { SimpleRemindersProvider } from './hooks/useSimpleReminders';
import { SimpleToastProvider } from './contexts/SimpleToastContext';

export type Page = 'chat' | 'settings';

const SESSION_STORAGE_KEY = 'sativar_isis_admin_auth';
const ADMIN_STORAGE_KEY = 'sativar_isis_admin_credentials';

function AppSimple() {
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isSuperAdminRegistered, setIsSuperAdminRegistered] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing SATIVAR-ISIS application...');
        
        // Check if a superadmin has been registered
        const adminCreds = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (adminCreds) {
          setIsSuperAdminRegistered(true);
        }

        // Check session storage for active login
        const sessionAuth = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionAuth === 'true' && adminCreds) {
          setIsAdminAuthenticated(true);
        }
        
        console.log('Application initialization completed successfully');
      } catch (error) {
        console.error('Application initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  const handleLoginSuccess = () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    setIsAdminAuthenticated(true);
  };
  
  const handleRegistrationSuccess = () => {
    setIsSuperAdminRegistered(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setIsAdminAuthenticated(false);
    setCurrentPage('chat');
  };

  const renderSettingsContent = () => {
    if (isAdminAuthenticated) {
      return <SettingsPage onLogout={handleLogout} />;
    }
    if (isSuperAdminRegistered) {
      return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
    }
    return <AdminRegistration onRegistrationSuccess={handleRegistrationSuccess} />;
  };

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#131314] font-sans text-gray-200">
        <div className="text-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Inicializando SATIVAR-ISIS</h2>
          <p className="text-gray-400">Configurando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <SimpleToastProvider>
      <SettingsProvider>
        <SimpleRemindersProvider>
          <div className="flex h-screen flex-col bg-[#131314] font-sans text-gray-200">
            <Header setCurrentPage={setCurrentPage} currentPage={currentPage} />
            <main className="flex-grow overflow-y-auto">
              {currentPage === 'chat' && <QuoteGenerator />}
              {currentPage === 'settings' && 
                <div className="p-4 md:p-8 h-full">
                  {renderSettingsContent()}
                </div>
              }
            </main>
          </div>
        </SimpleRemindersProvider>
      </SettingsProvider>
    </SimpleToastProvider>
  );
}

export default AppSimple;