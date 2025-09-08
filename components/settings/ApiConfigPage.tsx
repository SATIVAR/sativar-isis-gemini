
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import type { WpConfig } from '../../types.ts';
import { checkApiStatus, type ApiStatus } from '../../services/wpApiService.ts';
import { Loader } from '../Loader.tsx';
import { CheckCircleIcon, AlertCircleIcon, ServerIcon, EyeIcon, EyeOffIcon, StoreIcon, UsersIcon } from '../icons.tsx';

const PasswordInput: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, id: string, name: string, hasError: boolean }> = ({ value, onChange, id, name, hasError }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <div className="relative">
            <input
                id={id}
                name={name}
                type={isVisible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm outline-none transition shadow-inner pr-10 ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`}
                autoComplete="new-password"
            />
            <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                aria-label={isVisible ? "Esconder chave" : "Mostrar chave"}
            >
                {isVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
        </div>
    );
};

const StatusIndicator: React.FC<{ status: 'success' | 'error' | 'untested' | 'testing', label: string, icon: React.ReactNode }> = ({ status, label, icon }) => {
    const colors = {
        success: 'text-green-400',
        error: 'text-red-400',
        untested: 'text-gray-500',
        testing: 'text-blue-400',
    };
    return (
        <div className={`flex items-center gap-3 p-3 bg-[#303134] rounded-lg border border-gray-700/50 ${colors[status]}`}>
            {icon}
            <span className="font-semibold text-sm text-gray-300 flex-grow">{label}</span>
            {status === 'testing' && <Loader />}
            {status === 'success' && <CheckCircleIcon className="w-5 h-5" />}
            {status === 'error' && <AlertCircleIcon className="w-5 h-5" />}
        </div>
    );
};

export const ApiConfigPage: React.FC = () => {
  const { wpConfig, saveWpConfig } = useSettings();
  const [formState, setFormState] = useState<WpConfig>(wpConfig);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ wooCommerce: 'untested', sativarClients: 'untested' });
  const [errors, setErrors] = useState({
    url: '',
    consumerKey: '',
    consumerSecret: '',
  });

  useEffect(() => {
    setFormState(wpConfig);
  }, [wpConfig]);

  const validateForm = (config: WpConfig): boolean => {
    const newErrors = { url: '', consumerKey: '', consumerSecret: '' };
    let isValid = true;

    if (!config.url.trim()) {
      newErrors.url = 'A URL do site é obrigatória.';
      isValid = false;
    } else {
      try {
        const urlObject = new URL(config.url);
        if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
          newErrors.url = 'A URL deve incluir o protocolo http:// ou https://.';
          isValid = false;
        }
      } catch (_) {
        newErrors.url = 'Formato de URL inválido. Exemplo: https://seu-site.com';
        isValid = false;
      }
    }

    if (!config.consumerKey.trim()) {
      newErrors.consumerKey = 'A Consumer Key é obrigatória.';
      isValid = false;
    }
    
    if (!config.consumerSecret.trim()) {
      newErrors.consumerSecret = 'A Consumer Secret é obrigatória.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    // Clear error on change for better UX
    if (errors[name as keyof typeof errors]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTestConnection = async () => {
    if (!validateForm(formState)) {
        return;
    }
    setIsTesting(true);
    const status = await checkApiStatus(formState);
    setApiStatus(status);
    setIsTesting(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(formState)) {
        return;
    }
    
    setIsSaving(true);
    const status = await checkApiStatus(formState);
    setApiStatus(status);
    
    if (status.wooCommerce === 'success') {
        await saveWpConfig(formState);
        if (status.sativarClients === 'success') {
            alert("Configurações salvas e conexão estabelecida com sucesso!");
        } else {
            alert("Atenção: Configurações salvas. A conexão com o WooCommerce foi bem-sucedida, mas o endpoint de Clientes (SATIVAR) falhou. A funcionalidade de produtos está ativa.");
        }
    } else {
        alert("Erro ao salvar: Falha na conexão com o endpoint de Produtos (WooCommerce). Verifique os dados da API. As configurações não foram salvas.");
    }
    setIsSaving(false);
  };

  const isFormEmpty = !formState.url.trim() || !formState.consumerKey.trim() || !formState.consumerSecret.trim();
  const isBusy = isTesting || isSaving;

  return (
    <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-2">
        <ServerIcon className="w-8 h-8 text-fuchsia-300" />
        <h2 className="text-2xl font-bold text-white">Configuração da API</h2>
      </div>
      <p className="mt-2 text-gray-400 mb-8">
        Insira os dados de conexão da sua API Sativar_WP_API/WooCommerce para integrar o sistema.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">URL do Site Sativar_WP_API</label>
          <input id="url" name="url" value={formState.url} onChange={handleInputChange} placeholder="https://seu-site.com" className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.url ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} required />
          {errors.url && <p className="text-red-400 text-xs mt-1">{errors.url}</p>}
        </div>
        <div>
          <label htmlFor="consumerKey" className="block text-sm font-medium text-gray-300 mb-2">WooCommerce Consumer Key</label>
          <input id="consumerKey" name="consumerKey" value={formState.consumerKey} onChange={handleInputChange} placeholder="ck_xxxxxxxxxxxx" className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.consumerKey ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} required />
          {errors.consumerKey && <p className="text-red-400 text-xs mt-1">{errors.consumerKey}</p>}
        </div>
        <div>
          <label htmlFor="consumerSecret" className="block text-sm font-medium text-gray-300 mb-2">WooCommerce Consumer Secret</label>
           <PasswordInput id="consumerSecret" name="consumerSecret" value={formState.consumerSecret} onChange={handleInputChange} hasError={!!errors.consumerSecret} />
           {errors.consumerSecret && <p className="text-red-400 text-xs mt-1">{errors.consumerSecret}</p>}
        </div>

        <div className="space-y-3 pt-4">
            <h3 className="text-lg font-semibold text-fuchsia-300">Status dos Serviços</h3>
            <StatusIndicator status={isTesting || isSaving ? 'testing' : apiStatus.wooCommerce} label="Endpoint de Produtos (WooCommerce)" icon={<StoreIcon className="w-5 h-5"/>} />
            <StatusIndicator status={isTesting || isSaving ? 'testing' : apiStatus.sativarClients} label="Endpoint de Clientes (SATIVAR)" icon={<UsersIcon className="w-5 h-5" />} />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <button
                type="button"
                onClick={handleTestConnection}
                disabled={isBusy || isFormEmpty}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-sm text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
                {isTesting ? <Loader/> : null}
                {isTesting ? 'Testando...' : 'Testar Conexão'}
            </button>
          
          <button type="submit" disabled={isBusy || isFormEmpty} className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 disabled:opacity-50 disabled:cursor-wait">
            {isSaving ? <Loader /> : null}
            {isSaving ? 'Salvando...' : 'Salvar e Conectar'}
          </button>
        </div>
      </form>
    </div>
  );
};
