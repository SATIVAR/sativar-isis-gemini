import { useState, useEffect } from 'react';
import { syncService } from '../services/database/syncService';
import { fallbackManager } from '../services/database/fallbackManager';
import { toastService } from '../services/toastService';

interface Conflict {
  id: string;
  local: any;
  remote: any;
  type: string;
}

export const useSyncConflicts = () => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<Conflict | null>(null);

  // Check for conflicts when component mounts
  useEffect(() => {
    const checkForConflicts = async () => {
      try {
        const detectedConflicts = await syncService.detectConflicts();
        if (detectedConflicts.length > 0) {
          setConflicts(detectedConflicts);
          // Show notification about conflicts
          toastService.warning(
            `Foram detectados ${detectedConflicts.length} conflitos de sincronização. Por favor, resolva-os.`
          );
        }
      } catch (error) {
        console.error('Error checking for conflicts:', error);
        toastService.error('Erro ao verificar conflitos de sincronização.');
      }
    };

    checkForConflicts();
  }, []);

  const resolveConflict = async (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
    try {
      const conflict = conflicts.find(c => c.id === conflictId);
      if (!conflict) {
        throw new Error('Conflict not found');
      }

      // Handle resolution based on user choice
      switch (resolution) {
        case 'local':
          // Push local version to database
          await syncService.syncWithDatabase();
          break;
        case 'remote':
          // Pull remote version to localStorage
          fallbackManager.updateStoredReminder(conflict.remote);
          break;
        case 'merge':
          // Use the existing merge logic
          await syncService.syncWithDatabase();
          break;
      }

      // Remove resolved conflict
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
      
      // Show success message
      toastService.success('Conflito resolvido com sucesso!');
      
      // Close modal
      setIsConflictModalOpen(false);
      setCurrentConflict(null);
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toastService.error('Erro ao resolver conflito. Por favor, tente novamente.');
    }
  };

  const openConflictModal = (conflict: Conflict) => {
    setCurrentConflict(conflict);
    setIsConflictModalOpen(true);
  };

  const closeConflictModal = () => {
    setIsConflictModalOpen(false);
    setCurrentConflict(null);
  };

  return {
    conflicts,
    isConflictModalOpen,
    currentConflict,
    resolveConflict,
    openConflictModal,
    closeConflictModal
  };
};