import React, { useState, useEffect } from 'react';
import { fallbackManager } from '../services/database/fallbackManager';
import { useReminders } from '../hooks/useReminders';
import { useToast } from '../contexts/ToastContext';

const SyncStatusIndicator: React.FC = () => {
  const [isFallbackMode, setIsFallbackMode] = useState(fallbackManager.isInFallbackMode());
  const [operationCount, setOperationCount] = useState(0);
  const { isSyncing, syncReminders } = useReminders();
  const { addToast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFallbackMode(fallbackManager.isInFallbackMode());
      setOperationCount(fallbackManager.getOperationQueue().length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    try {
      await syncReminders();
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Falha ao sincronizar dados. Por favor, tente novamente.'
      });
    }
  };

  if (!isFallbackMode && operationCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {isFallbackMode ? (
              <div className="w-5 h-5 rounded-full bg-yellow-500"></div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-500"></div>
            )}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {isFallbackMode ? 'Modo Offline' : 'Sincronização Pendente'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {isFallbackMode 
                ? `Operações armazenadas: ${operationCount}` 
                : `${operationCount} operação(ões) aguardando sincronização`}
            </p>
            {isFallbackMode && (
              <div className="mt-3">
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white ${
                    isSyncing 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sincronizando...
                    </>
                  ) : (
                    'Sincronizar Agora'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncStatusIndicator;