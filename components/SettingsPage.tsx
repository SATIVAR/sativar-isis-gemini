import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import type { Settings } from '../types';
import { LogOutIcon } from './icons';

interface SettingsPageProps {
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const { settings, saveSettings, isLoaded } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setPrompt(settings.systemPrompt);
    }
  }, [settings, isLoaded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings: Settings = { systemPrompt: prompt };
    saveSettings(newSettings);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (!isLoaded) {
    return <div className="text-center p-10">Carregando configurações...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Configurações da Associação</h2>
          <p className="mt-2 text-gray-400">
            Essas informações serão usadas pela Ísis para gerar os orçamentos. Os dados são salvos localmente no seu navegador.
          </p>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-md hover:bg-gray-600 transition-colors"
          aria-label="Sair da conta de administrador"
        >
          <LogOutIcon className="w-4 h-4" />
          Sair
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-300 mb-2">
            Prompt do Sistema (Contexto da Ísis)
          </label>
          <textarea
            id="systemPrompt"
            name="systemPrompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={20}
            className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner"
            placeholder="Insira aqui o prompt de sistema completo para a Ísis..."
          />
        </div>
        
        <div className="flex items-center justify-end pt-4">
          {showSuccess && <p className="text-green-400 mr-4 transition-opacity duration-300">Configurações salvas com sucesso!</p>}
          <button type="submit" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500">
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
};