import React, { useState } from 'react';
import type { User, UserRole } from '../../types.ts';
import { useModal } from '../../hooks/useModal.ts';
import { apiClient } from '../../services/database/apiClient.ts';
import { EyeIcon, EyeOffIcon, UsersIcon } from '../icons.tsx';
import { Modal } from '../Modal.tsx';

interface UserModalProps {
    user: User | null;
    onClose: () => void;
    onSaveSuccess: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSaveSuccess }) => {
    const [name, setName] = useState(user?.name || '');
    const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
    const [role, setRole] = useState<UserRole>(user?.role || 'user');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState('');
    const modal = useModal();
    const isEditing = !!user;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !role) {
            setError('Nome e função são obrigatórios.');
            return;
        }

        if (!isEditing && !password) {
            setError('A senha é obrigatória para novos usuários.');
            return;
        }
        
        if (password && password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password && password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        
        const userData = {
            name,
            whatsapp,
            role,
            ...(password && { password }) // Only include password if it's set
        };

        try {
            if (isEditing) {
                await apiClient.put(`/users/${user.id}`, userData);
            } else {
                await apiClient.post('/users', userData);
            }
            onSaveSuccess();
            onClose();
        } catch (err) {
            const apiError = err instanceof Error ? err.message : 'Erro desconhecido';
            setError(`Falha ao salvar: ${apiError}`);
        }
    };
    
    return (
        <Modal
            title={isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
            onClose={onClose}
            size="lg"
            icon={<UsersIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Cancelar</button>
                    <button type="submit" form="user-form" className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar</button>
                </>
            }
        >
            <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                    <input id="name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500" required />
                </div>
                <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300 mb-2">WhatsApp (Opcional)</label>
                    <input id="whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500" />
                </div>
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">Função</label>
                    <select id="role" value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500" disabled={user?.role === 'admin'}>
                        <option value="user">Usuário</option>
                        <option value="manager">Gerente</option>
                        <option value="admin">Admin</option>
                    </select>
                    {user?.role === 'admin' && <p className="text-xs text-gray-400 mt-1">A função do superadministrador não pode ser alterada.</p>}
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">{isEditing ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha'}</label>
                     <div className="relative">
                        <input
                            type={isPasswordVisible ? 'text' : 'password'}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 pr-10"
                            autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white">
                            {isPasswordVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                 {password && (
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirmar Nova Senha</label>
                        <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2" />
                    </div>
                 )}
                 {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            </form>
        </Modal>
    );
};