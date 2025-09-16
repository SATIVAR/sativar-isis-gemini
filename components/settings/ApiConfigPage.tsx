// This component has been deprecated and its functionality removed as part of the
// migration away from the WordPress/WooCommerce API dependency.
import React from 'react';
import { ServerIcon } from '../icons.tsx';

export const ApiConfigPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-2">
                <ServerIcon className="w-8 h-8 text-fuchsia-300" />
                <h2 className="text-2xl font-bold text-white">Configuração da API</h2>
            </div>
            <p className="mt-2 text-gray-400">
                Esta funcionalidade foi removida como parte da migração para um sistema autônomo. A integração com APIs externas não é mais necessária nesta seção.
            </p>
        </div>
    </div>
  );
};
