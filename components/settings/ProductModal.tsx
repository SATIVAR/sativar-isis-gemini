
import React, { useState } from 'react';
import type { Product } from '../../types.ts';
import { PackageIcon, DropletIcon, SunriseIcon, LeafIcon } from '../icons.tsx';

export const ProductIcon: React.FC<{ icon?: string; className?: string }> = ({ icon, className = 'w-5 h-5 text-gray-400' }) => {
    switch (icon) {
        case 'droplet': return <DropletIcon className={className} />;
        case 'sunrise': return <SunriseIcon className={className} />;
        case 'leaf': return <LeafIcon className={className} />;
        default: return <PackageIcon className={className} />;
    }
};

export const ProductModal: React.FC<{
    product: Product | null;
    onSave: (product: Product) => void;
    onClose: () => void;
}> = ({ product, onSave, onClose }) => {
    const [id, setId] = useState(product?.id?.toString() || '');
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

        const finalId = id.trim()
            ? /^\d+$/.test(id.trim())
                ? parseInt(id.trim(), 10)
                : id.trim()
            : crypto.randomUUID();

        const formattedPrice = parseFloat(sanitizedPrice).toFixed(2);
        onSave({ id: finalId, name, price: formattedPrice, description, icon });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#303134] rounded-xl border border-gray-700 p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <h3 className="text-xl font-bold mb-6 text-white">{product ? 'Editar Produto' : 'Adicionar Produto'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="id" className="block text-sm font-medium text-gray-300 mb-2">ID do Produto (Opcional)</label>
                            <input
                                id="id"
                                value={id}
                                onChange={e => setId(e.target.value)}
                                className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition font-mono"
                                placeholder="ID do Sativar - Seishat para mapeamento"
                            />
                             <p className="text-xs text-gray-400 mt-1">Deixe em branco para gerar um ID automático para um novo produto de fallback.</p>
                        </div>
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
                          <input id="description" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition" placeholder="Ex: Óleo de CBD 20% 10ml" />
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
