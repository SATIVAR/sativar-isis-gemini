import React, { useState } from 'react';
import { apiClient } from '../../../services/database/apiClient.ts';
import type { FormField, FormFieldType } from '../../../types.ts';
import { Modal } from '../../Modal.tsx';
import { PlusCircleIcon, Trash2Icon } from '../../icons.tsx';

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

// Updated to return string[] and handle comma-separated fallback
const getInitialOptions = (field: FormField | null | undefined): string[] => {
    if (!field || !field.options) return ['']; // Start with one empty option
    try {
        const parsed = JSON.parse(field.options);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : [''];
    } catch {
        // Handle comma-separated string as fallback for potentially old data
        const parts = String(field.options).split(',').map(s => s.trim()).filter(Boolean);
        return parts.length > 0 ? parts : [''];
    }
};

export const FieldEditorModal: React.FC<FieldEditorModalProps> = ({ field, onClose, onSaveSuccess }) => {
    const [label, setLabel] = useState(field?.label || '');
    const [fieldType, setFieldType] = useState<FormFieldType>(field?.field_type || 'text');
    const [options, setOptions] = useState<string[]>(getInitialOptions(field));
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isEditing = !!field;
    
    const needsOptions = ['select', 'radio'].includes(fieldType);

    // Dynamic option handlers
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length <= 1) return;
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const handlePasteOptions = (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
        const pastedText = event.clipboardData.getData('text');
        const delimiters = /[,;]/;

        if (pastedText && delimiters.test(pastedText)) {
            event.preventDefault();
            const newOptionsFromPaste = pastedText.split(delimiters).map(s => s.trim()).filter(Boolean);
            
            if (newOptionsFromPaste.length > 0) {
                setOptions(currentOptions => {
                    const newOptions = [...currentOptions];
                    // The first pasted item goes into the current input
                    newOptions[index] = newOptionsFromPaste[0];
                    // The rest are inserted after the current one
                    if (newOptionsFromPaste.length > 1) {
                        newOptions.splice(index + 1, 0, ...newOptionsFromPaste.slice(1));
                    }
                    return newOptions;
                });
            }
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!label.trim()) {
            setError('O rótulo do campo é obrigatório.');
            return;
        }

        let finalOptions: string[] | undefined;
        if (needsOptions) {
            finalOptions = options.map(opt => opt.trim()).filter(Boolean);
            if (finalOptions.length === 0) {
                 setError('Forneça pelo menos uma opção válida.');
                 return;
            }
        }
        
        setIsSaving(true);
        const fieldData = {
            label,
            field_type: fieldType,
            ...(needsOptions && { options: finalOptions }),
        };

        try {
            if (isEditing) {
                await apiClient.put(`/admin/fields/${field.id}`, fieldData);
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
                         <label className="block text-sm font-medium text-gray-300 mb-2">Opções</label>
                         <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        onPaste={(e) => handlePasteOptions(e, index)}
                                        placeholder={`Opção ${index + 1}`}
                                        className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOption(index)}
                                        disabled={options.length <= 1}
                                        className="p-2 text-gray-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Remover opção"
                                    >
                                        <Trash2Icon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                         <button
                            type="button"
                            onClick={handleAddOption}
                            className="mt-3 flex items-center gap-2 text-sm text-fuchsia-300 hover:text-fuchsia-200"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            Adicionar Opção
                        </button>
                    </div>
                )}
                 {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            </form>
        </Modal>
    );
};