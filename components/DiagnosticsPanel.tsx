import React, { useEffect, useState } from 'react';
import { recoveryManager } from '../services/database';
import { LogStore } from '../utils/logStore';
import databaseService from '../services/database';
import type { DiagnosticsReport } from '../services/database/types';

interface BackupItem {
  filePath: string;
  checksum: string;
  timestamp: Date;
  type: string;
  recordCount: number;
}

const DiagnosticsPanel: React.FC = () => {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [preview, setPreview] = useState<any>(null);
  const [emergency, setEmergency] = useState<boolean>(false);
  const [opMessage, setOpMessage] = useState<string>('');

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const r = await recoveryManager.quickDiagnostics();
      setReport(r);
      const list = await recoveryManager.listAvailableBackups(50);
      setBackups(list as any);
    } catch (e) {
      setOpMessage('Falha ao obter diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDiagnostics();
  }, []);

  const onSelectBackup = async (path: string) => {
    setSelectedBackup(path);
    if (!path) { setPreview(null); return; }
    const p = await recoveryManager.previewBackup(path);
    setPreview(p as any);
  };

  const onRestoreSelected = async () => {
    if (!selectedBackup) return;
    setOpMessage('Restaurando backup selecionado...');
    const res = await recoveryManager.restoreFromPath(selectedBackup);
    setOpMessage(res.message);
    if (res.success) {
      LogStore.add({ level: 'info', message: 'Backup restaurado', metadata: { path: selectedBackup } });
      await loadDiagnostics();
    }
  };

  const onRestoreLatest = async () => {
    setOpMessage('Restaurando último backup...');
    const res = await recoveryManager.restoreFromLatestBackup();
    setOpMessage(res.message);
    if (res.success) await loadDiagnostics();
  };

  const toggleEmergency = () => {
    if (emergency) recoveryManager.disableEmergencyMode();
    else recoveryManager.enableEmergencyMode();
    setEmergency(!emergency);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Diagnóstico e Recuperação</h2>
        <button onClick={loadDiagnostics} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">Atualizar</button>
      </div>

      {loading && <p className="mt-4 text-gray-600">Carregando...</p>}
      {opMessage && <p className="mt-4 text-sm text-gray-700">{opMessage}</p>}

      {report && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Status</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Conectado: {report.databaseConnected ? 'Sim' : 'Não'}</li>
              <li>Fallback ativo: {report.fallbackModeActive ? 'Sim' : 'Não'}</li>
              <li>Fila fallback: {report.fallbackQueueSize}</li>
              <li>Backup verificado: {report.backup.verified ? 'Sim' : 'Não'}</li>
            </ul>
            <h4 className="mt-4 font-medium text-gray-900">Recomendações</h4>
            <ul className="mt-1 list-disc list-inside text-sm text-gray-700">
              {report.recommendations.length === 0 && <li>Nenhuma recomendação</li>}
              {report.recommendations.map((r, i) => (<li key={i}>{r}</li>))}
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Backups</h3>
            <select value={selectedBackup} onChange={(e) => onSelectBackup(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="">Selecione um backup...</option>
              {backups.map((b) => (
                <option key={b.filePath} value={b.filePath}>{new Date(b.timestamp).toLocaleString()} • {b.type} • {b.recordCount} registros</option>
              ))}
            </select>
            {preview && (
              <div className="mt-3 text-sm text-gray-700">
                <p>Caminho: {preview.filePath}</p>
                <p>Existe no disco: {preview.existsOnDisk ? 'Sim' : 'Não'}</p>
                <p>Checksum (DB): {preview.checksumInDb || '-'}</p>
                <p>Checksum (arquivo): {preview.computedChecksum || '-'}</p>
                <p>Verificado: {preview.verified ? 'Sim' : 'Não'}</p>
                <button onClick={onRestoreSelected} className="mt-3 px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">Restaurar selecionado</button>
              </div>
            )}
            <button onClick={onRestoreLatest} className="mt-3 px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">Restaurar último</button>
          </div>
        </div>
      )}

      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Modo de Recuperação de Emergência</h3>
        <p className="text-sm text-gray-700">Ativa funcionalidades reduzidas para manter a operação básica.</p>
        <button onClick={toggleEmergency} className={`mt-3 px-3 py-2 text-sm border rounded-md ${emergency ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-gray-50'}`}>
          {emergency ? 'Desativar modo de emergência' : 'Ativar modo de emergência'}
        </button>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;


