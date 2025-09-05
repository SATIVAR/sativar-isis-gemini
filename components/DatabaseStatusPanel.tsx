import React, { useState, useEffect } from 'react';
import databaseService from '../services/database';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import config from '../config';

interface MigrationStatus {
  version: string;
  description: string;
  appliedAt?: Date;
  status: 'pending' | 'applied' | 'failed';
  error?: string;
}

interface DatabaseStatusPanelProps {
  migrationStatus: MigrationStatus[];
  recentOperations: string[];
}

const DatabaseStatusPanel: React.FC<DatabaseStatusPanelProps> = ({ 
  migrationStatus, 
  recentOperations 
}) => {
  const [connectionStatus, setConnectionStatus] = useState(databaseService.getConnectionStatus());
  const [expandedMigration, setExpandedMigration] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStatus(databaseService.getConnectionStatus());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const toggleMigrationDetails = (version: string) => {
    setExpandedMigration(expandedMigration === version ? null : version);
  };

  const getMigrationStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Status do Banco de Dados</h3>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Connection Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3">Conexão</h4>
            <div className="flex items-center space-x-2">
              <ConnectionStatusIndicator />
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <p>Host: {config.database.host}</p>
              <p>Porta: {config.database.port}</p>
              <p>Banco: {config.database.database}</p>
            </div>
          </div>
          
          {/* Migration Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3">Migrações</h4>
            <div className="flex space-x-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {migrationStatus.filter(m => m.status === 'applied').length}
                </p>
                <p className="text-sm text-gray-600">Aplicadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {migrationStatus.filter(m => m.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-600">Pendentes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {migrationStatus.filter(m => m.status === 'failed').length}
                </p>
                <p className="text-sm text-gray-600">Falhas</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Migration Status Table */}
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Status das Migrações</h4>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Versão
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Descrição
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Aplicada em
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Detalhes</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {migrationStatus.map((migration) => (
                  <React.Fragment key={migration.version}>
                    <tr>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {migration.version}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {migration.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getMigrationStatusColor(migration.status)}`}>
                          {migration.status === 'applied' && 'Aplicada'}
                          {migration.status === 'pending' && 'Pendente'}
                          {migration.status === 'failed' && 'Falha'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {migration.appliedAt ? new Date(migration.appliedAt).toLocaleString() : '-'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => toggleMigrationDetails(migration.version)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {expandedMigration === migration.version ? 'Ocultar' : 'Detalhes'}
                        </button>
                      </td>
                    </tr>
                    {expandedMigration === migration.version && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50">
                          <div className="text-sm text-gray-700">
                            {migration.error ? (
                              <div>
                                <p className="font-medium">Erro:</p>
                                <p className="mt-1 text-red-600">{migration.error}</p>
                              </div>
                            ) : (
                              <p>Nenhum erro registrado para esta migração.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Recent Operations */}
        {recentOperations.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Operações Recentes</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-2">
                {recentOperations.slice(0, 5).map((operation, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    <span className="text-gray-400">•</span> {operation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseStatusPanel;