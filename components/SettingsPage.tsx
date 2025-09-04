import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import type { Settings } from '../types';
import { LogOutIcon } from './icons';
import { getQuoteHistory } from '../services/dbService';

interface QuoteHistoryItem {
  id: number;
  patient_name: string;
  internal_summary: string;
  created_at: string;
}

interface SettingsPageProps {
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const { settings, saveSettings, isLoaded } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [quoteHistory, setQuoteHistory] = useState<QuoteHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setPrompt(settings.systemPrompt);
    }
  }, [settings, isLoaded]);

  useEffect(() => {
    loadQuoteHistory();
  }, []);

  const loadQuoteHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await getQuoteHistory(10);
      setQuoteHistory(history);
    } catch (error) {
      console.error('Failed to load quote history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings: Settings = { systemPrompt: prompt };
    try {
      await saveSettings(newSettings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Erro ao salvar configurações. Por favor, tente novamente.');
    }
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

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-white mb-6">Histórico de Orçamentos</h2>
        {isLoadingHistory ? (
          <p className="text-gray-400">Carregando histórico...</p>
        ) : quoteHistory.length === 0 ? (
          <p className="text-gray-400">Nenhum orçamento gerado ainda.</p>
        ) : (
          <div className="space-y-4">
            {quoteHistory.map((item) => (
              <div key={item.id} className="border border-gray-700 rounded-lg p-4 bg-[#303134]">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-white">{item.patient_name}</h3>
                  <span className="text-sm text-gray-400">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="mt-2 text-gray-300 whitespace-pre-wrap">
                  {item.internal_summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};