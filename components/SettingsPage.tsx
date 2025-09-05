import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import type { Settings, Product } from '../types';
import { LogOutIcon, EditIcon, Trash2Icon, PlusCircleIcon, CheckCircleIcon, SearchIcon, PackageIcon, DatabaseIcon, AlertTriangleIcon, DropletIcon, SunriseIcon, LeafIcon, BarChart2Icon } from './icons';
import { Loader } from './Loader';

interface SettingsPageProps {
  onLogout: () => void;
}

const ProductIcon: React.FC<{ icon?: string; className?: string }> = ({ icon, className = 'w-5 h-5 text-gray-400' }) => {
    switch (icon) {
        case 'droplet': return <DropletIcon className={className} />;
        case 'sunrise': return <SunriseIcon className={className} />;
        case 'leaf': return <LeafIcon className={className} />;
        default: return <PackageIcon className={className} />;
    }
};

const ProductModal: React.FC<{
    product: Product | null;
    onSave: (product: Product) => void;
    onClose: () => void;
}> = ({ product, onSave, onClose }) => {
    const [name, setName] = useState(product?.name || '');
    const [price, setPrice] = useState(product?.price || '');
    const [description, setDescription] = useState(product?.description || '');
    const [icon, setIcon] = useState(product?.icon || 'package');

    const availableIcons = [
        { id: 'package', name: 'Padrão', Icon: PackageIcon },
        { id: 'droplet', name: 'Óleo/Gotas', Icon: DropletIcon },
        { id: 'sunrise', name: 'Pomada', Icon: SunriseIcon },
        { id: 'leaf', name: 'Flor/In Natura', Icon: LeafIcon },
    ];

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !price.trim()) {
            alert('Nome e Preço são obrigatórios.');
            return;
        }
        onSave({ id: product?.id || crypto.randomUUID(), name, price, description, icon });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#303134] rounded-xl border border-gray-700 p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <h3 className="text-xl font-bold mb-6 text-white">{product ? 'Editar Produto' : 'Adicionar Produto'}</h3>
                    <div className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Nome do Produto</label>
                          <input id="name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" required />
                        </div>
                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">Preço (R$)</label>
                          <input id="price" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" required placeholder="Ex: 250.00" />
                        </div>
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Descrição Breve</label>
                          <input id="description" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" placeholder="Ex: Óleo de CBD 20% 10ml" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Ícone do Produto</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {availableIcons.map(({ id, name, Icon }) => (
                                    <button
                                        type="button"
                                        key={id}
                                        onClick={() => setIcon(id)}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${icon === id ? 'border-fuchsia-500 bg-fuchsia-900/40' : 'border-gray-600/50 hover:border-gray-500 bg-[#202124]'}`}
                                        aria-label={`Selecionar ícone ${name}`}
                                    >
                                        <Icon className="w-6 h-6 text-gray-300" />
                                        <span className="text-xs text-center text-gray-400">{name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors">Cancelar</button>
                        <button type="submit" className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">Salvar Produto</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface ConfirmationDialogProps {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmButtonClass?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ 
    title, 
    message, 
    confirmText, 
    cancelText, 
    onConfirm, 
    onCancel, 
    confirmButtonClass = "bg-red-600 hover:bg-red-700" 
}) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div className="bg-[#303134] rounded-xl border border-gray-700 p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
                <p className="text-gray-400 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors">{cancelText}</button>
                    <button onClick={onConfirm} className={`px-5 py-2 text-white font-semibold rounded-lg shadow-md transition-colors ${confirmButtonClass}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};


export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const { settings, saveSettings, systemPrompt, isLoaded } = useSettings();
  const [formState, setFormState] = useState<Settings>(settings);
  const [errors, setErrors] = useState<Partial<Record<keyof Settings, string>>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [savingText, setSavingText] = useState('Aguardando para salvar...');
  const isInitialMount = useRef(true);
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product['id'] | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [dbConnectionStatus, setDbConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [apiCallCount, setApiCallCount] = useState(0);
  const [isResetCountConfirmOpen, setIsResetCountConfirmOpen] = useState(false);


  // State for save confirmation flow
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [stagedChanges, setStagedChanges] = useState<Settings | null>(null);
  const [lastPromptedState, setLastPromptedState] = useState<Settings | null>(null);

  useEffect(() => {
    if (isLoaded) {
      setFormState(settings);
    }
  }, [settings, isLoaded]);
  
  useEffect(() => {
    const storedCount = localStorage.getItem('sativar_isis_api_call_count');
    setApiCallCount(storedCount ? parseInt(storedCount, 10) : 0);
  }, []);

  const validateForm = (data: Settings): boolean => {
    const newErrors: Partial<Record<keyof Settings, string>> = {};
    const requiredFields: Array<keyof Settings> = [
      'associationName',
      'address',
      'whatsapp',
      'pixKey',
      'companyName',
      'bankName',
    ];

    requiredFields.forEach(field => {
      const value = data[field];
      if (typeof value === 'string' && (!value.trim() || value.includes('[Insira'))) {
        newErrors[field] = 'Este campo é obrigatório.';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Auto-prompt-to-save useEffect with validation
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }

    if (isSaveConfirmOpen) return;

    const hasChanges = JSON.stringify(formState) !== JSON.stringify(settings);
    if (!hasChanges) {
        setSaveStatus('idle');
        return;
    }

    if (lastPromptedState && JSON.stringify(formState) === JSON.stringify(lastPromptedState)) {
        if (saveStatus !== 'idle') setSaveStatus('idle');
        return;
    }

    const isValid = validateForm(formState);
    if (!isValid) {
      setSaveStatus('error');
      return; 
    }

    setSaveStatus('saving');
    const debounceTimer = setTimeout(() => {
        setStagedChanges(formState);
        setIsSaveConfirmOpen(true);
    }, 2500);

    return () => {
        clearTimeout(debounceTimer);
    };
  }, [formState, settings, isSaveConfirmOpen, lastPromptedState]);

  // Effect to handle UI feedback for save status changes
  useEffect(() => {
    if (saveStatus !== 'saved') return;

    setIsToastVisible(true);
    const toastTimer = setTimeout(() => setIsToastVisible(false), 2500);
    const idleTimer = setTimeout(() => setSaveStatus('idle'), 3000);

    return () => {
        clearTimeout(toastTimer);
        clearTimeout(idleTimer);
    };
  }, [saveStatus]);
  
  // Effect for dynamic saving text
  useEffect(() => {
    let intervalId: number | undefined;
    if (saveStatus === 'saving') {
        let dotCount = 0;
        intervalId = window.setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            setSavingText(`Aguardando para salvar${'.'.repeat(dotCount)}`);
        }, 400);
    }
    return () => {
        if (intervalId) clearInterval(intervalId);
        setSavingText('Aguardando para salvar...');
    };
  }, [saveStatus]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDbConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
        ...prev,
        databaseConfig: {
            ...prev.databaseConfig,
            [name]: value
        }
    }));
  };

  const handleTestConnection = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDbConnectionStatus('testing');
    
    // NOTE: This is a simulation.
    // In a real application, this would trigger a backend API call.
    // A frontend cannot connect directly to a database for security reasons.
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { host, port, user, database } = formState.databaseConfig;
    if (host && port && user && database) {
        setDbConnectionStatus('success');
    } else {
        setDbConnectionStatus('error');
    }

    setTimeout(() => setDbConnectionStatus('idle'), 4000);
  };

  // Product handlers
  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (product: Product) => {
    const newProducts = editingProduct
      ? formState.products.map(p => (p.id === product.id ? product : p))
      : [...formState.products, product];
    setFormState(prev => ({ ...prev, products: newProducts }));
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: Product['id']) => {
    setProductToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      const newProducts = formState.products.filter(p => p.id !== productToDelete);
      setFormState(prev => ({ ...prev, products: newProducts }));
    }
    setIsConfirmModalOpen(false);
    setProductToDelete(null);
  };
  
  const handleLogout = () => {
    onLogout();
    setIsLogoutConfirmOpen(false);
  }

  const handleResetApiCount = () => {
    try {
        localStorage.setItem('sativar_isis_api_call_count', '0');
        setApiCallCount(0);
    } catch (e) {
        console.error("Failed to reset API count", e);
        alert("Não foi possível zerar o contador. Verifique as permissões do navegador.");
    } finally {
        setIsResetCountConfirmOpen(false);
    }
  };

  // Save confirmation handlers
  const handleConfirmSave = () => {
    if (stagedChanges) {
        saveSettings(stagedChanges);
        setSaveStatus('saved');
    }
    setIsSaveConfirmOpen(false);
    setStagedChanges(null);
    setLastPromptedState(null);
  };

  const handleCancelSave = () => {
      setIsSaveConfirmOpen(false);
      setLastPromptedState(stagedChanges);
      setStagedChanges(null);
      setSaveStatus('idle');
  };

  const filteredProducts = formState.products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.price.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.description.toLowerCase().includes(productSearch.toLowerCase())
  );
  
  const hasUnsavedChanges = JSON.stringify(formState) !== JSON.stringify(settings);

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8 animate-pulse">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="h-10 bg-gray-700 rounded-md w-24"></div>
        </div>

        <div className="space-y-8">
          
          <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <div className="h-6 bg-gray-600 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
                <div className="h-10 bg-gray-700 rounded-lg"></div>
                <div className="h-20 bg-gray-700 rounded-lg"></div>
                <div className="h-10 bg-gray-700 rounded-lg"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-10 bg-gray-700 rounded-lg"></div>
                    <div className="h-10 bg-gray-700 rounded-lg"></div>
                    <div className="h-10 bg-gray-700 rounded-lg"></div>
                </div>
            </div>
          </div>
          
           <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <div className="h-6 bg-gray-600 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-10 bg-gray-700 rounded-lg"></div>
                    <div className="h-10 bg-gray-700 rounded-lg"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-10 bg-gray-700 rounded-lg"></div>
                    <div className="h-10 bg-gray-700 rounded-lg"></div>
                    <div className="h-10 bg-gray-700 rounded-lg"></div>
                </div>
            </div>
          </div>

          <div className="space-y-4 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-600 rounded w-1/3"></div>
                <div className="h-10 bg-gray-700 rounded-lg w-40"></div>
            </div>
            <div className="h-24 bg-gray-700 rounded-lg mt-4"></div>
          </div>

          <div className="p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
             <div className="h-5 bg-gray-600 rounded w-1/2 mb-2"></div>
             <div className="h-64 bg-gray-700 rounded-lg"></div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${isToastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'}`}>
          <div className="flex items-center gap-3 bg-green-600/95 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-2xl">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-semibold text-sm">Alterações salvas com sucesso.</span>
          </div>
      </div>

      {isProductModalOpen && <ProductModal product={editingProduct} onSave={handleSaveProduct} onClose={() => setIsProductModalOpen(false)} />}
      
      {isConfirmModalOpen && 
        <ConfirmationDialog
          title="Confirmar Exclusão"
          message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={confirmDelete}
          onCancel={() => setIsConfirmModalOpen(false)} 
        />
      }

      {isLogoutConfirmOpen && 
        <ConfirmationDialog
            title="Confirmar Saída"
            message="Tem certeza que deseja sair?"
            confirmText="Sim"
            cancelText="Não"
            onConfirm={handleLogout}
            onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      }

      {isResetCountConfirmOpen && 
        <ConfirmationDialog
          title="Zerar Contador de Uso"
          message="Tem certeza que deseja zerar o contador de chamadas da API? Esta ação é útil para iniciar um novo ciclo de faturamento."
          confirmText="Sim, Zerar"
          cancelText="Cancelar"
          onConfirm={handleResetApiCount}
          onCancel={() => setIsResetCountConfirmOpen(false)} 
          confirmButtonClass="bg-yellow-600 hover:bg-yellow-700"
        />
      }


      {isSaveConfirmOpen && 
        <ConfirmationDialog
          title="Confirmar Salvamento"
          message="Detectamos alterações nas configurações. Deseja salvá-las agora?"
          confirmText="Salvar"
          cancelText="Depois"
          onConfirm={handleConfirmSave}
          onCancel={handleCancelSave} 
          confirmButtonClass="bg-green-600 hover:bg-green-700"
        />
      }

      <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Configurações da Associação</h2>
            <p className="mt-2 text-gray-400">
              Essas informações serão usadas pela Ísis para gerar os orçamentos.
            </p>
          </div>
          <button onClick={() => setIsLogoutConfirmOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-md hover:bg-gray-600 transition-colors" aria-label="Sair da conta de administrador">
            <LogOutIcon className="w-4 h-4" />
            Sair
          </button>
        </div>

        <form className="space-y-8">
          
          <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <h3 className="text-lg font-semibold text-fuchsia-300">Dados Institucionais e de Contato</h3>
             <div>
                <label htmlFor="associationName" className="block text-sm font-medium text-gray-300 mb-2">Nome da Associação</label>
                <input id="associationName" name="associationName" value={formState.associationName} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.associationName ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                {errors.associationName && <p className="text-red-400 text-xs mt-1">{errors.associationName}</p>}
            </div>
             <div>
                <label htmlFor="about" className="block text-sm font-medium text-gray-300 mb-2">Sobre a Associação</label>
                <textarea id="about" name="about" value={formState.about} onChange={handleInputChange} rows={3} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
            </div>
             <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">Endereço</label>
                <input id="address" name="address" value={formState.address} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300 mb-2">WhatsApp</label>
                    <input id="whatsapp" name="whatsapp" value={formState.whatsapp} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.whatsapp ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.whatsapp && <p className="text-red-400 text-xs mt-1">{errors.whatsapp}</p>}
                </div>
                <div>
                    <label htmlFor="site" className="block text-sm font-medium text-gray-300 mb-2">Site</label>
                    <input id="site" name="site" value={formState.site} onChange={handleInputChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
                </div>
                 <div>
                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-300 mb-2">Instagram</label>
                    <input id="instagram" name="instagram" value={formState.instagram} onChange={handleInputChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
                </div>
            </div>
          </div>
          
           <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <h3 className="text-lg font-semibold text-fuchsia-300">Dados Operacionais e Financeiros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="operatingHours" className="block text-sm font-medium text-gray-300 mb-2">Horário de Funcionamento</label>
                    <input id="operatingHours" name="operatingHours" value={formState.operatingHours} onChange={handleInputChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
                </div>
                <div>
                    <label htmlFor="productionTime" className="block text-sm font-medium text-gray-300 mb-2">Prazo de Produção/Entrega</label>
                    <input id="productionTime" name="productionTime" value={formState.productionTime} onChange={handleInputChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="pixKey" className="block text-sm font-medium text-gray-300 mb-2">Chave PIX (CNPJ)</label>
                    <input id="pixKey" name="pixKey" value={formState.pixKey} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.pixKey ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.pixKey && <p className="text-red-400 text-xs mt-1">{errors.pixKey}</p>}
                </div>
                <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">Razão Social</label>
                    <input id="companyName" name="companyName" value={formState.companyName} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.companyName ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.companyName && <p className="text-red-400 text-xs mt-1">{errors.companyName}</p>}
                </div>
                 <div>
                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-300 mb-2">Nome do Banco</label>
                    <input id="bankName" name="bankName" value={formState.bankName} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.bankName ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.bankName && <p className="text-red-400 text-xs mt-1">{errors.bankName}</p>}
                </div>
            </div>
          </div>

          <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
                <DatabaseIcon className="w-6 h-6 text-fuchsia-300"/>
                <h3 className="text-lg font-semibold text-fuchsia-300">Configuração do Banco de Dados (Opcional)</h3>
            </div>
            <p className="text-sm text-gray-400 -mt-3">
                Para persistência de dados avançada em um ambiente de produção. A configuração aqui habilita a conexão com um banco de dados gerenciado por um backend.
                <br />
                <strong className="text-yellow-400">Nota:</strong> A lógica de conexão e migração é executada no lado do servidor. O teste de conexão abaixo simula uma chamada de API para o seu backend.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dbType" className="block text-sm font-medium text-gray-300 mb-2">Tipo de Banco</label>
                <select 
                    id="dbType" 
                    name="type" 
                    value={formState.databaseConfig.type} 
                    onChange={handleDbConfigChange}
                    className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner"
                >
                    <option value="none">Nenhum / Usar Armazenamento Local</option>
                    <option value="postgres">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                </select>
              </div>
            </div>
            
            {formState.databaseConfig.type !== 'none' && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="dbHost" className="block text-sm font-medium text-gray-300 mb-2">Host</label>
                        <input id="dbHost" name="host" value={formState.databaseConfig.host} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" placeholder="localhost" />
                    </div>
                    <div>
                        <label htmlFor="dbPort" className="block text-sm font-medium text-gray-300 mb-2">Porta</label>
                        <input id="dbPort" name="port" value={formState.databaseConfig.port} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" placeholder={formState.databaseConfig.type === 'postgres' ? '5432' : '3306'} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label htmlFor="dbDatabase" className="block text-sm font-medium text-gray-300 mb-2">Nome do Banco</label>
                        <input id="dbDatabase" name="database" value={formState.databaseConfig.database} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" placeholder="sativar_db" />
                    </div>
                    <div>
                        <label htmlFor="dbUser" className="block text-sm font-medium text-gray-300 mb-2">Usuário</label>
                        <input id="dbUser" name="user" value={formState.databaseConfig.user} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" placeholder="admin" />
                    </div>
                    <div>
                        <label htmlFor="dbPassword" className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
                        <input type="password" id="dbPassword" name="password" value={formState.databaseConfig.password} onChange={handleDbConfigChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
                    </div>
                </div>
                <div className="flex items-center gap-4 pt-2">
                    <button 
                        type="button" 
                        onClick={handleTestConnection} 
                        disabled={dbConnectionStatus === 'testing'}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-sm text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait w-48"
                    >
                        {dbConnectionStatus === 'testing' ? <Loader/> : null}
                        {dbConnectionStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
                    </button>
                    {dbConnectionStatus === 'success' && (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircleIcon className="w-5 h-5" />
                            <span>Conexão bem-sucedida!</span>
                        </div>
                    )}
                    {dbConnectionStatus === 'error' && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertTriangleIcon className="w-5 h-5" />
                            <span>Falha na conexão. Verifique os dados.</span>
                        </div>
                    )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
                <BarChart2Icon className="w-6 h-6 text-fuchsia-300"/>
                <h3 className="text-lg font-semibold text-fuchsia-300">Uso da API Gemini</h3>
            </div>
            <p className="text-sm text-gray-400 -mt-3">
                Monitore o número estimado de chamadas feitas à API Gemini. O contador é salvo localmente e pode ser zerado a qualquer momento, por exemplo, ao iniciar um novo ciclo de faturamento.
            </p>
            <div className="flex items-center justify-between p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                <div>
                    <p className="text-sm text-gray-400">Chamadas estimadas neste ciclo</p>
                    <p className="text-3xl font-bold text-white">{apiCallCount}</p>
                </div>
                <button 
                    type="button"
                    onClick={() => setIsResetCountConfirmOpen(true)}
                    className="px-4 py-2 bg-yellow-700/80 text-sm text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Zerar Contador
                </button>
            </div>
          </div>

          <div className="space-y-4 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-fuchsia-300">Produtos Cadastrados</h3>
              <button type="button" onClick={handleAddProduct} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                <PlusCircleIcon className="w-5 h-5" /> Adicionar Produto
              </button>
            </div>
            
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-4 h-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nome, preço ou descrição..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner"
                    aria-label="Buscar produtos"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-[#202124]">
                        <tr>
                            <th scope="col" className="px-4 py-3">Produto</th>
                            <th scope="col" className="px-4 py-3">Preço (R$)</th>
                            <th scope="col" className="px-4 py-3">Descrição</th>
                            <th scope="col" className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formState.products.length > 0 ? (
                           filteredProducts.length > 0 ? (
                                filteredProducts.map(p => (
                                   <tr key={p.id} className="border-b border-gray-700 hover:bg-[#303134]">
                                        <td className="px-4 py-3 font-medium text-white">
                                          <div className="flex items-center gap-3">
                                            <ProductIcon icon={p.icon} />
                                            <span>{p.name}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">{p.price}</td>
                                        <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={p.description}>{p.description}</td>
                                        <td className="px-4 py-3 flex items-center justify-end gap-2">
                                            <button type="button" onClick={() => handleEditProduct(p)} className="p-1 text-gray-400 hover:text-fuchsia-400 transition-colors" aria-label={`Editar ${p.name}`}><EditIcon className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => handleDeleteProduct(p.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors" aria-label={`Excluir ${p.name}`}><Trash2Icon className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                           ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-6 text-gray-500">
                                        Nenhum produto encontrado para "{productSearch}".
                                    </td>
                                </tr>
                           )
                        ) : (
                            <tr>
                                <td colSpan={4} className="text-center py-10">
                                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-[#303134]/50 p-12 text-center">
                                        <PackageIcon className="mx-auto h-12 w-12 text-gray-500" />
                                        <h3 className="mt-4 text-lg font-semibold text-gray-300">Comece a cadastrar seus produtos</h3>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Adicione produtos para que a Ísis possa incluí-los nos orçamentos.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleAddProduct}
                                            className="mt-6 inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                        >
                                            <PlusCircleIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                            Adicionar Primeiro Produto
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>

          <div className="p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
             <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-300 mb-2">
                Prompt do Sistema (Contexto da Ísis - Gerado Automaticamente)
            </label>
            <textarea
              id="systemPrompt"
              name="systemPrompt"
              value={systemPrompt}
              readOnly
              rows={20}
              className="w-full bg-[#131314] border border-gray-600/50 text-gray-400 rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner cursor-not-allowed"
            />
          </div>
          
          <div className="flex items-center justify-end pt-4 h-10">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader />
                  <span>{savingText}</span>
              </div>
            )}
            {saveStatus === 'error' && <p className="text-red-400 text-sm">Por favor, corrija os erros para salvar as alterações.</p>}
            {saveStatus === 'idle' && hasUnsavedChanges && <p className="text-gray-500 text-sm">Você possui alterações não salvas.</p>}
          </div>
        </form>
      </div>
    </>
  );
};