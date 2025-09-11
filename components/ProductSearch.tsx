import React, { useState, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings.ts';
import type { WooProduct } from '../types.ts';
import { getProducts } from '../services/wpApiService.ts';
import { Loader } from './Loader.tsx';
import { SearchIcon, PackageIcon, AlertTriangleIcon } from './icons.tsx';

const ProductRow: React.FC<{ product: WooProduct }> = ({ product }) => (
    <tr className="border-b border-gray-700/50 hover:bg-[#303134]/50 transition-colors">
        <td className="px-4 py-3 font-medium text-white">
            <div className="flex items-center gap-3">
                <img src={product.images?.[0]?.src || 'https://via.placeholder.com/40'} alt={product.name} className="w-10 h-10 rounded-md object-cover bg-gray-700"/>
                <span className="line-clamp-2">{product.name}</span>
            </div>
        </td>
        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">R$ {product.price}</td>
        <td className="px-4 py-3 text-gray-300">{product.stock_quantity ?? 'N/A'}</td>
        <td className="px-4 py-3 text-gray-300 max-w-[150px] truncate" title={product.categories?.map(c => c.name).join(', ') || ''}>
            {product.categories?.map(c => c.name).join(', ') || ''}
        </td>
    </tr>
);

export const ProductSearch: React.FC = () => {
    const { wpConfig, wooProducts: initialProducts } = useSettings();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<WooProduct[]>(initialProducts);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const handleSearch = async () => {
        if (!wpConfig.url || !wpConfig.consumerKey) {
            setError('A API do WooCommerce não está configurada. Verifique as Configurações.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSearchPerformed(true);
        setCurrentPage(1);
        try {
            const searchResults = await getProducts(wpConfig, searchTerm);
            setResults(searchResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Falha ao buscar produtos.`);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const paginatedResults = useMemo(() => {
        return results.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [results, currentPage]);

    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);

    const renderContent = () => {
         if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center gap-3 text-gray-400 py-10 my-4 rounded-lg border-2 border-dashed border-gray-700">
                    <Loader />
                    <p className="font-semibold text-gray-300">Buscando produtos...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex items-center gap-3 p-3 my-4 text-sm text-red-300 bg-red-900/40 rounded-lg border border-red-700/50">
                    <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            );
        }
         if (results.length === 0) {
            return (
                 <div className="text-center py-10 my-4 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg">
                    <PackageIcon className="w-8 h-8 mx-auto mb-2"/>
                    <p>{searchPerformed ? `Nenhum produto encontrado para "${searchTerm}".` : 'Nenhum produto carregado. Tente sincronizar na página de produtos.'}</p>
                </div>
            )
        }
        return (
            <div className="mt-4">
                <div className="overflow-x-auto rounded-lg border border-gray-700/50">
                     <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-[#202124]">
                            <tr>
                                <th scope="col" className="px-4 py-3">Produto</th>
                                <th scope="col" className="px-4 py-3">Preço</th>
                                <th scope="col" className="px-4 py-3">Estoque</th>
                                <th scope="col" className="px-4 py-3">Categorias</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {paginatedResults.map(product => <ProductRow key={product.id} product={product} />)}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
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
                )}
            </div>
        );
    };

    return (
        <div className="mt-2 w-full space-y-4 text-sm bg-gradient-to-b from-[#252629] to-[#202124] rounded-xl border border-gray-700 p-4 shadow-lg">
            <h3 className="text-base font-semibold text-fuchsia-300">Consulta de Produtos WooCommerce</h3>
            <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                        placeholder="Buscar por nome do produto..."
                        className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none transition"
                    />
                </div>
                 <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="px-4 py-2 bg-fuchsia-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-fuchsia-600 transition-colors disabled:opacity-50 disabled:cursor-wait flex-shrink-0"
                >
                    {isLoading ? <Loader /> : 'Buscar' }
                </button>
            </div>
            {renderContent()}
        </div>
    );
};