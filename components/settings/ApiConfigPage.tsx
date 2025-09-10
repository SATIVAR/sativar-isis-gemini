

import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import type { WpConfig, SativarUser, WooProduct } from '../../types.ts';
import { checkApiStatus, getSativarUsers, getProducts, type ApiStatus } from '../../services/wpApiService.ts';
import { Loader } from '../Loader.tsx';
import { CheckCircleIcon, AlertCircleIcon, ServerIcon, EyeIcon, EyeOffIcon, StoreIcon, UsersIcon, SearchIcon, AlertTriangleIcon } from '../icons.tsx';

const PasswordInput: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, id: string, name: string, hasError: boolean, placeholder?: string }> = ({ value, onChange, id, name, hasError, placeholder }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <div className="relative">
            <input
                id={id}
                name={name}
                type={isVisible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
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
            {status === 'untested' && <span className="text-xs text-gray-500">Não testado</span>}
        </div>
    );
};

const UserResultsTable: React.FC<{ users: SativarUser[] }> = ({ users }) => (
    <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-[#202124] sticky top-0">
            <tr>
                <th scope="col" className="px-4 py-3">Nome</th>
                <th scope="col" className="px-4 py-3">Email</th>
                <th scope="col" className="px-4 py-3">CPF</th>
                <th scope="col" className="px-4 py-3">Telefone</th>
            </tr>
        </thead>
        <tbody>
            {users.map(user => (
                <tr key={user.id} className="border-b border-gray-700 hover:bg-[#303134]/50">
                    <td className="px-4 py-3 font-medium text-white">{user.display_name}</td>
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3 text-gray-300">{user.acf_fields?.cpf || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-300">{user.acf_fields?.telefone || 'N/A'}</td>
                </tr>
            ))}
        </tbody>
    </table>
);

const ProductResultsTable: React.FC<{ products: WooProduct[] }> = ({ products }) => (
    <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-[#202124] sticky top-0">
            <tr>
                <th scope="col" className="px-4 py-3">Produto</th>
                <th scope="col" className="px-4 py-3">Preço (R$)</th>
                <th scope="col" className="px-4 py-3">Estoque</th>
                <th scope="col" className="px-4 py-3">Categorias</th>
            </tr>
        </thead>
        <tbody>
            {products.map(p => (
                <tr key={p.id} className="border-b border-gray-700 hover:bg-[#303134]/50">
                    <td className="px-4 py-3 font-medium text-white">
                        <div className="flex items-center gap-3">
                            <img src={p.images?.[0]?.src || 'https://via.placeholder.com/40'} alt={p.name} className="w-10 h-10 rounded-md object-cover bg-gray-700"/>
                            <span>{p.name}</span>
                        </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{p.price}</td>
                    <td className="px-4 py-3 text-gray-300">{p.stock_quantity ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs">{p.categories?.map(c => c.name).join(', ') || ''}</td>
                </tr>
            ))}
        </tbody>
    </table>
);


const ApiSearchComponent: React.FC = () => {
    const { wpConfig } = useSettings();
    const [searchType, setSearchType] = useState<'users' | 'products'>('users');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<(SativarUser | WooProduct)[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [showRawJson, setShowRawJson] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const handleSearch = async () => {
        if (!wpConfig.url) {
            setError('A API do Sativar_WP_API não está configurada.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSearchPerformed(true);
        setShowRawJson(false);
        setCurrentPage(1); // Reset page on new search
        try {
            const searchResults = searchType === 'users'
                ? await getSativarUsers(wpConfig, searchTerm)
                : await getProducts(wpConfig, searchTerm);
            setResults(searchResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Falha ao buscar ${searchType === 'users' ? 'usuários' : 'produtos'}.`);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderResults = () => {
        if (isLoading) {
            return (
                 <div className="flex flex-col items-center justify-center gap-3 text-gray-400 py-10 rounded-lg border-2 border-dashed border-gray-700">
                    <Loader />
                    <p className="font-semibold text-gray-300">Buscando...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex items-center gap-3 p-3 text-sm text-red-300 bg-red-900/40 rounded-lg border border-red-700/50">
                    <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            );
        }
        if (!searchPerformed) {
            return (
                 <div className="text-center py-10 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg">
                    <SearchIcon className="w-8 h-8 mx-auto mb-2"/>
                    Realize uma busca para ver os resultados aqui.
                </div>
            );
        }
        if (results.length === 0) {
            return (
                 <div className="text-center py-10 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2"/>
                    Nenhum resultado encontrado para sua busca.
                </div>
            )
        }
        
        // Pagination logic
        const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
        const paginatedResults = results.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );

        const PaginationControls = () => {
            if (totalPages <= 1) return null;
            return (
                <div className="flex justify-center items-center gap-4 mt-4 text-sm">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Anterior
                    </button>
                    <span className="text-gray-400 font-medium">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Próxima
                    </button>
                </div>
            );
        };

        return (
            <>
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-400">
                        Mostrando {paginatedResults.length} de {results.length} resultados.
                    </p>
                    <button 
                        onClick={() => setShowRawJson(prev => !prev)}
                        className="text-xs text-gray-400 hover:text-white bg-gray-700 px-2 py-1 rounded"
                    >
                        {showRawJson ? 'Ocultar JSON' : 'Exibir JSON'}
                    </button>
                </div>
                {showRawJson && (
                    <pre className="text-xs bg-[#131314] p-4 rounded-lg max-h-64 overflow-auto mb-4 border border-gray-600">
                        {JSON.stringify(results, null, 2)}
                    </pre>
                )}
                <div className="overflow-auto max-h-96 pr-2">
                    {searchType === 'users' ? (
                        <UserResultsTable users={paginatedResults as SativarUser[]} />
                    ) : (
                        <ProductResultsTable products={paginatedResults as WooProduct[]} />
                    )}
                </div>
                <PaginationControls />
            </>
        );
    }

    return (
        <div className="bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-2">
                <SearchIcon className="w-8 h-8 text-fuchsia-300" />
                <h2 className="text-2xl font-bold text-white">Consulta da API (Sativar_WP_API)</h2>
            </div>
            <p className="mt-2 text-gray-400 mb-8">
                Teste os endpoints de busca de produtos e usuários diretamente.
            </p>

            <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center p-1 bg-[#303134] rounded-lg">
                        <button 
                            onClick={() => { setSearchType('users'); setCurrentPage(1); }}
                            className={`flex-1 flex items-center justify-center text-sm font-semibold px-4 py-1.5 rounded-md transition-colors ${searchType === 'users' ? 'bg-fuchsia-700 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <UsersIcon className="w-4 h-4 mr-2" />
                            Usuários
                        </button>
                         <button 
                            onClick={() => { setSearchType('products'); setCurrentPage(1); }}
                            className={`flex-1 flex items-center justify-center text-sm font-semibold px-4 py-1.5 rounded-md transition-colors ${searchType === 'products' ? 'bg-fuchsia-700 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <StoreIcon className="w-4 h-4 mr-2" />
                            Produtos
                        </button>
                    </div>
                    <div className="relative flex-grow">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            placeholder={searchType === 'users' ? "Buscar por nome, CPF, telefone..." : "Buscar por nome, SKU..."}
                            className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none transition"
                        />
                    </div>
                </div>
                 <button 
                    onClick={handleSearch} 
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-fuchsia-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-fuchsia-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                    {isLoading && <Loader />}
                    {isLoading ? 'Buscando...' : 'Buscar'}
                </button>
            </div>
            
            <div className="mt-6">
                {renderResults()}
            </div>
        </div>
    );
};


export const ApiConfigPage: React.FC = () => {
  const { wpConfig, saveWpConfig } = useSettings();
  const [formState, setFormState] = useState<WpConfig>(wpConfig);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ wooCommerce: 'untested', sativarUsers: 'untested' });
  const [errors, setErrors] = useState({
    url: '',
    consumerKey: '',
    consumerSecret: '',
    username: '',
    applicationPassword: '',
  });

  useEffect(() => {
    setFormState(prev => ({...prev, ...wpConfig}));
  }, [wpConfig]);

  const validateForm = (config: WpConfig): boolean => {
    const newErrors = { url: '', consumerKey: '', consumerSecret: '', username: '', applicationPassword: '' };
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
    
    const wcOK = status.wooCommerce === 'success';
    const sativarOK = status.sativarUsers === 'success';

    if (wcOK || sativarOK) { // Save if at least one works
        await saveWpConfig(formState);
        let message = "Configurações salvas. ";
        if (wcOK && sativarOK) {
            message += "Ambos os endpoints estão funcionando!";
        } else if (wcOK) {
            message += "WooCommerce conectado, mas o endpoint de Usuários (SATIVAR) falhou. Verifique a Senha de Aplicativo.";
        } else { // only sativarOK is true
            message += "Usuários (SATIVAR) conectado, mas o endpoint do WooCommerce falhou. Verifique as chaves Consumer.";
        }
        alert(message);
    } else {
        alert("Erro: Falha na conexão com ambos os endpoints. Verifique todas as credenciais. As configurações não foram salvas.");
    }
    setIsSaving(false);
  };

  const isFormEmpty = !formState.url?.trim() || !formState.consumerKey?.trim() || !formState.consumerSecret?.trim();
  const isBusy = isTesting || isSaving;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
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
              <input id="url" name="url" value={formState.url || ''} onChange={handleInputChange} placeholder="https://seu-site.com" className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.url ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} required />
              {errors.url && <p className="text-red-400 text-xs mt-1">{errors.url}</p>}
            </div>

            <div className="space-y-6 p-4 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <h3 className="text-md font-semibold text-gray-300">Credenciais WooCommerce API</h3>
                <div>
                  <label htmlFor="consumerKey" className="block text-sm font-medium text-gray-300 mb-2">WooCommerce Consumer Key</label>
                  <input id="consumerKey" name="consumerKey" value={formState.consumerKey || ''} onChange={handleInputChange} placeholder="ck_xxxxxxxxxxxx" className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.consumerKey ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} required />
                  {errors.consumerKey && <p className="text-red-400 text-xs mt-1">{errors.consumerKey}</p>}
                </div>
                <div>
                  <label htmlFor="consumerSecret" className="block text-sm font-medium text-gray-300 mb-2">WooCommerce Consumer Secret</label>
                   <PasswordInput id="consumerSecret" name="consumerSecret" value={formState.consumerSecret || ''} placeholder="cs_xxxxxxxxxxxx" onChange={handleInputChange} hasError={!!errors.consumerSecret} />
                   {errors.consumerSecret && <p className="text-red-400 text-xs mt-1">{errors.consumerSecret}</p>}
                </div>
            </div>
            
            <div className="space-y-6 p-4 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <h3 className="text-md font-semibold text-gray-300">Credenciais SATIVAR API (Senha de Aplicativo)</h3>
                <p className="text-xs text-gray-400 -mt-4">Usado para endpoints customizados, como a busca de usuários. Gere em "Usuários &gt; Perfil &gt; Senhas de Aplicativo" no seu painel WordPress.</p>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">Usuário WordPress (Admin)</label>
                  <input id="username" name="username" value={formState.username || ''} onChange={handleInputChange} placeholder="admin" className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.username ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                  {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                </div>
                <div>
                  <label htmlFor="applicationPassword" className="block text-sm font-medium text-gray-300 mb-2">Senha de Aplicativo</label>
                   <PasswordInput id="applicationPassword" name="applicationPassword" value={formState.applicationPassword || ''} placeholder="xxxx xxxx xxxx xxxx" onChange={handleInputChange} hasError={!!errors.applicationPassword} />
                   {errors.applicationPassword && <p className="text-red-400 text-xs mt-1">{errors.applicationPassword}</p>}
                </div>
            </div>

            <div className="space-y-3 pt-4">
                <h3 className="text-lg font-semibold text-fuchsia-300">Status dos Serviços</h3>
                <StatusIndicator status={isTesting || isSaving ? 'testing' : apiStatus.wooCommerce} label="Endpoint de Produtos (WooCommerce)" icon={<StoreIcon className="w-5 h-5"/>} />
                <StatusIndicator status={isTesting || isSaving ? 'testing' : apiStatus.sativarUsers} label="Endpoint de Usuários (SATIVAR)" icon={<UsersIcon className="w-5 h-5" />} />
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
        <ApiSearchComponent />
    </div>
  );
};