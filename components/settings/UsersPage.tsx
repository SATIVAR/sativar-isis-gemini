import React, { useState, useEffect, useMemo } from 'react';
import { useModal } from '../../hooks/useModal.ts';
import { apiClient } from '../../services/database/apiClient.ts';
import type { User, UserRole } from '../../types.ts';
import { Loader } from '../Loader.tsx';
import { UsersIcon, PlusCircleIcon, SearchIcon, EditIcon, Trash2Icon } from '../icons.tsx';
import { UserModal } from './UserModal.tsx';

export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const modal = useModal();

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const fetchedUsers = await apiClient.get<User[]>('/users');
            setUsers(fetchedUsers);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };
    
    const handleDeleteUser = async (user: User) => {
        if (user.role === 'admin') {
            modal.alert({ title: 'Ação Inválida', message: 'O superadministrador não pode ser excluído.' });
            return;
        }
        
        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir o usuário "${user.name}"?`,
            confirmLabel: 'Excluir',
            danger: true
        });

        if (confirmed) {
            try {
                await apiClient.delete(`/users/${user.id}`);
                await fetchUsers(); // Refresh the list
            } catch (err) {
                modal.alert({ title: 'Erro', message: `Falha ao excluir usuário: ${err instanceof Error ? err.message : 'Erro desconhecido'}`});
            }
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.whatsapp?.toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    const roleInfo: Record<UserRole, { label: string; className: string }> = {
        admin: { label: 'Admin', className: 'bg-fuchsia-800 text-fuchsia-200' },
        manager: { label: 'Gerente', className: 'bg-blue-800 text-blue-200' },
        user: { label: 'Usuário', className: 'bg-gray-600 text-gray-300' },
    };

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center items-center py-10"><Loader /></div>;
        if (error) return <div className="text-center text-red-400 py-10">{error}</div>;

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-[#202124]">
                        <tr>
                            <th scope="col" className="px-4 py-3">Nome</th>
                            <th scope="col" className="px-4 py-3">WhatsApp</th>
                            <th scope="col" className="px-4 py-3">Função</th>
                            <th scope="col" className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="border-b border-gray-700 hover:bg-[#202124]/50">
                                <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                                <td className="px-4 py-3 text-gray-300">{user.whatsapp || 'N/A'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleInfo[user.role]?.className || roleInfo.user.className}`}>
                                        {roleInfo[user.role]?.label || user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 flex items-center justify-end gap-2">
                                    <button onClick={() => handleEditUser(user)} className="p-1 text-gray-400 hover:text-fuchsia-400"><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteUser(user)} className="p-1 text-gray-400 hover:text-red-400" disabled={user.role === 'admin'}><Trash2Icon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredUsers.length === 0 && (
                     <div className="text-center py-10 text-gray-500">
                         {search ? `Nenhum usuário encontrado para "${search}"` : "Nenhum usuário cadastrado."}
                     </div>
                 )}
            </div>
        );
    };

    return (
        <>
            {isModalOpen && <UserModal user={editingUser} onClose={() => setIsModalOpen(false)} onSaveSuccess={fetchUsers} />}
            <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <UsersIcon className="w-8 h-8 text-fuchsia-300" />
                            <h2 className="text-2xl font-bold text-white">Usuários do Sistema</h2>
                        </div>
                        <p className="text-gray-400">
                            Gerencie os usuários que podem acessar o sistema.
                        </p>
                    </div>
                    <button onClick={handleAddUser} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-green-600 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                        <PlusCircleIcon className="w-5 h-5" /> Adicionar Usuário
                    </button>
                </div>

                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome ou WhatsApp..."
                        className="w-full bg-[#202124] border border-gray-600/50 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none"
                    />
                </div>
                {renderContent()}
            </div>
        </>
    );
};