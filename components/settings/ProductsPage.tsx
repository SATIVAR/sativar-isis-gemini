import React, { useState, useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import type { Product } from '../../types.ts';
import { StoreIcon, EditIcon, Trash2Icon, PlusCircleIcon, SearchIcon, PackageIcon } from '../icons.tsx';
import { useModal } from '../../hooks/useModal.ts';
import { ProductModal, ProductIcon } from './ProductModal.tsx';

// This component now merges the functionality of the old 'SeishatManualProducts'
// and is the single source for managing fallback/manual products.
export const SeishatProductsPage: React.FC = () => {
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
            ? formState.products.map(p => (p.id === editingProduct!.id ? product : p))
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
    
    const filteredProducts = useMemo(() => formState.products.filter(product =>
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.price.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.description.toLowerCase().includes(productSearch.toLowerCase())
    ), [formState.products, productSearch]);

    return (
        <>
            {isProductModalOpen && <ProductModal product={editingProduct} onSave={handleSaveProduct} onClose={() => setIsProductModalOpen(false)} />}
            <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
                 <div className="flex items-center gap-4 mb-2">
                    <StoreIcon className="w-8 h-8 text-fuchsia-300" />
                    <h2 className="text-2xl font-bold text-white">Gerenciamento de Produtos</h2>
                </div>
                <p className="text-gray-400 mb-6">
                    Gerencie os produtos manuais. Estes produtos são usados pela IA como catálogo principal para gerar orçamentos.
                </p>

                <div className="space-y-4 p-6 bg-[#202124]/50 border border-gray-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-fuchsia-300">Produtos Manuais (Catálogo Principal)</h3>
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
                            className="w-full bg-[#202124] border border-gray-600/50 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-[#303134]">
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
                                    <tr key={p.id} className="border-b border-gray-700 hover:bg-[#202124]">
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
                                            <div className="text-center py-10">
                                                <PackageIcon className="mx-auto h-12 w-12 text-gray-500" />
                                                <h3 className="mt-4 text-lg font-semibold text-gray-300">Nenhum produto encontrado</h3>
                                                <p className="mt-1 text-sm text-gray-400">
                                                    Adicione produtos manuais para que a Ísis possa gerar orçamentos.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};