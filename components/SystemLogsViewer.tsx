import React, { useState, useEffect } from 'react';
import { LogStore, LogEntry, ArchiveInfo } from '../utils/logStore';

// Use shared LogEntry from LogStore

interface SystemLogsViewerProps {
  logs: LogEntry[];
  filters: {
    level?: 'info' | 'warn' | 'error' | 'debug';
    search?: string;
    startDate?: Date;
    endDate?: Date;
  };
  onFiltersChange: (filters: SystemLogsViewerProps['filters']) => void;
}

const SystemLogsViewer: React.FC<SystemLogsViewerProps> = ({ 
  logs, 
  filters, 
  onFiltersChange 
}) => {
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>(logs.length ? logs : LogStore.getLogs());
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>(liveLogs);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [archives, setArchives] = useState<ArchiveInfo[]>([]);
  const [selectedArchiveKey, setSelectedArchiveKey] = useState<string>('');

  useEffect(() => {
    // subscribe to log store when external logs not provided
    if (!logs.length) {
      const unsubscribe = LogStore.subscribe((entries) => {
        setLiveLogs(entries);
      });
      setArchives(LogStore.listArchives());
      return () => unsubscribe();
    }
  }, [logs]);

  useEffect(() => {
    let result = [...(logs.length ? logs : liveLogs)];
    
    // Apply level filter
    if (filters.level) {
      result = result.filter(log => log.level === filters.level);
    }
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.context && log.context.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply date filters
    if (filters.startDate) {
      result = result.filter(log => new Date(log.timestamp) >= filters.startDate!);
    }
    
    if (filters.endDate) {
      result = result.filter(log => new Date(log.timestamp) <= filters.endDate!);
    }
    
    // Sort by timestamp descending
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setFilteredLogs(result);
  }, [logs, liveLogs, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value });
  };

  const handleLevelChange = (level: 'info' | 'warn' | 'error' | 'debug' | 'all') => {
    onFiltersChange({ 
      ...filters, 
      level: level === 'all' ? undefined : level 
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'debug':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `logs_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const loadArchive = (key: string) => {
    setSelectedArchiveKey(key);
    const items = LogStore.readArchive(key);
    setLiveLogs(items);
  };

  const deleteArchive = (key: string) => {
    LogStore.deleteArchive(key);
    setArchives(LogStore.listArchives());
    if (selectedArchiveKey === key) {
      setSelectedArchiveKey('');
      setLiveLogs(logs.length ? logs : LogStore.getLogs());
    }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    LogStore.importLogsFromJSON(text);
    setLiveLogs(LogStore.getLogs());
    setArchives(LogStore.listArchives());
    e.target.value = '';
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Visualizador de Logs</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Pesquisar logs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <select
              value={filters.level || 'all'}
              onChange={(e) => handleLevelChange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">Todos os níveis</option>
              <option value="error">Erro</option>
              <option value="warn">Aviso</option>
              <option value="info">Informação</option>
              <option value="debug">Depuração</option>
            </select>
            <button
              onClick={exportLogs}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Exportar
            </button>
            <label className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              Importar
              <input type="file" accept="application/json" onChange={onImport} className="hidden" />
            </label>
          </div>
        </div>
      </div>
      
      <div className="overflow-hidden">
        {archives.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-700">Arquivos de log (arquivados):</span>
              <select
                value={selectedArchiveKey}
                onChange={(e) => loadArchive(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Atual</option>
                {archives.map((a) => (
                  <option key={a.key} value={a.key}>{a.timestamp.toLocaleString()} • {a.count} linhas</option>
                ))}
              </select>
              {selectedArchiveKey && (
                <button onClick={() => deleteArchive(selectedArchiveKey)} className="px-2 py-1 text-sm text-red-700 border border-red-300 rounded-md bg-white hover:bg-red-50">Excluir Arquivo</button>
              )}
            </div>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nível
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mensagem
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contexto
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum log encontrado
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                    <div className="truncate" title={log.message}>
                      {log.message}
                    </div>
                    {log.metadata && (
                      <div className="mt-1 text-xs text-gray-500">
                        Metadata: {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate" title={log.context}>
                      {log.context || '-'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemLogsViewer;
