import React, { useState, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings.ts';
import type { SativarUser } from '../types.ts';
import { getSativarUsers } from '../services/wpApiService.ts';
import { Loader } from './Loader.tsx';
import { SearchIcon, UsersIcon, AlertTriangleIcon, BellIcon } from './icons.tsx';
import { ReminderModal } from './Reminders.tsx';

// A single row in the results table
const UserRow: React.FC<{ user: SativarUser; onAddReminder: (user: SativarUser) => void; }> = ({ user, onAddReminder }) => (
    <tr className="border-b border-gray-700/50 hover:bg-[#303134]/50 transition-colors">
        <td className="px-4 py-3 font-medium text-white align-top">
            {user.display_name}
        </td>
        <td className="px-4 py-3 text-gray-300 text-xs align-top">
            <div className="flex flex-col gap-1">
                {user.email && <div className="truncate" title={user.email}><strong>Email:</strong> {user.email}</div>}
                {user.acf_fields?.cpf && <div><strong>CPF:</strong> {user.acf_fields.cpf}</div>}
                {user.acf_fields?.telefone && <div><strong>Tel:</strong> {user.acf_fields.telefone}</div>}
                {user.acf_fields?.nome_completo_responc && <div className="truncate" title={`Responsável: ${user.acf_fields.nome_completo_responc}`}><strong>Resp:</strong> {user.acf_fields.nome_completo_responc}</div>}
            </div>
        </td>
        <td className="px-4 py-3 text-center align-top">
             <button
                onClick={() => onAddReminder(user)}
                className="p-2 rounded-full text-gray-400 hover:bg-fuchsia-900/50 hover:text-fuchsia-300 transition-colors duration-200"
                title="Criar lembrete para este associado"
                aria-label="Criar lembrete"
            >
                <BellIcon className="w-5 h-5" />
            </button>
        </td>
    </tr>
);

// The main search component
export const UserSearch: React.FC = () => {
    const { wpConfig } = useSettings();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SativarUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [reminderUser, setReminderUser] = useState<SativarUser | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const handleSearch = async () => {
        if (!wpConfig.url) {
            setError('A API do Sativar_WP_API não está configurada. Verifique as Configurações.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSearchPerformed(true);
        setCurrentPage(1);
        try {
            const searchResults = await getSativarUsers(wpConfig, searchTerm);
            setResults(searchResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Falha ao buscar associados.`);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddReminder = (user: SativarUser) => {
        setReminderUser(user);
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
                    <p className="font-semibold text-gray-300">Buscando associados...</p>
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
        if (!searchPerformed) {
            return null; // Don't show anything before the first search
        }
        if (results.length === 0) {
            return (
                 <div className="text-center py-10 my-4 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2"/>
                    <p>{`Nenhum associado encontrado para "${searchTerm}".`}</p>
                </div>
            );
        }
        return (
            <div className="mt-4">
                <div className="overflow-x-auto rounded-lg border border-gray-700/50">
                     <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-[#202124]">
                            <tr>
                                <th scope="col" className="px-4 py-3">Nome</th>
                                <th scope="col" className="px-4 py-3">Infos</th>
                                <th scope="col" className="px-4 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {paginatedResults.map(user => <UserRow key={user.id} user={user} onAddReminder={handleAddReminder} />)}
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
        <>
        {reminderUser && (
            <ReminderModal
                onClose={() => setReminderUser(null)}
                patientName={reminderUser.display_name}
            />
        )}
        <div className="mt-2 w-full space-y-4 text-sm bg-gradient-to-b from-[#252629] to-[#202124] rounded-xl border border-gray-700 p-4 shadow-lg">
            <h3 className="text-base font-semibold text-fuchsia-300">Consulta de Associados</h3>
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
                        placeholder="Buscar por nome, CPF ou e-mail..."
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
        </>
    );
};