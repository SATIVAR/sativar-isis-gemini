

import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import { useReminders } from '../../hooks/useReminders.ts';
import { DatabaseIcon, BarChart2Icon, ServerIcon, AlertCircleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';

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
    const { isOnline, isSyncing, settingsSyncQueueCount, forceSyncSettings } = useSettings();
    const { isSyncingReminders, remindersSyncQueueCount, forceSyncReminders } = useReminders();
    const [apiCallCount, setApiCallCount] = useState(0);
    
    useEffect(() => {
        const storedCount = localStorage.getItem('sativar_isis_api_call_count');
        setApiCallCount(storedCount ? parseInt(storedCount, 10) : 0);
    }, []);

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
                    Gerencie a sincronização de dados e monitore o uso de APIs.
                </p>
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
                            {!isOnline ? 'Armazenamento Local' : 'Banco de Dados (Online)'}
                        </p>
                    </div>
                    {!isOnline && (
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
                    {totalSyncQueueCount > 0 && (
                        <p className="text-xs text-gray-400">
                            {totalSyncQueueCount} alteraç{totalSyncQueueCount === 1 ? 'ão' : 'ões'} aguardando para sincronizar.
                        </p>
                    )}
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