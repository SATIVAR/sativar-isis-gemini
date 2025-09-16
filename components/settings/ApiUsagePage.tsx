import React, { useState, useEffect } from 'react';
import { BarChart2Icon } from '../icons.tsx';

export const ApiUsagePage: React.FC = () => {
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

    return (
        <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-2">
                <BarChart2Icon className="w-8 h-8 text-fuchsia-300" />
                <h2 className="text-2xl font-bold text-white">Uso da API Gemini</h2>
            </div>
             <p className="text-gray-400">
                Monitore o número estimado de chamadas feitas à API Gemini. O contador é salvo localmente e pode ser zerado a qualquer momento.
            </p>
            
            <div className="mt-8 space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
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
