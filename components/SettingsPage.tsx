import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import type { Settings, Product } from '../types';
import { LogOutIcon, EditIcon, Trash2Icon, PlusCircleIcon } from './icons';

interface SettingsPageProps {
  onLogout: () => void;
}

const ProductModal: React.FC<{
    product: Product | null;
    onSave: (product: Product) => void;
    onClose: () => void;
}> = ({ product, onSave, onClose }) => {
    const [name, setName] = useState(product?.name || '');
    const [price, setPrice] = useState(product?.price || '');
    const [description, setDescription] = useState(product?.description || '');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !price.trim()) {
            alert('Nome e Preço são obrigatórios.');
            return;
        }
        onSave({ id: product?.id || Date.now().toString(), name, price, description });
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
  const isInitialMount = useRef(true);
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product['id'] | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setFormState(settings);
    }
  }, [settings, isLoaded]);
  
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

  // Auto-save useEffect with validation
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }

    const isValid = validateForm(formState);
    if (!isValid) {
      setSaveStatus('error');
      return; // Stop the save process if validation fails
    }

    setSaveStatus('saving');
    const debounceTimer = setTimeout(() => {
        saveSettings(formState);
        setSaveStatus('saved');
        const idleTimer = setTimeout(() => setSaveStatus('idle'), 2000);
        return () => clearTimeout(idleTimer);
    }, 2000);

    return () => {
        clearTimeout(debounceTimer);
    };
  }, [formState, saveSettings]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
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

          <div className="space-y-4 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-fuchsia-300">Produtos Cadastrados</h3>
              <button type="button" onClick={handleAddProduct} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                <PlusCircleIcon className="w-5 h-5" /> Adicionar Produto
              </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-[#202124]">
                        <tr>
                            <th scope="col" className="px-4 py-3">Nome</th>
                            <th scope="col" className="px-4 py-3">Preço (R$)</th>
                            <th scope="col" className="px-4 py-3">Descrição</th>
                            <th scope="col" className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formState.products.length > 0 ? formState.products.map(p => (
                           <tr key={p.id} className="border-b border-gray-700 hover:bg-[#303134]">
                                <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                                <td className="px-4 py-3 text-gray-300">{p.price}</td>
                                <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{p.description}</td>
                                <td className="px-4 py-3 flex items-center justify-end gap-2">
                                    <button type="button" onClick={() => handleEditProduct(p)} className="p-1 text-gray-400 hover:text-fuchsia-400 transition-colors"><EditIcon className="w-4 h-4" /></button>
                                    <button type="button" onClick={() => handleDeleteProduct(p.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors"><Trash2Icon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-6 text-gray-500">Nenhum produto cadastrado.</td>
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
            {saveStatus === 'saving' && <p className="text-gray-400 text-sm animate-pulse">Salvando alterações...</p>}
            {saveStatus === 'saved' && <p className="text-green-400 text-sm">Todas as alterações foram salvas.</p>}
            {saveStatus === 'error' && <p className="text-red-400 text-sm">Por favor, corrija os erros para salvar as alterações.</p>}
            {saveStatus === 'idle' && formState !== settings && <p className="text-gray-500 text-sm">Suas alterações são salvas automaticamente.</p>}
          </div>
        </form>
      </div>
    </>
  );
};
