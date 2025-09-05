import React, { useState } from 'react';

interface ConflictResolutionModalProps {
  conflict: {
    id: string;
    local: any;
    remote: any;
    type: string;
  };
  onResolve: (resolution: 'local' | 'remote' | 'merge') => void;
  onCancel: () => void;
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({ 
  conflict, 
  onResolve, 
  onCancel 
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | 'merge'>('merge');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-yellow-600">Conflito de Sincronização</h3>
            <button 
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-800 mb-4">
              Foram detectadas alterações conflitantes no lembrete "{conflict.local?.title || conflict.remote?.title}". 
              Por favor, escolha como resolver o conflito:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className={`border rounded-lg p-4 ${selectedResolution === 'local' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    id="local"
                    name="resolution"
                    checked={selectedResolution === 'local'}
                    onChange={() => setSelectedResolution('local')}
                    className="mr-2"
                  />
                  <label htmlFor="local" className="font-medium">Versão Local</label>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Última modificação:</strong> {formatDate(conflict.local?.updated_at || conflict.local?.updatedAt)}</p>
                  <p><strong>Tarefas:</strong> {(conflict.local?.tasks || []).length}</p>
                  <p><strong>Status:</strong> {conflict.local?.isCompleted ? 'Concluído' : 'Pendente'}</p>
                </div>
              </div>
              
              <div className={`border rounded-lg p-4 ${selectedResolution === 'remote' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    id="remote"
                    name="resolution"
                    checked={selectedResolution === 'remote'}
                    onChange={() => setSelectedResolution('remote')}
                    className="mr-2"
                  />
                  <label htmlFor="remote" className="font-medium">Versão Remota</label>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Última modificação:</strong> {formatDate(conflict.remote?.updated_at)}</p>
                  <p><strong>Tarefas:</strong> {(conflict.remote?.tasks || []).length}</p>
                  <p><strong>Status:</strong> {conflict.remote?.is_completed ? 'Concluído' : 'Pendente'}</p>
                </div>
              </div>
            </div>
            
            <div className={`border rounded-lg p-4 ${selectedResolution === 'merge' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  id="merge"
                  name="resolution"
                  checked={selectedResolution === 'merge'}
                  onChange={() => setSelectedResolution('merge')}
                  className="mr-2"
                />
                <label htmlFor="merge" className="font-medium">Mesclar Alterações</label>
              </div>
              <p className="text-sm text-gray-600">
                O sistema irá mesclar as alterações, mantendo as informações mais recentes de ambas as versões.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              onClick={() => onResolve(selectedResolution)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Resolver Conflito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;