import React, { useState, useEffect } from 'react';
import { syncService } from '../services/database/syncService';
import { fallbackManager } from '../services/database/fallbackManager';
import ConflictResolutionModal from './ConflictResolutionModal';
import { useToast } from '../contexts/ToastContext';

interface Conflict {
  id: string;
  local: any;
  remote: any;
  type: string;
}

const SyncConflictsPanel: React.FC = () => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    setIsLoading(true);
    try {
      const detectedConflicts = await syncService.detectConflicts();
      setConflicts(detectedConflicts);
      
      if (detectedConflicts.length > 0) {
        addToast({
          type: 'warning',
          message: `Foram detectados ${detectedConflicts.length} conflitos de sincronização. Por favor, resolva-os.`
        });
      }
    } catch (error) {
      console.error('Error loading conflicts:', error);
      addToast({
        type: 'error',
        message: 'Erro ao carregar conflitos de sincronização.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveConflict = async (resolution: 'local' | 'remote' | 'merge') => {
    if (!selectedConflict) return;

    try {
      // Handle resolution based on user choice
      switch (resolution) {
        case 'local':
          // Push local version to database
          await syncService.syncWithDatabase();
          addToast({
            type: 'success',
            message: 'Versão local aplicada com sucesso.'
          });
          break;
        case 'remote':
          // Pull remote version to localStorage
          fallbackManager.updateStoredReminder(selectedConflict.remote);
          addToast({
            type: 'success',
            message: 'Versão remota aplicada com sucesso.'
          });
          break;
        case 'merge':
          // Use the existing merge logic
          await syncService.syncWithDatabase();
          addToast({
            type: 'success',
            message: 'Conflito resolvido com mesclagem automática.'
          });
          break;
      }

      // Remove resolved conflict
      setConflicts(prev => prev.filter(c => c.id !== selectedConflict.id));
      
      // Close modal
      setIsModalOpen(false);
      setSelectedConflict(null);
    } catch (error) {
      console.error('Error resolving conflict:', error);
      addToast({
        type: 'error',
        message: 'Erro ao resolver conflito. Por favor, tente novamente.'
      });
    }
  };

  const handleOpenConflict = (conflict: Conflict) => {
    setSelectedConflict(conflict);
    setIsModalOpen(true);
  };

  const handleRefresh = () => {
    loadConflicts();
  };

  if (conflicts.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Conflitos de Sincronização</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="text-gray-500 hover:text-gray-700"
              title="Atualizar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 truncate">
                      {conflict.local?.title || conflict.remote?.title || 'Lembrete sem título'}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      ID: {conflict.id.substring(0, 8)}...
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenConflict(conflict)}
                    className="ml-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Resolver
                  </button>
                </div>
              </div>
            ))}
            
            {conflicts.length === 0 && (
              <p className="text-gray-500 text-center py-2">
                Nenhum conflito encontrado
              </p>
            )}
          </div>
        )}
      </div>
      
      {isModalOpen && selectedConflict && (
        <ConflictResolutionModal
          conflict={selectedConflict}
          onResolve={handleResolveConflict}
          onCancel={() => {
            setIsModalOpen(false);
            setSelectedConflict(null);
          }}
        />
      )}
    </div>
  );
};

export default SyncConflictsPanel;