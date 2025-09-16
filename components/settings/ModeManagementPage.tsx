import React from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import { RepeatIcon, SparklesIcon, AlertTriangleIcon } from '../icons.tsx';

export const ModeManagementPage: React.FC = () => {
    const { formState, setFormState } = useSettings();
    
    const isIsisModeEnabled = formState.modeSettings?.isIsisModeEnabled ?? true;

    const handleToggle = () => {
        setFormState(prev => ({
            ...prev,
            modeSettings: {
                ...prev.modeSettings,
                isIsisModeEnabled: !isIsisModeEnabled,
            }
        }));
    };

    return (
        <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8 space-y-8">
            <div>
                <div className="flex items-center gap-4 mb-2">
                    <RepeatIcon className="w-8 h-8 text-fuchsia-300" />
                    <h2 className="text-2xl font-bold text-white">Gerenciamento de Modos</h2>
                </div>
                <p className="text-gray-400">
                    Controle quais modos de operação estão disponíveis para os usuários Gerentes e Usuários. O modo Seishat (CRM) é a base do sistema e está sempre ativo.
                </p>
            </div>
            
            <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                    <label htmlFor="isis-mode-toggle" className="flex items-center gap-3 cursor-pointer">
                        <SparklesIcon className="w-6 h-6 text-fuchsia-300"/>
                        <div>
                            <span className="font-semibold text-white">Modo Isis (Análise por IA)</span>
                            <p className="text-xs text-gray-400">Permite a análise de receitas e interação com a IA.</p>
                        </div>
                    </label>
                    <button
                        type="button"
                        id="isis-mode-toggle"
                        onClick={handleToggle}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#303134] ${isIsisModeEnabled ? 'bg-green-600' : 'bg-gray-600'}`}
                        role="switch"
                        aria-checked={isIsisModeEnabled}
                    >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isIsisModeEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
                
                {!isIsisModeEnabled && (
                    <div className="flex items-start gap-3 p-3 mt-4 text-sm text-yellow-300 bg-yellow-900/40 rounded-lg border border-yellow-700/50">
                        <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-yellow-200">Aviso Importante</p>
                            <p className="mt-1">
                                Ao desativar o Modo Isis, usuários com a função "Usuário" perderão o acesso ao sistema, pois esta é sua única tela funcional. Gerentes perderão o acesso à IA, mas continuarão com acesso ao CRM (Modo Seishat).
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};