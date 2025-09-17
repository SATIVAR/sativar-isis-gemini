import React, { useState, useEffect, useMemo } from 'react';
import { useModal } from '../../hooks/useModal.ts';
import { apiClient } from '../../services/database/apiClient.ts';
import type { Associate, AssociateType } from '../../types.ts';
import { Loader } from '../Loader.tsx';
import { UsersIcon, PlusCircleIcon, SearchIcon, EditIcon, Trash2Icon } from '../icons.tsx';
import { AssociateModal } from './AssociateModal.tsx';

export const AssociatesPage: React.FC = () => {
    const [associates, setAssociates] = useState<Associate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssociate, setEditingAssociate] = useState<Associate | null>(null);
    const modal = useModal();

    const fetchAssociates = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) {
                params.append('search', search);
            }
            const fetchedAssociates = await apiClient.get<Associate[]>(`/seishat/associates?${params.toString()}`);
            setAssociates(fetchedAssociates);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao carregar associados.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchAssociates();
        }, 300); // Debounce search
        return () => clearTimeout(handler);
    }, [search]);

    const handleAddAssociate = () => {
        setEditingAssociate(null);
        setIsModalOpen(true);
    };

    const handleEditAssociate = (associate: Associate) => {
        setEditingAssociate(associate);
        setIsModalOpen(true);
    };
    
    const handleDeleteAssociate = async (associate: Associate) => {
        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir o associado "${associate.full_name}"?`,
            confirmLabel: 'Excluir',
            danger: true
        });

        if (confirmed) {
            try {
                await apiClient.delete(`/seishat/associates/${associate.id}`);
                await fetchAssociates();
            } catch (err) {
                modal.alert({ title: 'Erro', message: `Falha ao excluir associado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`});
            }
        }
    };

    const typeInfo: Record<AssociateType, { label: string; className: string }> = {
        paciente: { label: 'Paciente', className: 'bg-green-800 text-green-200' },
        responsavel: { label: 'Responsável', className: 'bg-blue-800 text-blue-200' },
        tutor: { label: 'Tutor de Animal', className: 'bg-yellow-800 text-yellow-200' },
        colaborador: { label: 'Colaborador', className: 'bg-purple-800 text-purple-200' },
    };

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center items-center py-10"><Loader /></div>;
        if (error) return <div className="text-center text-red-400 py-10">{error}</div>;

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-[#303134]">
                        <tr>
                            <th scope="col" className="px-4 py-3">Nome Completo</th>
                            <th scope="col" className="px-4 py-3">CPF</th>
                            <th scope="col" className="px-4 py-3">WhatsApp</th>
                            <th scope="col" className="px-4 py-3">Tipo</th>
                            <th scope="col" className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {associates.map(associate => (
                            <tr key={associate.id} className="border-b border-gray-700 hover:bg-[#202124]/50">
                                <td className="px-4 py-3 font-medium text-white">{associate.full_name}</td>
                                <td className="px-4 py-3 text-gray-300 font-mono">{associate.cpf || 'N/A'}</td>
                                <td className="px-4 py-3 text-gray-300">{associate.whatsapp || 'N/A'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeInfo[associate.type]?.className}`}>
                                        {typeInfo[associate.type]?.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 flex items-center justify-end gap-2">
                                    <button onClick={() => handleEditAssociate(associate)} className="p-1 text-gray-400 hover:text-fuchsia-400"><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteAssociate(associate)} className="p-1 text-gray-400 hover:text-red-400"><Trash2Icon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {associates.length === 0 && (
                     <div className="text-center py-10 text-gray-500">
                         {search ? `Nenhum associado encontrado para "${search}"` : "Nenhum associado cadastrado."}
                     </div>
                 )}
            </div>
        );
    };

    return (
        <>
            {isModalOpen && <AssociateModal associate={editingAssociate} onClose={() => setIsModalOpen(false)} onSaveSuccess={fetchAssociates} />}
            <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <UsersIcon className="w-8 h-8 text-fuchsia-300" />
                            <h2 className="text-2xl font-bold text-white">Associados (Seishat)</h2>
                        </div>
                        <p className="text-gray-400">
                            Gerencie os pacientes, tutores e outros associados do CRM.
                        </p>
                    </div>
                    <button onClick={handleAddAssociate} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-green-600 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                        <PlusCircleIcon className="w-5 h-5" /> Adicionar Associado
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
                        placeholder="Buscar por nome ou CPF..."
                        className="w-full bg-[#202124] border border-gray-600/50 text-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none"
                    />
                </div>
                {renderContent()}
            </div>
        </>
    );
};