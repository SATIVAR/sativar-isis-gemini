import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuoteGenerator } from './components/QuoteGenerator';
import { SettingsPage } from './components/SettingsPage';
import { AdminLogin } from './components/AdminLogin';
import { AdminRegistration } from './components/AdminRegistration';
import { SettingsProvider } from './hooks/useSettings';
import { RemindersProvider } from './hooks/useReminders';
import { ToastProvider } from './contexts/ToastContext';
// Removed problematic imports to prevent loops

export type Page = 'chat' | 'settings';

const SESSION_STORAGE_KEY = 'sativar_isis_admin_auth';
const ADMIN_STORAGE_KEY = 'sativar_isis_admin_credentials';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isSuperAdminRegistered, setIsSuperAdminRegistered] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

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

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#131314] font-sans text-gray-200">
        <div className="text-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Inicializando SATIVAR-ISIS</h2>
          <p className="text-gray-400">Configurando banco de dados e migrando dados...</p>
        </div>
      </div>
    );
  }

  // Show error screen if initialization failed
  if (initializationError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#131314] font-sans text-gray-200">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <div className="rounded-full h-12 w-12 bg-red-500 flex items-center justify-center mx-auto">
              <span className="text-white text-xl">!</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-red-400">Erro na Inicialização</h2>
          <p className="text-gray-400 mb-4">{initializationError}</p>
          <div className="mb-4">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-2"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={() => {
                // Clear any stored data that might be causing issues
                localStorage.clear();
                window.location.reload();
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
            >
              Limpar Dados e Reiniciar
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Se o problema persistir, verifique as configurações de conexão com o banco de dados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <SettingsProvider>
        <RemindersProvider>
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
        </RemindersProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}

export default App;