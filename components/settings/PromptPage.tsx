
import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import { FileCodeIcon, ClipboardIcon, ClipboardCheckIcon } from '../icons.tsx';

export const PromptPage: React.FC = () => {
    const { systemPrompt } = useSettings();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(systemPrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-2">
                <FileCodeIcon className="w-8 h-8 text-fuchsia-300" />
                <h2 className="text-2xl font-bold text-white">Prompt do Sistema</h2>
            </div>
            <p className="text-gray-400 mb-6">
                Este é o prompt completo que a Ísis usa como contexto. Ele é gerado dinamicamente com base nas suas configurações e nos produtos do WooCommerce.
            </p>

            <div className="relative">
                <textarea
                    readOnly
                    value={systemPrompt}
                    rows={25}
                    className="w-full bg-[#131314] border border-gray-600/50 text-gray-400 rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner"
                />
                <button
                    onClick={handleCopy}
                    className="absolute top-3 right-3 p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    aria-label="Copiar prompt"
                >
                    {copied ? (
                        <ClipboardCheckIcon className="w-5 h-5 text-green-400" />
                    ) : (
                        <ClipboardIcon className="w-5 h-5 text-gray-400" />
                    )}
                </button>
            </div>
        </div>
    );
};