

import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import { useReminders } from '../../hooks/useReminders.ts';
import { useModal } from '../../hooks/useModal.ts';
import { apiClient } from '../../services/database/apiClient.ts';
import { DatabaseIcon, ServerIcon, AlertCircleIcon, CheckCircleIcon, WifiIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';

const ConnectionStatusBadge: React.FC<{ isOnline: boolean }> = ({ isOnline }) => (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isOnline ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'bg-red-900/50 text-red-300 border border-red-700/50'}`}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
        {isOnline ? 'Online' : 'Offline'}
    </div>
);

const SeishatDatabaseManager: React.FC = () => {
    const [dbMode, setDbMode] = useState<'sqlite' | 'mysql' | 'loading'>('loading');
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isActivating, setIsActivating] = useState(false);
    const modal = useModal();

    const fetchDbMode = async () => {
        try {
            const { mode } = await apiClient.get<{ mode: 'sqlite' | 'mysql' }>('/settings/seishat/db-mode');
            setDbMode(mode);
        } catch (error) {
            console.error("Failed to fetch DB mode", error);
            setDbMode('sqlite'); // Fallback
        }
    };

    useEffect(() => {
        fetchDbMode();
    }, []);

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await apiClient.post<{ success: boolean; message: string }>('/settings/seishat/test-mysql', {});
            setTestResult(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido.';
            setTestResult({ success: false, message });
        } finally {
            setIsTesting(false);
        }
    };
    
    const handleActivate = async () => {
        const confirmed = await modal.confirm({
            title: 'Ativar Banco de Dados MySQL?',
            message: 'Esta ação irá migrar a estrutura do banco de dados Seishat para o MySQL. Os dados existentes no SQLite não serão transferidos. Esta ação não pode ser facilmente desfeita. Deseja continuar?',
            confirmLabel: 'Ativar MySQL',
            danger: true,
        });

        if (confirmed) {
            setIsActivating(true);
            setTestResult(null);
            try {
                const result = await apiClient.post<{ success: boolean; message: string }>('/settings/seishat/activate-mysql', {});
                setTestResult(result);
                if (result.success) {
                    setDbMode('mysql');
                }
            } catch (error) {
                 const message = error instanceof Error ? error.message : 'Erro desconhecido.';
                 setTestResult({ success: false, message });
            } finally {
                setIsActivating(false);
            }
        }
    };

    if (dbMode === 'loading') {
        return <div className="flex justify-center p-4"><Loader /></div>;
    }

    return (
        <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
                <DatabaseIcon className="w-6 h-6 text-fuchsia-300"/>
                <div>
                    <h3 className="text-lg font-semibold text-fuchsia-300">Banco de Dados do Módulo Seishat</h3>
                    <p className="text-xs text-gray-400">Gerencie a fonte de dados para o CRM (Associados, Produtos, etc.).</p>
                </div>
            </div>

            {dbMode === 'mysql' ? (
                 <div className="flex items-center gap-3 p-4 bg-green-900/40 rounded-lg border border-green-700/50">
                    <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <div>
                         <p className="font-semibold text-white">Modo Atual: MySQL Conectado</p>
                         <p className="text-sm text-gray-400">O módulo Seishat está utilizando o banco de dados MySQL para persistência de dados.</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 p-4 bg-blue-900/40 rounded-lg border border-blue-700/50">
                        <AlertCircleIcon className="w-6 h-6 text-blue-300 flex-shrink-0" />
                        <div>
                             <p className="font-semibold text-white">Modo Atual: SQLite (Local)</p>
                             <p className="text-sm text-gray-400">Este é o modo padrão. Para ambientes de produção ou com múltiplos usuários, recomenda-se a ativação do MySQL.</p>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-700/50 space-y-4">
                        <p className="text-sm text-gray-300">
                            Para ativar o MySQL, certifique-se de que as variáveis de ambiente (`DB_HOST`, `DB_USER`, etc.) estão configuradas no arquivo `.env` do servidor.
                        </p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <button
                                onClick={handleTestConnection}
                                disabled={isTesting || isActivating}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-sm text-white font-medium rounded-lg transition-colors hover:bg-gray-600 disabled:opacity-50 disabled:cursor-wait"
                            >
                                {isTesting ? <Loader /> : <WifiIcon className="w-5 h-5"/>}
                                Testar Conexão MySQL
                            </button>
                             <button
                                onClick={handleActivate}
                                disabled={isActivating || !testResult?.success}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-700 text-sm text-white font-medium rounded-lg transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!testResult?.success ? "Você precisa testar a conexão com sucesso primeiro." : "Ativar MySQL"}
                            >
                                {isActivating ? <Loader /> : <CheckCircleIcon className="w-5 h-5"/>}
                                Ativar Banco de Dados MySQL
                            </button>
                        </div>
                        {testResult && (
                            <div className={`mt-4 p-3 text-sm rounded-lg flex items-center gap-2 ${testResult.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                                {testResult.success ? <CheckCircleIcon className="w-5 h-5" /> : <AlertCircleIcon className="w-5 h-5" />}
                                {testResult.message}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};


// Renamed from ClientsPage to AdvancedPage
export const AdvancedPage: React.FC = () => {
    const { isOnline, isSyncing, settingsSyncQueueCount, forceSyncSettings } = useSettings();
    const { isSyncingReminders, remindersSyncQueueCount, forceSyncReminders } = useReminders();

    const handleForceSync = async () => {
        await forceSyncSettings();
        await forceSyncReminders();
    };
    
    const totalSyncQueueCount = settingsSyncQueueCount + remindersSyncQueueCount;
    const isAnythingSyncing = isSyncing || isSyncingReminders;


    return (
        <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8 space-y-8">
            <div>
                <div className="flex items-center gap-4 mb-2">
                    <DatabaseIcon className="w-8 h-8 text-fuchsia-300" />
                    <h2 className="text-2xl font-bold text-white">Configurações Avançadas</h2>
                </div>
                <p className="text-gray-400">
                    Gerencie a sincronização de dados e a conexão com o banco de dados.
                </p>
            </div>
            
            <SeishatDatabaseManager />

            <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <ServerIcon className="w-6 h-6 text-fuchsia-300"/>
                        <div>
                            <h3 className="text-lg font-semibold text-fuchsia-300">Status de Preservação de Dados</h3>
                            <p className="text-xs text-gray-400">Como seus dados são salvos e sincronizados.</p>
                        </div>
                    </div>
                    <ConnectionStatusBadge isOnline={isOnline} />
                </div>
                
                <div className="p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                    <div className="flex items-start gap-4">
                        {isOnline ? 
                            <ServerIcon className="w-8 h-8 text-green-400 mt-1 flex-shrink-0" /> :
                            <AlertCircleIcon className="w-8 h-8 text-yellow-400 mt-1 flex-shrink-0" />
                        }
                        <div>
                            <p className="font-bold text-white">
                                {isOnline ? 'Modo Online: Servidor Conectado' : 'Modo Offline: Armazenamento Local'}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                {isOnline ? 
                                    'Os dados estão sendo lidos e salvos diretamente no banco de dados do servidor, garantindo segurança e consistência.' :
                                    'A conexão com o servidor foi perdida. Suas alterações estão sendo salvas com segurança no seu navegador e serão sincronizadas assim que a conexão for restaurada.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="pt-4 border-t border-gray-700/50">
                    {totalSyncQueueCount > 0 ? (
                        <div>
                            <h4 className="text-md font-semibold text-gray-300 mb-2">Fila de Sincronização</h4>
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                                <div>
                                    <p className="text-sm text-yellow-300">
                                        <span className="font-bold text-lg">{totalSyncQueueCount}</span> alteraç{totalSyncQueueCount === 1 ? 'ão' : 'ões'} aguardando para sincronizar.
                                    </p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleForceSync}
                                    disabled={!isOnline || isAnythingSyncing}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-700 text-sm text-white font-medium rounded-lg transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-wait"
                                    title={!isOnline ? "Fique online para sincronizar" : ""}
                                >
                                    {isAnythingSyncing ? <Loader /> : null}
                                    {isAnythingSyncing ? 'Sincronizando...' : `Sincronizar Agora`}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h4 className="text-md font-semibold text-gray-300 mb-2">Status da Sincronização</h4>
                             <div className="flex items-center gap-3 p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                                <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
                                <div>
                                     <p className="font-semibold text-white">Dados Sincronizados</p>
                                     <p className="text-sm text-gray-400">Todas as alterações estão salvas no servidor.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};