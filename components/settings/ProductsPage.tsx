
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import type { Product, WooProduct } from '../../types.ts';
import { StoreIcon, EditIcon, Trash2Icon, PlusCircleIcon, SearchIcon, PackageIcon, DropletIcon, SunriseIcon, LeafIcon, RefreshCwIcon, AlertTriangleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';
import { useModal } from '../../hooks/useModal.ts';

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
    const [errors, setErrors] = useState({ name: '', price: '' });

    const availableIcons = [
        { id: 'package', name: 'Padrão', Icon: PackageIcon },
        { id: 'droplet', name: 'Óleo/Gotas', Icon: DropletIcon },
        { id: 'sunrise', name: 'Pomada', Icon: SunriseIcon },
        { id: 'leaf', name: 'Flor/In Natura', Icon: LeafIcon },
    ];

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors = { name: '', price: '' };
        let isValid = true;

        if (!name.trim()) {
            newErrors.name = 'O nome do produto é obrigatório.';
            isValid = false;
        }

        const sanitizedPrice = price.replace(',', '.').trim();
        if (!sanitizedPrice) {
            newErrors.price = 'O preço é obrigatório.';
            isValid = false;
        } else if (isNaN(parseFloat(sanitizedPrice)) || !isFinite(parseFloat(sanitizedPrice)) || parseFloat(sanitizedPrice) < 0) {
            newErrors.price = 'Por favor, insira um preço válido (ex: 250.00).';
            isValid = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            return;
        }

        const formattedPrice = parseFloat(sanitizedPrice).toFixed(2);
        onSave({ id: product?.id || crypto.randomUUID(), name, price: formattedPrice, description, icon });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#303134] rounded-xl border border-gray-700 p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <h3 className="text-xl font-bold mb-6 text-white">{product ? 'Editar Produto' : 'Adicionar Produto'}</h3>
                    <div className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Nome do Produto</label>
                          <input id="name" value={name} onChange={e => setName(e.target.value)} className={`w-full bg-[#202124] border text-white rounded-lg px-3 py-2 focus:ring-2 outline-none transition ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'}`} required />
                          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">Preço (R$)</label>
                          <input id="price" value={price} onChange={e => setPrice(e.target.value)} className={`w-full bg-[#202124] border text-white rounded-lg px-3 py-2 focus:ring-2 outline-none transition ${errors.price ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'}`} required placeholder="Ex: 250.00" />
                          {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
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

const WooCommerceProducts: React.FC = () => {
    const { wooProducts, wooCategories, isWooLoading, wooError, lastWooSync, syncWithWooCommerce } = useSettings();
    const [wooSearch, setWooSearch] = useState('');

    const filteredWooProducts = wooProducts.filter(p => {
        const searchTerm = wooSearch.toLowerCase();
        const descriptionText = (p.short_description || '').replace(/<[^>]*>?/gm, '').toLowerCase();
        return (
            p.name.toLowerCase().includes(searchTerm) ||
            p.price.toLowerCase().includes(searchTerm) ||
            descriptionText.includes(searchTerm)
        );
    });

    const renderContent = () => {
        if (isWooLoading && !lastWooSync) { // Show big loader only on initial sync
            return (
                <div className="flex flex-col items-center justify-center gap-4 text-gray-400 py-20 rounded-lg border-2 border-dashed border-gray-700">
                    <Loader />
                    <p className="text-lg font-semibold text-gray-300">Sincronizando produtos...</p>
                    <p className="text-sm text-gray-500">Buscando dados do WooCommerce.</p>
                </div>
            );
        }

        if (wooError) {
            return (
                 <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-red-800/50 bg-red-900/20">
                    <AlertTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                    <h3 className="mt-4 text-lg font-semibold text-red-300">Falha na Sincronização</h3>
                    <p className="mt-1 text-sm text-red-400 max-w-md mx-auto">
                        Não foi possível conectar ao WooCommerce. Verifique suas credenciais na página "Configuração da API" ou a URL do seu site.
                    </p>
                </div>
            );
        }

        if (wooProducts.length === 0) {
            return (
                <div className="text-center py-10">
                    <PackageIcon className="mx-auto h-12 w-12 text-gray-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-300">Nenhum produto encontrado</h3>
                    <p className="mt-1 text-sm text-gray-400">
                        Nenhum produto foi encontrado no seu WooCommerce ou a sincronização ainda não foi executada.
                    </p>
                </div>
            );
        }

        return (
            <>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 bg-[#202124] rounded-lg">
                        <p className="text-sm text-gray-400">Produtos</p>
                        <p className="text-2xl font-bold text-white">{wooProducts.length}</p>
                    </div>
                    <div className="p-4 bg-[#202124] rounded-lg">
                        <p className="text-sm text-gray-400">Categorias</p>
                        <p className="text-2xl font-bold text-white">{wooCategories.length}</p>
                    </div>
                </div>
                <div className="relative mb-4">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome, preço ou descrição..."
                        value={wooSearch}
                        onChange={e => setWooSearch(e.target.value)}
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
                            {filteredWooProducts.map((p: WooProduct) => (
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
                    <h3 className="text-lg font-semibold text-fuchsia-300">Produtos (via WooCommerce)</h3>
                    {lastWooSync && !wooError && (
                         <p className="text-xs text-gray-500 mt-1">Última sincronização: {lastWooSync.toLocaleString()}</p>
                    )}
                </div>
                <button
                    onClick={syncWithWooCommerce}
                    disabled={isWooLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-fuchsia-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-fuchsia-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                    <RefreshCwIcon className={`w-4 h-4 ${isWooLoading ? 'animate-spin' : ''}`} />
                    {isWooLoading ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
            </div>
            {renderContent()}
        </div>
    );
};


export const ProductsPage: React.FC = () => {
    const { formState, setFormState } = useSettings();
    const modal = useModal();
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productSearch, setProductSearch] = useState('');
    
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

    const handleDeleteProduct = async (id: Product['id']) => {
        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja excluir este produto?',
            confirmLabel: 'Excluir',
            danger: true
        });

        if(confirmed) {
            const newProducts = formState.products.filter(p => p.id !== id);
            setFormState(prev => ({ ...prev, products: newProducts }));
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
        <div className="max-w-4xl mx-auto space-y-8">
             <div className="bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-2">
                    <StoreIcon className="w-8 h-8 text-fuchsia-300" />
                    <h2 className="text-2xl font-bold text-white">Produtos</h2>
                </div>
                <p className="text-gray-400 mb-6">
                    Gerencie os produtos que a Ísis usará para montar os orçamentos. A prioridade será dada aos produtos do WooCommerce.
                </p>
                <WooCommerceProducts />
            </div>

            <div className="bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
                <div className="space-y-4 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-fuchsia-300">Produtos Manuais (Fallback)</h3>
                             <p className="text-sm text-gray-400 -mt-1">
                                Estes produtos são usados apenas se a conexão com o WooCommerce falhar.
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
                                                <h3 className="mt-4 text-lg font-semibold text-gray-300">Nenhum produto manual cadastrado</h3>
                                                <p className="mt-1 text-sm text-gray-400">
                                                    Adicione produtos aqui caso a conexão com o WooCommerce falhe.
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
        </div>
    </>
    );
};
