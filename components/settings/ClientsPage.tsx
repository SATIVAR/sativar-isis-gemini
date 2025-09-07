import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import { useReminders } from '../../hooks/useReminders.ts';
import { DatabaseIcon, BarChart2Icon, ServerIcon, CheckCircleIcon, AlertTriangleIcon, AlertCircleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';
import { apiClient } from '../../services/database/apiClient.ts';

const ConnectionStatusIndicator: React.FC<{ isOnline: boolean }> = ({ isOnline }) => (
    <div className="flex items-center gap-2" title={isOnline ? 'Conectado ao servidor' : 'Operando offline'}>
        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className={`text-xs font-semibold ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
            {isOnline ? 'Online' : 'Offline'}
        </span>
    </div>
);

// Renamed from ClientsPage to AdvancedPage
export const AdvancedPage: React.FC = () => {
    const { formState, setFormState, isOnline, isSyncing, settingsSyncQueueCount, forceSyncSettings } = useSettings();
    const { isSyncingReminders, remindersSyncQueueCount, forceSyncReminders } = useReminders();
    const [dbConnectionStatus, setDbConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [dbConnectionError, setDbConnectionError] = useState<string | null>(null);
    const [apiCallCount, setApiCallCount] = useState(0);
    
    useEffect(() => {
        const storedCount = localStorage.getItem('sativar_isis_api_call_count');
        setApiCallCount(storedCount ? parseInt(storedCount, 10) : 0);
    }, []);

    const handleDbConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({
            ...prev,
            databaseConfig: {
                ...prev.databaseConfig,
                [name]: value
            }
        }));
    };

    const handleDbToggle = (enabled: boolean) => {
        setFormState(prev => ({
            ...prev,
            databaseConfig: {
                ...prev.databaseConfig,
                type: enabled ? 'mysql' : 'none'
            }
        }));
    };
    
    const handleTestConnection = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setDbConnectionStatus('testing');
        setDbConnectionError(null);

        try {
            // Use the centralized apiClient to ensure the correct backend URL and auth headers are used.
            // The backend requires an API key even for this test endpoint.
            await apiClient.post('/test-db-connection', formState.databaseConfig);
            setDbConnectionStatus('success');
        } catch (error) {
            console.error('API call to test DB connection failed:', error);
            setDbConnectionStatus('error');
            setDbConnectionError(error instanceof Error ? error.message : 'Falha na conexão. Verifique os dados.');
        }

        setTimeout(() => setDbConnectionStatus('idle'), 5000);
    };

    const handleResetApiCount = () => {
        if(confirm("Tem certeza que deseja zerar o contador de chamadas da API? Esta ação é útil para iniciar um novo ciclo de faturamento.")) {
            localStorage.setItem('sativar_isis_api_call_count', '0');
            setApiCallCount(0);
        }
    };

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
                    Gerencie a conexão com banco de dados, sincronização e monitore o uso de APIs.
                </p>
            </div>

            <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <DatabaseIcon className="w-6 h-6 text-fuchsia-300"/>
                    <h3 className="text-lg font-semibold text-fuchsia-300">Configuração do Banco de Dados (Opcional)</h3>
                </div>
                <p className="text-sm text-gray-400 -mt-3">
                    Habilite para persistir dados em um servidor MySQL. Se a conexão falhar, o sistema usará o armazenamento local como fallback.
                </p>

                <div className="flex items-center gap-4 py-2">
                    <label className="block text-sm font-medium text-gray-300 select-none">
                        {formState.databaseConfig.type === 'mysql' ? 'Conexão Habilitada' : 'Conexão Desabilitada'}
                    </label>
                    <button
                        type="button"
                        onClick={() => handleDbToggle(formState.databaseConfig.type === 'none')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#303134] ${formState.databaseConfig.type === 'mysql' ? 'bg-green-600' : 'bg-gray-600'}`}
                        role="switch"
                        aria-checked={formState.databaseConfig.type === 'mysql'}
                    >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formState.databaseConfig.type === 'mysql' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
                
                {formState.databaseConfig.type === 'mysql' && (
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Host</label>
                            <input name="host" value={formState.databaseConfig.host} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none" placeholder="localhost" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Porta</label>
                            <input name="port" value={formState.databaseConfig.port} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none" placeholder="3306" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Banco</label>
                            <input name="database" value={formState.databaseConfig.database} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none" placeholder="sativar_db" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Usuário</label>
                            <input name="user" value={formState.databaseConfig.user} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none" placeholder="admin" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
                            <input type="password" name="password" value={formState.databaseConfig.password} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none" />
                        </div>
                    </div>
                     <div className="flex items-center gap-4 pt-2">
                        <button 
                            type="button" 
                            onClick={handleTestConnection} 
                            disabled={dbConnectionStatus === 'testing'}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-sm text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait w-48"
                        >
                            {dbConnectionStatus === 'testing' && <Loader/>}
                            {dbConnectionStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
                        </button>
                        {dbConnectionStatus === 'success' && <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircleIcon className="w-5 h-5" /><span>Conexão bem-sucedida!</span></div>}
                        {dbConnectionStatus === 'error' && <div className="flex items-center gap-2 text-red-400 text-sm"><AlertTriangleIcon className="w-5 h-5" /><span>{dbConnectionError || 'Falha na conexão.'}</span></div>}
                    </div>
                </div>
                )}
            </div>

            <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ServerIcon className="w-6 h-6 text-fuchsia-300"/>
                        <h3 className="text-lg font-semibold text-fuchsia-300">Status de Preservação de Dados</h3>
                    </div>
                    <ConnectionStatusIndicator isOnline={isOnline} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                    <div>
                        <p className="text-sm text-gray-400">Modo de Operação</p>
                        <p className="text-xl font-bold text-white">
                            {formState.databaseConfig.type === 'none' || !isOnline ? 'Armazenamento Local' : 'Banco de Dados'}
                        </p>
                    </div>
                    {formState.databaseConfig.type !== 'none' && !isOnline && (
                        <div className="flex items-center gap-2 text-yellow-400">
                            <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">Conexão indisponível. Operando em modo offline.</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button 
                        type="button" 
                        onClick={handleForceSync}
                        disabled={!isOnline || totalSyncQueueCount === 0 || isAnythingSyncing}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-700 text-sm text-white font-medium rounded-lg transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnythingSyncing && <Loader />}
                        {isAnythingSyncing ? 'Sincronizando...' : `Forçar Sincronização (${totalSyncQueueCount})`}
                    </button>
                </div>
            </div>

            <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <BarChart2Icon className="w-6 h-6 text-fuchsia-300"/>
                    <h3 className="text-lg font-semibold text-fuchsia-300">Uso da API Gemini</h3>
                </div>
                <p className="text-sm text-gray-400 -mt-3">
                    Monitore o número estimado de chamadas feitas à API Gemini. O contador é salvo localmente e pode ser zerado a qualquer momento.
                </p>
                <div className="flex items-center justify-between p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                    <div>
                        <p className="text-sm text-gray-400">Chamadas estimadas neste ciclo</p>
                        <p className="text-3xl font-bold text-white">{apiCallCount}</p>
                    </div>
                    <button 
                        type="button"
                        onClick={handleResetApiCount}
                        className="px-4 py-2 bg-yellow-700/80 text-sm text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                        Zerar Contador
                    </button>
                </div>
            </div>
        </div>
    );
};