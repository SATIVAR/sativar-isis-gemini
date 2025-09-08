

import React from 'react';
import { useApiHistory } from '../../hooks/useApiHistory.ts';
import type { ApiCall } from '../../services/apiHistoryService.ts';
import { ClockIcon, CheckCircleIcon, AlertCircleIcon, FileTextIcon, SendIcon, Trash2Icon } from '../icons.tsx';

const HistoryItem: React.FC<{ item: ApiCall }> = ({ item }) => {
    const isSuccess = item.status === 'success';
    const isFile = item.type === 'prescription_analysis';
    const timestamp = new Date(item.timestamp);
    const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(timestamp);

    return (
        <div className={`p-4 bg-[#303134]/50 border-l-4 rounded-r-lg transition-colors hover:bg-[#303134]
            ${isSuccess ? 'border-green-500' : 'border-red-500'}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                    {isSuccess 
                        ? <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                        : <AlertCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                    }
                    <div>
                        <div className="flex items-center gap-2">
                            {isFile 
                                ? <FileTextIcon className="w-4 h-4 text-gray-400" />
                                : <SendIcon className="w-4 h-4 text-gray-400" />
                            }
                            <p className="font-semibold text-white">
                                {isFile ? 'Análise de Receita' : 'Consulta de Texto'}
                            </p>
                        </div>
                        <p className="text-sm text-gray-300 mt-1 truncate" title={item.details}>
                            {item.details}
                        </p>
                        {!isSuccess && item.error && (
                            <div className="mt-2 p-2 bg-red-900/30 rounded text-xs text-red-300 border border-red-700/50">
                                <p className="font-mono">{item.error}</p>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-xs text-gray-500 flex-shrink-0 ml-4">{formattedDate}</p>
            </div>
        </div>
    );
};


export const ApiHistoryPage: React.FC = () => {
    const { history, clearHistory } = useApiHistory();

    const handleClearHistory = () => {
        if (window.confirm('Tem certeza de que deseja limpar todo o histórico de chamadas da API? Esta ação não pode ser desfeita.')) {
            clearHistory();
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <ClockIcon className="w-8 h-8 text-fuchsia-300" />
                        <h2 className="text-2xl font-bold text-white">Log de Chamadas da API Gemini</h2>
                    </div>
                    <p className="text-gray-400">
                        Histórico das últimas 100 chamadas feitas à API, útil para monitoramento e depuração.
                    </p>
                </div>
                {history.length > 0 && (
                     <button 
                        onClick={handleClearHistory}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-800 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors"
                    >
                        <Trash2Icon className="w-4 h-4" />
                        Limpar Log
                    </button>
                )}
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {history.length > 0 ? (
                    history.map(item => <HistoryItem key={item.id} item={item} />)
                ) : (
                     <div className="flex flex-col items-center justify-center gap-4 text-gray-500 py-20 rounded-lg border-2 border-dashed border-gray-700">
                        <ClockIcon className="w-12 h-12" />
                        <p className="text-lg font-semibold text-gray-400">Nenhuma chamada à API registrada.</p>
                        <p className="text-sm">O histórico aparecerá aqui assim que você interagir com a Ísis.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
