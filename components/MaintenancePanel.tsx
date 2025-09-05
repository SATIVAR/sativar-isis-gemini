import React, { useEffect, useMemo, useState } from 'react';
import maintenanceService, { TableStatInfo, SlowQueryInfo } from '../services/database/maintenanceService';
import migrationUtilities from '../services/database/migrationUtilities';
import { toastService } from '../services/toastService';
import { performanceAnalysisService, PerformanceAnalysisReport } from '../services/database/performanceAnalysisService';

const numberFmt = new Intl.NumberFormat();

const MaintenancePanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tableStats, setTableStats] = useState<TableStatInfo[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQueryInfo[]>([]);
  const [days, setDays] = useState<number>(90);
  const [performanceReport, setPerformanceReport] = useState<PerformanceAnalysisReport | null>(null);

  const deadTuplesTotal = useMemo(() => tableStats.reduce((acc, t) => acc + (t.nDeadTup || 0), 0), [tableStats]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [stats, queries] = await Promise.all([
        maintenanceService.tableStats(),
        maintenanceService.slowQueries(20)
      ]);
      setTableStats(stats);
      setSlowQueries(queries);
    } catch (e) {
      toastService.error('Falha ao carregar estatísticas de manutenção');
    } finally {
      setLoading(false);
    }
  };

  const analyzePerformance = async () => {
    setLoading(true);
    try {
      const report = await performanceAnalysisService.analyzePerformance();
      setPerformanceReport(report);
      toastService.success('Análise de desempenho concluída');
    } catch (e) {
      toastService.error('Falha ao analisar desempenho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const runVacuum = async () => {
    setLoading(true);
    const res = await maintenanceService.vacuumAnalyzeAll();
    setLoading(false);
    res.success ? toastService.success(res.message) : toastService.error(res.message);
    void refresh();
  };

  const runReindex = async () => {
    setLoading(true);
    const res = await maintenanceService.reindexAll();
    setLoading(false);
    res.success ? toastService.success(res.message) : toastService.error(res.message);
  };

  const cleanupLogs = async () => {
    setLoading(true);
    const res = await maintenanceService.cleanupOldNotificationLogs(days);
    setLoading(false);
    res.success ? toastService.success(`${res.message} (${res.details?.deleted ?? 0} removidos)`) : toastService.error(res.message);
    void refresh();
  };

  const runMigrationSelfTest = async () => {
    setLoading(true);
    const res = await migrationUtilities.selfTest();
    setLoading(false);
    res.success ? toastService.success(res.message) : toastService.error(res.message);
  };

  const runMaintenanceSelfTest = async () => {
    setLoading(true);
    const res = await maintenanceService.selfTest();
    setLoading(false);
    res.success ? toastService.success(res.message) : toastService.error(res.message);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Manutenção e Otimização</h2>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">Atualizar</button>
          <button onClick={analyzePerformance} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">Analisar Desempenho</button>
        </div>
      </div>

      {loading && <p className="mt-4 text-gray-600">Processando...</p>}

      {performanceReport && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Relatório de Desempenho</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">Conexões</p>
              <p>Total: {performanceReport.connectionStats.totalConnections}</p>
              <p>Ativas: {performanceReport.connectionStats.activeConnections}</p>
              <p>Ociosas: {performanceReport.connectionStats.idleConnections}</p>
            </div>
            <div>
              <p className="font-medium">Tabelas</p>
              <p>Total: {performanceReport.tableSizes.length}</p>
              {performanceReport.databaseSizeMB && (
                <p>Tamanho: {numberFmt.format(performanceReport.databaseSizeMB)} MB</p>
              )}
            </div>
            <div>
              <p className="font-medium">Consultas Lentas</p>
              <p>Encontradas: {performanceReport.slowQueries.length}</p>
            </div>
          </div>
          
          {performanceReport.recommendations.length > 0 && (
            <div className="mt-4">
              <p className="font-medium">Recomendações:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {performanceReport.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm">{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Ações Rápidas</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={runVacuum} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">VACUUM ANALYZE</button>
            <button onClick={runReindex} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">REINDEX</button>
            <div className="flex items-center gap-2">
              <input type="number" min={1} className="w-20 px-2 py-1 text-sm border rounded" value={days} onChange={(e) => setDays(Number(e.target.value))} />
              <button onClick={cleanupLogs} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">Limpar logs &lt; dias</button>
            </div>
            <button onClick={runMigrationSelfTest} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">Testar utilitários de migração</button>
            <button onClick={runMaintenanceSelfTest} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">Testar manutenção</button>
          </div>
          <p className="mt-3 text-sm text-gray-700">Tuplas mortas totais: {numberFmt.format(deadTuplesTotal)}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Consultas Lentas</h3>
          {slowQueries.length === 0 ? (
            <p className="text-sm text-gray-700">Nenhuma informação disponível (extensão pg_stat_statements pode não estar habilitada).</p>
          ) : (
            <div className="overflow-auto max-h-80 text-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-2 text-left">Média (ms)</th>
                    <th className="px-2 py-2 text-left">Chamadas</th>
                    <th className="px-2 py-2 text-left">Linhas</th>
                    <th className="px-2 py-2 text-left">Query</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {slowQueries.map((q, i) => (
                    <tr key={i}>
                      <td className="px-2 py-2">{numberFmt.format(Math.round(q.meanTimeMs))}</td>
                      <td className="px-2 py-2">{numberFmt.format(q.calls)}</td>
                      <td className="px-2 py-2">{numberFmt.format(q.rows)}</td>
                      <td className="px-2 py-2 whitespace-pre-wrap break-all">{q.query.slice(0, 500)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Estatísticas de Tabelas</h3>
        <div className="overflow-auto max-h-96 text-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-2 text-left">Tabela</th>
                <th className="px-2 py-2 text-left">Tuplas vivas</th>
                <th className="px-2 py-2 text-left">Tuplas mortas</th>
                <th className="px-2 py-2 text-left">Seq Scan</th>
                <th className="px-2 py-2 text-left">Idx Scan</th>
                <th className="px-2 py-2 text-left">Últ. Vacuum</th>
                <th className="px-2 py-2 text-left">Últ. Analyze</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableStats.map((t) => (
                <tr key={`${t.schemaname}.${t.relname}`}>
                  <td className="px-2 py-2">{t.schemaname}.{t.relname}</td>
                  <td className="px-2 py-2">{numberFmt.format(t.nLiveTup)}</td>
                  <td className="px-2 py-2">{numberFmt.format(t.nDeadTup)}</td>
                  <td className="px-2 py-2">{numberFmt.format(t.seqScan)}</td>
                  <td className="px-2 py-2">{numberFmt.format(t.idxScan)}</td>
                  <td className="px-2 py-2">{t.lastVacuum ? new Date(t.lastVacuum).toLocaleString() : '-'}</td>
                  <td className="px-2 py-2">{t.lastAnalyze ? new Date(t.lastAnalyze).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePanel;