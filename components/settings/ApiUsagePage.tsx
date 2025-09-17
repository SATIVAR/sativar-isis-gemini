import React from 'react';
import { GaugeCircleIcon } from '../icons.tsx';

// This is a placeholder page. The main API usage stats are currently displayed
// in the ApiHistoryPage.
export const ApiUsagePage: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-2">
                <GaugeCircleIcon className="w-8 h-8 text-fuchsia-300" />
                <h2 className="text-2xl font-bold text-white">Uso da API</h2>
            </div>
            <p className="text-gray-400 mb-6">
                Esta página exibirá estatísticas detalhadas sobre o uso da API Gemini.
            </p>
            <div className="text-center py-10 text-gray-500">
                <p>Em breve...</p>
            </div>
        </div>
    );
};
