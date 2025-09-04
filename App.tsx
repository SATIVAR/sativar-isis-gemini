import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuoteGenerator } from './components/QuoteGenerator';
import { SettingsPage } from './components/SettingsPage';
import { AdminLogin } from './components/AdminLogin';
import { AdminRegistration } from './components/AdminRegistration';
import { SettingsProvider } from './hooks/useSettings';

export type Page = 'chat' | 'settings';

const SESSION_STORAGE_KEY = 'sativar_isis_admin_auth';
const ADMIN_STORAGE_KEY = 'sativar_isis_admin_credentials';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isSuperAdminRegistered, setIsSuperAdminRegistered] = useState(false);

  useEffect(() => {
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
    setCurrentPage('chat'); // Redirect to chat page on logout
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

  return (
    <SettingsProvider>
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
    </SettingsProvider>
  );
}

export default App;