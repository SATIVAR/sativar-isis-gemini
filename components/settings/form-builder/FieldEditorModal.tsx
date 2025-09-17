
import React, { useState } from 'react';
import { apiClient } from '../../services/database/apiClient.ts';
import type { FormField, FormFieldType } from '../../../types.ts';
import { Modal } from '../../Modal.tsx';
import { PlusCircleIcon } from '../../icons.tsx';

interface FieldEditorModalProps {
    field?: FormField | null;
    onClose: () => void;
    onSaveSuccess: () => void;
}

const fieldTypes: { id: FormFieldType, label: string }[] = [
    { id: 'text', label: 'Texto Curto' },
    { id: 'textarea', label: 'Texto Longo' },
    { id: 'email', label: 'Email' },
    { id: 'password', label: 'Senha' },
    { id: 'select', label: 'Seleção (Dropdown)' },
    { id: 'radio', label: 'Múltipla Escolha (Radio)' },
    { id: 'checkbox', label: 'Caixa de Seleção (Checkbox)' },
];

export const FieldEditorModal: React.FC<FieldEditorModalProps> = ({ field, onClose, onSaveSuccess }) => {
    const [label, setLabel] = useState(field?.label || '');
    const [fieldType, setFieldType] = useState<FormFieldType>(field?.field_type || 'text');
    const [options, setOptions] = useState(field?.options || '');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isEditing = !!field;
    
    const needsOptions = ['select', 'radio'].includes(fieldType);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!label.trim()) {
            setError('O rótulo do campo é obrigatório.');
            return;
        }

        let parsedOptions: string[] | undefined;
        if (needsOptions) {
            if (!options.trim()) {
                setError('As opções são obrigatórias para este tipo de campo.');
                return;
            }
            parsedOptions = options.split(',').map(opt => opt.trim()).filter(Boolean);
            if (parsedOptions.length === 0) {
                 setError('Forneça pelo menos uma opção válida.');
                 return;
            }
        }
        
        setIsSaving(true);
        const fieldData = {
            label,
            field_type: fieldType,
            ...(needsOptions && { options: parsedOptions }),
        };

        try {
            if (isEditing) {
                // await apiClient.put(`/admin/fields/${field.id}`, fieldData);
                // NOTE: Editing existing fields is not part of the current spec to avoid complexity.
                // This can be added later. For now, we only support creation.
            } else {
                await apiClient.post('/admin/fields', fieldData);
            }
            onSaveSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar o campo.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            title={isEditing ? 'Editar Campo' : 'Criar Novo Campo para Paleta'}
            onClose={onClose}
            icon={<PlusCircleIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={
                 <>
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Cancelar</button>
                    <button type="submit" form="field-form" disabled={isSaving} className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {isSaving ? 'Salvando...' : 'Salvar Campo'}
                    </button>
                </>
            }
        >
             <form id="field-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="label" className="block text-sm font-medium text-gray-300 mb-2">Rótulo do Campo</label>
                    <input id="label" value={label} onChange={e => setLabel(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500" required />
                    <p className="text-xs text-gray-400 mt-1">Este é o nome que aparecerá para o usuário.</p>
                </div>
                <div>
                    <label htmlFor="fieldType" className="block text-sm font-medium text-gray-300 mb-2">Tipo de Campo</label>
                     <select
                        id="fieldType"
                        value={fieldType}
                        onChange={e => setFieldType(e.target.value as FormFieldType)}
                        className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500"
                    >
                        {fieldTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.label}</option>
                        ))}
                    </select>
                </div>
                {needsOptions && (
                    <div>
                         <label htmlFor="options" className="block text-sm font-medium text-gray-300 mb-2">Opções</label>
                         <textarea id="options" value={options} onChange={e => setOptions(e.target.value)} rows={3} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500" />
                         <p className="text-xs text-gray-400 mt-1">Digite as opções separadas por vírgula. Ex: Opção 1, Opção 2, Opção 3</p>
                    </div>
                )}
                 {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            </form>
        </Modal>
    );
};
