import React, { useState } from 'react';
import type { Associate, AssociateType } from '../../types.ts';
import { apiClient } from '../../services/database/apiClient.ts';
import { EyeIcon, EyeOffIcon, UsersIcon } from '../icons.tsx';
import { Modal } from '../Modal.tsx';

// Helper function for CPF validation
const validateCPF = (cpf: string): boolean => {
    if (!cpf) return true; // Optional field is valid if empty

    const cpfClean = cpf.replace(/[^\d]/g, '');

    if (cpfClean.length !== 11 || /^(\d)\1+$/.test(cpfClean)) {
        return false;
    }

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpfClean.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
        remainder = 0;
    }
    if (remainder !== parseInt(cpfClean.substring(9, 10))) {
        return false;
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpfClean.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
        remainder = 0;
    }
    if (remainder !== parseInt(cpfClean.substring(10, 11))) {
        return false;
    }

    return true;
};

// Helper function for WhatsApp masking
const formatWhatsapp = (value: string): string => {
    if (!value) return '';
    value = value.replace(/\D/g, ''); // Keep only digits
    value = value.slice(0, 11); // Limit to 11 digits

    if (value.length > 7) {
        return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
        return `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
        return `(${value.slice(0, 2)}`;
    }
    return value;
};

// FIX: Define the props interface for the component.
interface AssociateModalProps {
    associate: Associate | null;
    onClose: () => void;
    onSaveSuccess: () => void;
}

export const AssociateModal: React.FC<AssociateModalProps> = ({ associate, onClose, onSaveSuccess }) => {
    const [fullName, setFullName] = useState(associate?.full_name || '');
    const [cpf, setCpf] = useState(associate?.cpf || '');
    const [whatsapp, setWhatsapp] = useState(associate?.whatsapp || '');
    const [type, setType] = useState<AssociateType>(associate?.type || 'paciente');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState('');
    const [cpfError, setCpfError] = useState('');
    const [whatsappError, setWhatsappError] = useState('');
    const isEditing = !!associate;
    
    const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWhatsapp(formatWhatsapp(e.target.value));
        if (whatsappError) {
            setWhatsappError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCpfError('');
        setWhatsappError('');

        if (!fullName.trim() || !type) {
            setError('Nome completo e tipo são obrigatórios.');
            return;
        }

        if (cpf && !validateCPF(cpf)) {
            setCpfError('CPF inválido. Verifique o formato e os dígitos.');
            return;
        }

        const whatsappDigits = whatsapp.replace(/\D/g, '');
        if (whatsapp && whatsappDigits.length > 0 && whatsappDigits.length < 11) {
            setWhatsappError('WhatsApp inválido. Deve ter 11 dígitos (DDD + número).');
            return;
        }

        if (!isEditing && !password) {
            setError('A senha é obrigatória para novos associados.');
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
        
        const associateData = {
            full_name: fullName,
            cpf,
            whatsapp,
            type,
            ...(password && { password })
        };

        try {
            if (isEditing) {
                await apiClient.put(`/seishat/associates/${associate.id}`, associateData);
            } else {
                await apiClient.post('/seishat/associates', associateData);
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
            title={isEditing ? 'Editar Associado' : 'Adicionar Novo Associado'}
            onClose={onClose}
            size="lg"
            icon={<UsersIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Cancelar</button>
                    <button type="submit" form="associate-form" className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar</button>
                </>
            }
        >
            <form id="associate-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-2">Nome Completo</label>
                    <input id="full_name" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500" required />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="cpf" className="block text-sm font-medium text-gray-300 mb-2">CPF (Opcional)</label>
                        <input
                            id="cpf"
                            value={cpf}
                            onChange={e => setCpf(e.target.value)}
                            className={`w-full bg-[#202124] border text-white rounded-lg px-3 py-2 focus:ring-2 outline-none transition ${cpfError ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'}`}
                        />
                        {cpfError && <p className="text-red-400 text-xs mt-1">{cpfError}</p>}
                    </div>
                    <div>
                        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300 mb-2">WhatsApp (Opcional)</label>
                        <input
                            id="whatsapp"
                            value={whatsapp}
                            onChange={handleWhatsappChange}
                            placeholder="(XX) XXXXX-XXXX"
                            maxLength={15}
                            className={`w-full bg-[#202124] border text-white rounded-lg px-3 py-2 focus:ring-2 outline-none transition ${whatsappError ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'}`}
                        />
                        {whatsappError && <p className="text-red-400 text-xs mt-1">{whatsappError}</p>}
                    </div>
                </div>
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-2">Tipo de Associado</label>
                    <select id="type" value={type} onChange={e => setType(e.target.value as AssociateType)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500">
                        <option value="paciente">Paciente</option>
                        <option value="responsavel">Responsável por Paciente</option>
                        <option value="tutor">Tutor de Animal</option>
                        <option value="colaborador">Colaborador</option>
                    </select>
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