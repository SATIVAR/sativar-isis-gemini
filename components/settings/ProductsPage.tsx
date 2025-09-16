import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import type { Product, SativarSeishatProduct } from '../../types.ts';
import { StoreIcon, EditIcon, Trash2Icon, PlusCircleIcon, SearchIcon, PackageIcon, RefreshCwIcon, AlertTriangleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';
import { useModal } from '../../hooks/useModal.ts';
import { ProductModal, ProductIcon } from './ProductModal.tsx';

// --- Sativar_WP_API Products Component ---
const SativarWpProducts: React.FC = () => {
    const { sativarSeishatProducts, sativarSeishatCategories, isSativarSeishatLoading, sativarSeishatError, lastSativarSeishatSync, syncWithSativarSeishat } = useSettings();
    const [sativarSeishatSearch, setSativarSeishatSearch] = useState('');

    const filteredSativarSeishatProducts = sativarSeishatProducts.filter(p => {
        const searchTerm = sativarSeishatSearch.toLowerCase();
        const descriptionText = (p.short_description || '').replace(/<[^>]*>?/gm, '').toLowerCase();
        return (
            p.name.toLowerCase().includes(searchTerm) ||
            p.price.toLowerCase().includes(searchTerm) ||
            descriptionText.includes(searchTerm)
        );
    });

    const renderContent = () => {
        if (isSativarSeishatLoading && !lastSativarSeishatSync) {
            return (
                <div className="flex flex-col items-center justify-center gap-4 text-gray-400 py-20 rounded-lg border-2 border-dashed border-gray-700">
                    <Loader />
                    <p className="text-lg font-semibold text-gray-300">Sincronizando produtos...</p>
                    <p className="text-sm text-gray-500">Buscando dados do Sativar_WP_API.</p>
                </div>
            );
        }

        if (sativarSeishatError) {
            return (
                 <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-red-800/50 bg-red-900/20">
                    <AlertTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                    <h3 className="mt-4 text-lg font-semibold text-red-300">Falha na Sincronização</h3>
                    <p className="mt-1 text-sm text-red-400 max-w-md mx-auto">
                        Não foi possível conectar ao Sativar_WP_API. Verifique suas credenciais na página "Configuração da API" ou a URL do seu site.
                    </p>
                </div>
            );
        }

        if (sativarSeishatProducts.length === 0) {
            return (
                <div className="text-center py-10">
                    <PackageIcon className="mx-auto h-12 w-12 text-gray-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-300">Nenhum produto encontrado</h3>
                    <p className="mt-1 text-sm text-gray-400">
                        Nenhum produto foi encontrado no seu Sativar_WP_API ou a sincronização ainda não foi executada.
                    </p>
                </div>
            );
        }

        return (
            <>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 bg-[#202124] rounded-lg">
                        <p className="text-sm text-gray-400">Produtos</p>
                        <p className="text-2xl font-bold text-white">{sativarSeishatProducts.length}</p>
                    </div>
                    <div className="p-4 bg-[#202124] rounded-lg">
                        <p className="text-sm text-gray-400">Categorias</p>
                        <p className="text-2xl font-bold text-white">{sativarSeishatCategories.length}</p>
                    </div>
                </div>
                <div className="relative mb-4">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome, preço ou descrição..."
                        value={sativarSeishatSearch}
                        onChange={e => setSativarSeishatSearch(e.target.value)}
                        className="w-full bg-[#202124] border border-gray-700 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-fuchsia-500 outline-none"
                    />
                </div>
                <div className="overflow-auto max-h-96 pr-2">
                    <table className="w-full text-sm text-left">
                         <thead className="text-xs text-gray-400 uppercase bg-[#303134] sticky top-0">
                            <tr>
                                <th scope="col" className="px-4 py-3">Produto</th>
                                <th scope="col" className="px-4 py-3">Preço (R$)</th>
                                <th scope="col" className="px-4 py-3">Estoque</th>
                                <th scope="col" className="px-4 py-3">Categorias</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSativarSeishatProducts.map((p: SativarSeishatProduct) => (
                                <tr key={p.id} className="border-b border-gray-700 hover:bg-[#303134]/50">
                                    <td className="px-4 py-3 font-medium text-white">
                                        <div className="flex items-center gap-3">
                                            <img src={p.images[0]?.src || 'https://via.placeholder.com/40'} alt={p.name} className="w-10 h-10 rounded-md object-cover bg-gray-700"/>
                                            <span>{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{p.price}</td>
                                    <td className="px-4 py-3 text-gray-300">{p.stock_quantity ?? 'N/A'}</td>
                                    <td className="px-4 py-3 text-gray-300 max-w-xs">
                                        {p.categories.map(c => c.name).join(', ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    }

    return (
        <div className="space-y-4 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-fuchsia-300">Produtos (via Sativar_WP_API)</h3>
                    {lastSativarSeishatSync && !sativarSeishatError && (
                         <p className="text-xs text-gray-500 mt-1">Última sincronização: {lastSativarSeishatSync.toLocaleString()}</p>
                    )}
                </div>
                <button
                    onClick={syncWithSativarSeishat}
                    disabled={isSativarSeishatLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-fuchsia-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-fuchsia-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                    <RefreshCwIcon className={`w-4 h-4 ${isSativarSeishatLoading ? 'animate-spin' : ''}`} />
                    {isSativarSeishatLoading ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
            </div>
            {renderContent()}
        </div>
    );
};

// --- Seishat (Manual/Fallback) Products Component ---
const SeishatManualProducts: React.FC = () => {
    const { formState, setFormState } = useSettings();
    const modal = useModal();
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productSearch, setProductSearch] = useState('');
    
    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsProductModalOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleSaveProduct = (product: Product) => {
        const isEditing = !!editingProduct;
        const idExists = formState.products.some(p => isEditing ? p.id === product.id && p.id !== editingProduct.id : p.id === product.id);

        if (idExists) {
            modal.alert({ title: 'ID Duplicado', message: `O ID "${product.id}" já está em uso.` });
            return;
        }

        const newProducts = isEditing
            ? formState.products.map(p => (p.id === editingProduct.id ? product : p))
            : [...formState.products, product];
        setFormState(prev => ({ ...prev, products: newProducts }));
        setIsProductModalOpen(false);
        setEditingProduct(null);
    };

    const handleDeleteProduct = async (id: Product['id']) => {
        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão', message: 'Tem certeza que deseja excluir este produto?',
            confirmLabel: 'Excluir', danger: true
        });
        if(confirmed) {
            setFormState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
        }
    };
    
    const filteredProducts = formState.products.filter(product =>
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.price.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.description.toLowerCase().includes(productSearch.toLowerCase())
    );

    return (
        <>
            {isProductModalOpen && <ProductModal product={editingProduct} onSave={handleSaveProduct} onClose={() => setIsProductModalOpen(false)} />}
            <div className="space-y-4 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-fuchsia-300">Produtos Manuais (Fallback / Seishat)</h3>
                         <p className="text-sm text-gray-400 -mt-1">
                            Estes produtos são usados se a conexão com Sativar_WP_API falhar ou para itens que não estão no catálogo principal.
                        </p>
                    </div>
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
                        className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-[#202124]">
                            <tr>
                                <th scope="col" className="px-4 py-3">ID</th>
                                <th scope="col" className="px-4 py-3">Produto</th>
                                <th scope="col" className="px-4 py-3">Preço (R$)</th>
                                <th scope="col" className="px-4 py-3">Descrição</th>
                                <th scope="col" className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(p => (
                                <tr key={p.id} className="border-b border-gray-700 hover:bg-[#303134]">
                                        <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">{p.id}</td>
                                        <td className="px-4 py-3 font-medium text-white">
                                        <div className="flex items-center gap-3">
                                            <ProductIcon icon={p.icon} />
                                            <span>{p.name}</span>
                                        </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">{p.price}</td>
                                        <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={p.description}>{p.description}</td>
                                        <td className="px-4 py-3 flex items-center justify-end gap-2">
                                            <button type="button" onClick={() => handleEditProduct(p)} className="p-1 text-gray-400 hover:text-fuchsia-400"><EditIcon className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => handleDeleteProduct(p.id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2Icon className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500">
                                      Nenhum produto manual cadastrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

// --- Main Page Component with Tabs ---
export const SeishatProductsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'wp_api' | 'seishat'>('wp_api');

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-2">
                    <StoreIcon className="w-8 h-8 text-fuchsia-300" />
                    <h2 className="text-2xl font-bold text-white">Gerenciamento de Produtos</h2>
                </div>
                <p className="text-gray-400 mb-6">
                    Gerencie os produtos do catálogo principal (Sativar_WP_API) e os produtos manuais do Seishat (usados como fallback).
                </p>
                
                <div className="border-b border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('wp_api')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === 'wp_api' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
                        >
                            Produtos Sativar_WP_API
                        </button>
                        <button
                            onClick={() => setActiveTab('seishat')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === 'seishat' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
                        >
                            Produtos Seishat
                        </button>
                    </nav>
                </div>

                <div>
                    {activeTab === 'wp_api' && <SativarWpProducts />}
                    {activeTab === 'seishat' && <SeishatManualProducts />}
                </div>
            </div>
        </div>
    );
};
