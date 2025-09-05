import React, { useState } from 'react';
import { runMigrations } from '../services/database/migrationRunner';
import LoadingSpinner from './LoadingSpinner';
import { toastService } from '../services/toastService';

interface Migration {
  version: string;
  description: string;
  appliedAt?: Date;
  status: 'pending' | 'applied' | 'failed';
  error?: string;
}

interface MigrationManagerProps {
  migrations: Migration[];
  onRunMigrations: () => Promise<void>;
  onRollback: (version: string) => Promise<void>;
}

const MigrationManager: React.FC<MigrationManagerProps> = ({ 
  migrations, 
  onRunMigrations,
  onRollback
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedMigration, setSelectedMigration] = useState<string | null>(null);

  const handleRunMigrations = async () => {
    setIsRunning(true);
    try {
      await onRunMigrations();
      toastService.success('Migrações executadas com sucesso!');
    } catch (error) {
      toastService.error('Falha ao executar migrações: ' + (error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRollback = async (version: string) => {
    if (!window.confirm(`Tem certeza que deseja reverter a migração ${version}? Esta ação pode resultar em perda de dados.`)) {
      return;
    }
    
    try {
      await onRollback(version);
      toastService.success(`Migração ${version} revertida com sucesso!`);
    } catch (error) {
      toastService.error('Falha ao reverter migração: ' + (error as Error).message);
    }
  };

  const getStatusColor = (status: string) => {
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

  if (isRunning) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <LoadingSpinner 
          message="Executando migrações do banco de dados..." 
          operation="Migração em andamento"
        />
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Gerenciador de Migrações</h3>
          <button
            onClick={handleRunMigrations}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Executar Migrações Pendentes
          </button>
        </div>
      </div>
      
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
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {migrations.map((migration) => (
              <tr key={migration.version}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                  {migration.version}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {migration.description}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(migration.status)}`}>
                    {migration.status === 'applied' && 'Aplicada'}
                    {migration.status === 'pending' && 'Pendente'}
                    {migration.status === 'failed' && 'Falha'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {migration.appliedAt ? new Date(migration.appliedAt).toLocaleString() : '-'}
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  {migration.status === 'applied' && (
                    <button
                      onClick={() => handleRollback(migration.version)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Reverter
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MigrationManager;