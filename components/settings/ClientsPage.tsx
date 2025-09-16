

import React from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import { useReminders } from '../../hooks/useReminders.ts';
import { DatabaseIcon, ServerIcon, AlertCircleIcon, CheckCircleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';

const ConnectionStatusBadge: React.FC<{ isOnline: boolean }> = ({ isOnline }) => (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isOnline ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'bg-red-900/50 text-red-300 border border-red-700/50'}`}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
        {isOnline ? 'Online' : 'Offline'}
    </div>
);

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
                    Gerencie a sincronização de dados e monitore o uso de APIs.
                </p>
            </div>

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
                                {isOnline ? 'Modo Online: Servidor Conectado (SQLite)' : 'Modo Offline: Armazenamento Local'}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                {isOnline ? 
                                    'Os dados estão sendo lidos e salvos diretamente no banco de dados SQLite do servidor, garantindo segurança, consistência e persistência das informações.' :
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