import React, { useState, useEffect } from 'react';
import databaseService from '../services/database';
import { MigrationStatus, DatabaseConfig } from '../services/database/types';
import { runMigrations } from '../services/database/migrationRunner';
import logger from '../utils/logger';
import DatabaseStatusPanel from './DatabaseStatusPanel';
import DatabaseConfigForm from './DatabaseConfigForm';
import MigrationManager from './MigrationManager';
import SystemLogsViewer from './SystemLogsViewer';
import DiagnosticsPanel from './DiagnosticsPanel';
import MaintenancePanel from './MaintenancePanel';
import { LogStore } from '../utils/logStore';
import config from '../config';

// Use shared LogEntry from LogStore

const DatabaseAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'migrations' | 'logs' | 'diagnostics' | 'maintenance'>('status');
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus[]>([]);
  const [recentOperations, setRecentOperations] = useState<string[]>([]);
  const [logs, setLogs] = useState(LogStore.getLogs());
  const [logFilters, setLogFilters] = useState({
    levels: ['info', 'warn', 'error', 'debug'],
    search: ''
  });

  // Mock initial migration status
  useEffect(() => {
    setMigrationStatus([
      { version: '001', description: 'Initial schema', status: 'applied', appliedAt: new Date() },
      { version: '002', description: 'Add indexes', status: 'applied', appliedAt: new Date() },
      { version: '003', description: 'Add constraints', status: 'applied', appliedAt: new Date() },
      { version: '004', description: 'Seed data', status: 'applied', appliedAt: new Date() },
    ]);
  }, []);

  // Subscribe to LogStore for live updates
  useEffect(() => {
    const unsubscribe = LogStore.subscribe((entries) => setLogs(entries));
    return () => unsubscribe();
  }, []);

  const handleSaveConfig = async (newConfig: DatabaseConfig) => {
    try {
      // In a real implementation, you would save the config and reconnect
      logger.info('Database configuration saved', newConfig);
      // Show success message
    } catch (error) {
      logger.error('Failed to save database configuration', error);
      // Show error message
    }
  };

  const handleRunMigrations = async () => {
    try {
      await runMigrations();
      logger.info('Migrations completed successfully');
      // Refresh migration status
    } catch (error) {
      logger.error('Failed to run migrations', error);
      // Show error message
    }
  };

  const handleRollback = async (version: string) => {
    try {
      // In a real implementation, you would rollback to the specified version
      logger.info(`Rolling back to version ${version}`);
      // Show success message
    } catch (error) {
      logger.error(`Failed to rollback to version ${version}`, error);
      // Show error message
    }
  };

  const handleLogFiltersChange = (newFilters: typeof logFilters) => {
    setLogFilters(newFilters);
  };

  // Mock initial config
  const initialConfig: DatabaseConfig = {
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Painel de Administração do Banco de Dados</h1>
        <p className="mt-2 text-gray-600">
          Gerencie as configurações, migrações e monitoramento do banco de dados.
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('status')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'status'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configuração
          </button>
          <button
            onClick={() => setActiveTab('migrations')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'migrations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Migrações
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Logs
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'diagnostics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Diagnóstico
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'maintenance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Manutenção
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'status' && (
          <DatabaseStatusPanel 
            migrationStatus={migrationStatus} 
            recentOperations={recentOperations} 
          />
        )}

        {activeTab === 'config' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuração do Banco de Dados</h2>
            <DatabaseConfigForm 
              initialConfig={initialConfig} 
              onSave={handleSaveConfig} 
            />
          </div>
        )}

        {activeTab === 'migrations' && (
          <MigrationManager 
            migrations={migrationStatus} 
            onRunMigrations={handleRunMigrations}
            onRollback={handleRollback}
          />
        )}

        {activeTab === 'logs' && (
          <SystemLogsViewer 
            logs={logs} 
            filters={logFilters} 
            onFiltersChange={handleLogFiltersChange} 
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsPanel />
        )}

        {activeTab === 'maintenance' && (
          <MaintenancePanel />
        )}
      </div>
    </div>
  );
};

export default DatabaseAdminDashboard;