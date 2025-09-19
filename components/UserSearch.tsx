import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/database/apiClient.ts';
import type { Associate } from '../types.ts';
import { Loader } from './Loader.tsx';
import { SearchIcon, UserIcon } from './icons.tsx';

interface AssociateSearchProps {
    onAssociateSelect: (associate: Associate) => void;
}

export const UserSearch: React.FC<AssociateSearchProps> = ({ onAssociateSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Associate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchAssociates = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ search: searchQuery });
            const data = await apiClient.get<Associate[]>(`/seishat/associates?${params.toString()}`);
            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao buscar associados.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            searchAssociates(query);
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [query, searchAssociates]);

    return (
        <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-200">Buscar Associado no Seishat CRM</p>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-4 h-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Digite o nome ou CPF do associado..."
                    className="w-full bg-[#202124] border border-gray-600/50 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none"
                    autoFocus
                />
            </div>

            <div className="max-h-48 overflow-y-auto pr-2">
                {isLoading && (
                    <div className="flex justify-center py-4"><Loader /></div>
                )}
                {error && <p className="text-center text-red-400 text-sm py-4">{error}</p>}
                {!isLoading && !error && results.length > 0 && (
                    <ul className="space-y-1">
                        {results.map((associate) => (
                            <li key={associate.id}>
                                <button
                                    onClick={() => onAssociateSelect(associate)}
                                    className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-fuchsia-800/50 transition-colors"
                                >
                                    <UserIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-white">{associate.full_name}</p>
                                        <p className="text-xs text-gray-400">{associate.cpf || associate.whatsapp}</p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                 {!isLoading && !error && query.length > 1 && results.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">Nenhum associado encontrado.</p>
                 )}
            </div>
        </div>
    );
};