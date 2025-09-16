import React, { useState, useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import type { Product } from '../../types.ts';
import { StoreIcon, EditIcon, Trash2Icon, PlusCircleIcon, SearchIcon, PackageIcon } from '../icons.tsx';
import { useModal } from '../../hooks/useModal.ts';
import { ProductModal, ProductIcon } from './ProductModal.tsx';


const ProductManager: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct } = useSettings();
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

    const handleSaveProduct = async (product: Product) => {
        const isEditing = !!editingProduct;
        try {
            if (isEditing) {
                await updateProduct(product);
            } else {
                await addProduct(product);
            }
            setIsProductModalOpen(false);
            setEditingProduct(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            modal.alert({ title: 'Erro ao Salvar', message });
        }
    };

    const handleDeleteProduct = async (productToDelete: Product) => {
        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão', 
            message: `Tem certeza que deseja excluir o produto "${productToDelete.name}"?`,
            confirmLabel: 'Excluir', 
            danger: true
        });
        if(confirmed) {
            try {
                await deleteProduct(productToDelete.id);
            } catch (error) {
                 const message = error instanceof Error ? error.message : 'Erro desconhecido';
                modal.alert({ title: 'Erro ao Excluir', message });
            }
        }
    };
    
    const filteredProducts = useMemo(() => {
        return products.filter(product =>
            product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            product.price.toLowerCase().includes(productSearch.toLowerCase()) ||
            product.description.toLowerCase().includes(productSearch.toLowerCase())
        );
    }, [products, productSearch]);


    return (
        <>
            {isProductModalOpen && <ProductModal product={editingProduct} onSave={handleSaveProduct} onClose={() => setIsProductModalOpen(false)} />}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="relative flex-grow">
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
                    <button type="button" onClick={handleAddProduct} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-green-600 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                        <PlusCircleIcon className="w-5 h-5" /> Adicionar Produto
                    </button>
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
                            {filteredProducts.length > 0 ? (
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
                                            <button type="button" onClick={() => handleEditProduct(p)} className="p-1 text-gray-400 hover:text-fuchsia-400"><EditIcon className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => handleDeleteProduct(p)} className="p-1 text-gray-400 hover:text-red-400"><Trash2Icon className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500">
                                      <div className="flex flex-col items-center justify-center gap-2">
                                        <PackageIcon className="w-10 h-10" />
                                        <span>
                                          {productSearch ? `Nenhum produto encontrado para "${productSearch}".` : "Nenhum produto cadastrado."}
                                        </span>
                                      </div>
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

export const ProductsPage: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-2">
                    <StoreIcon className="w-8 h-8 text-fuchsia-300" />
                    <h2 className="text-2xl font-bold text-white">Gerenciamento de Produtos</h2>
                </div>
                <p className="text-gray-400 mb-6">
                    Gerencie os produtos que serão utilizados pela Ísis para gerar orçamentos.
                </p>
                <ProductManager />
            </div>
        </div>
    );
};
