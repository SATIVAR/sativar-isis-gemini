
import React from 'react';
import { useNotifications } from '../../hooks/useNotifications.ts';
import { BellIcon, CheckCircleIcon, AlertCircleIcon } from '../icons.tsx';

export const NotificationsPage: React.FC = () => {
    const { permission, isEnabled, requestPermission, toggleIsEnabled } = useNotifications();

    const renderPermissionStatus = () => {
        switch (permission) {
            case 'granted':
                return (
                    <div className="flex items-center gap-2 text-green-400">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>Permissão Concedida</span>
                    </div>
                );
            case 'denied':
                return (
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircleIcon className="w-5 h-5" />
                        <span>Permissão Negada</span>
                    </div>
                );
            default:
                return (
                     <div className="flex items-center gap-2 text-yellow-400">
                        <AlertCircleIcon className="w-5 h-5" />
                        <span>Aguardando Permissão</span>
                    </div>
                );
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8 space-y-8">
            <div>
                <div className="flex items-center gap-4 mb-2">
                    <BellIcon className="w-8 h-8 text-fuchsia-300" />
                    <h2 className="text-2xl font-bold text-white">Notificações</h2>
                </div>
                <p className="text-gray-400">
                    Receba alertas no seu navegador sobre lembretes pendentes e outras atividades importantes, mesmo com a aba minimizada.
                </p>
            </div>

            <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <h3 className="text-lg font-semibold text-fuchsia-300">Status da Permissão no Navegador</h3>
                <div className="flex items-center justify-between p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                    <p className="text-sm font-medium text-gray-300">Status atual:</p>
                    {renderPermissionStatus()}
                </div>
                
                {permission === 'denied' && (
                    <div className="text-sm text-yellow-300 bg-yellow-900/40 p-3 rounded-lg border border-yellow-700/50">
                        As notificações estão bloqueadas nas configurações do seu navegador para este site. Você precisará habilitá-las manualmente para usar este recurso.
                    </div>
                )}
                
                {permission === 'default' && (
                    <div className="flex items-center justify-center pt-4">
                        <button
                            onClick={requestPermission}
                            className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
                        >
                            Habilitar Notificações
                        </button>
                    </div>
                )}

                {permission === 'granted' && (
                    <div className="pt-4 border-t border-gray-700/50">
                        <h3 className="text-lg font-semibold text-fuchsia-300 mb-4">Controle de Notificações</h3>
                         <div className="flex items-center justify-between p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                            <label htmlFor="notification-toggle" className="text-sm font-medium text-gray-300 select-none">
                                {isEnabled ? 'Notificações Ativadas' : 'Notificações Desativadas'}
                            </label>
                            <button
                                type="button"
                                id="notification-toggle"
                                onClick={() => toggleIsEnabled(!isEnabled)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#202124] ${isEnabled ? 'bg-green-600' : 'bg-gray-600'}`}
                                role="switch"
                                aria-checked={isEnabled}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};