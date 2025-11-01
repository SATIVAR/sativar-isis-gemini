
import React, { useState, useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import type { Product } from '../../types.ts';
import { BarChart2Icon, EditIcon, Trash2Icon, PlusCircleIcon, SearchIcon, ChevronDownIcon } from '../icons.tsx';
import { useModal } from '../../hooks/useModal.ts';
import { ProductModal, ProductIcon } from './ProductModal.tsx';

type SortableKeys = keyof Product;
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: SortableKeys;
  direction: SortDirection;
}

export const PriceTablePage: React.FC = () => {
    const { formState, setFormState } = useSettings();
    const modal = useModal();
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productSearch, setProductSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });

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

        const idExists = formState.products.some(p => {
            if (isEditing && p.id === editingProduct.id) {
                return false;
            }
            return p.id === product.id;
        });

        if (idExists) {
            modal.alert({
                title: 'ID Duplicado',
                message: `O ID "${product.id}" já está em uso por outro produto. Por favor, use um ID único.`
            });
            return;
        }

        const newProducts = editingProduct
            ? formState.products.map(p => (p.id === editingProduct.id ? product : p))
            : [...formState.products, product];
        setFormState(prev => ({ ...prev, products: newProducts }));
        setIsProductModalOpen(false);
        setEditingProduct(null);
    };

    const handleDeleteProduct = async (id: Product['id']) => {
        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja excluir este produto?',
            confirmLabel: 'Excluir',
            danger: true
        });

        if (confirmed) {
            const newProducts = formState.products.filter(p => p.id !== id);
            setFormState(prev => ({ ...prev, products: newProducts }));
        }
    };
    
    const requestSort = (key: SortableKeys) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredProducts = useMemo(() => {
        let sortableItems = [...formState.products];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                
                if (aVal === undefined || bVal === undefined) return 0;

                if (sortConfig.key === 'price') {
                    const priceA = parseFloat(String(aVal));
                    const priceB = parseFloat(String(bVal));
                    if (priceA < priceB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (priceA > priceB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }
                
                if (String(aVal).toLowerCase() < String(bVal).toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (String(aVal).toLowerCase() > String(bVal).toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return sortableItems.filter(product =>
            product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            product.price.toLowerCase().includes(productSearch.toLowerCase()) ||
            product.description.toLowerCase().includes(productSearch.toLowerCase())
        );
    }, [formState.products, productSearch, sortConfig]);

    const SortableHeader: React.FC<{ sortKey: SortableKeys; children: React.ReactNode }> = ({ sortKey, children }) => {
        const isSorted = sortConfig.key === sortKey;
        const isAsc = sortConfig.direction === 'ascending';
        return (
            <th scope="col" className="px-4 py-3 cursor-pointer select-none" onClick={() => requestSort(sortKey)}>
                <div className="flex items-center gap-1">
                    {children}
                    {isSorted && <ChevronDownIcon className={`w-4 h-4 transition-transform ${isAsc ? '' : 'rotate-180'}`} />}
                </div>
            </th>
        );
    };

    return (
        <>
            {isProductModalOpen && <ProductModal product={editingProduct} onSave={handleSaveProduct} onClose={() => setIsProductModalOpen(false)} />}
            <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <BarChart2Icon className="w-8 h-8 text-fuchsia-300" />
                            <h2 className="text-2xl font-bold text-white">Tabela de Preços (Fallback)</h2>
                        </div>
                        <p className="text-gray-400">
                            Visualize, ordene e gerencie os produtos manuais de fallback.
                        </p>
                    </div>
                    <button type="button" onClick={handleAddProduct} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-green-600 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                        <PlusCircleIcon className="w-5 h-5" /> Adicionar Produto
                    </button>
                </div>

                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar produtos..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none transition shadow-inner"
                        aria-label="Buscar produtos de fallback"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-[#303134]">
                            <tr>
                                <SortableHeader sortKey="name">Produto</SortableHeader>
                                <SortableHeader sortKey="price">Preço (R$)</SortableHeader>
                                <SortableHeader sortKey="description">Descrição</SortableHeader>
                                <th scope="col" className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredProducts.length > 0 ? (
                                sortedAndFilteredProducts.map(p => (
                                    <tr key={p.id} className="border-b border-gray-700 hover:bg-[#303134]/50">
                                        <td className="px-4 py-3 font-medium text-white">
                                            <div className="flex items-center gap-3">
                                                <ProductIcon icon={p.icon} />
                                                <span>{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">{parseFloat(p.price).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={p.description}>{p.description}</td>
                                        <td className="px-4 py-3 flex items-center justify-end gap-2">
                                            <button type="button" onClick={() => handleEditProduct(p)} className="p-1 text-gray-400 hover:text-fuchsia-400 transition-colors" aria-label={`Editar ${p.name}`}><EditIcon className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => handleDeleteProduct(p.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors" aria-label={`Excluir ${p.name}`}><Trash2Icon className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500">
                                        {formState.products.length > 0 ? `Nenhum produto encontrado para "${productSearch}".` : "Nenhum produto de fallback cadastrado."}
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
