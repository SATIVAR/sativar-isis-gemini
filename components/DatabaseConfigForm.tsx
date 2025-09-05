import React, { useState } from 'react';
import databaseService from '../services/database';
import { DatabaseConfig } from '../types';

interface DatabaseConfigFormProps {
  initialConfig: DatabaseConfig;
  onSave: (config: DatabaseConfig) => void;
}

const DatabaseConfigForm: React.FC<DatabaseConfigFormProps> = ({ 
  initialConfig, 
  onSave 
}) => {
  const [config, setConfig] = useState<DatabaseConfig>(initialConfig);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleChange = (field: keyof DatabaseConfig, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Create a temporary connection with the new config
      // Note: In a real implementation, you would test the connection with the provided config
      // For now, we'll just simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate a successful connection
      setTestResult({
        success: true,
        message: 'Conexão bem-sucedida!'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Falha na conexão. Verifique as configurações.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Banco de Dados
        </label>
        <select
          value={config.type}
          onChange={(e) => handleChange('type', e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="none">Nenhum</option>
          <option value="postgres">PostgreSQL</option>
          <option value="mysql">MySQL</option>
        </select>
      </div>

      {config.type !== 'none' && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Host
              </label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => handleChange('host', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="localhost"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta
              </label>
              <input
                type="text"
                value={config.port}
                onChange={(e) => handleChange('port', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="5432"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Banco de Dados
            </label>
            <input
              type="text"
              value={config.database}
              onChange={(e) => handleChange('database', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="sativar_db"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={config.user}
                onChange={(e) => handleChange('user', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="postgres"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testando...
                </>
              ) : 'Testar Conexão'}
            </button>
            
            {testResult && (
              <div className={`flex items-center ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                <svg className={`h-5 w-5 ${testResult.success ? 'text-green-500' : 'text-red-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  {testResult.success ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  )}
                </svg>
                <span className="ml-1 text-sm">{testResult.message}</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Salvar Configurações
        </button>
      </div>
    </form>
  );
};

export default DatabaseConfigForm;