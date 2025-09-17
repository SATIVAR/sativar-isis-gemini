
import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquareIcon, AlertTriangleIcon, CheckCircleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';
import { apiClient } from '../../services/database/apiClient.ts';
import type { FormField, AssociateType } from '../../types.ts';

const associateTypes: { id: AssociateType; label: string }[] = [
    { id: 'paciente', label: 'Paciente' },
    { id: 'responsavel', label: 'Responsável por Paciente' },
    { id: 'tutor', label: 'Tutor de Animal' },
    { id: 'colaborador', label: 'Colaborador' },
];

export const FormsPage: React.FC = () => {
    const [allFields, setAllFields] = useState<FormField[]>([]);
    const [activeFieldIds, setActiveFieldIds] = useState<Set<number>>(new Set());
    const [initialActiveFieldIds, setInitialActiveFieldIds] = useState<Set<number>>(new Set());
    const [selectedType, setSelectedType] = useState<AssociateType>('paciente');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSavedToast, setShowSavedToast] = useState(false);

    const hasUnsavedChanges = JSON.stringify(Array.from(activeFieldIds).sort()) !== JSON.stringify(Array.from(initialActiveFieldIds).sort());

    const fetchAllFields = async () => {
        try {
            const fields = await apiClient.get<FormField[]>('/admin/forms/associates/fields');
            setAllFields(fields);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao carregar os campos disponíveis.');
        }
    };

    const fetchConfigForType = useCallback(async (type: AssociateType) => {
        setIsLoading(true);
        setError(null);
        try {
            const activeIds = await apiClient.get<number[]>(`/admin/forms/associates/config/${type}`);
            const idSet = new Set(activeIds);
            setActiveFieldIds(idSet);
            setInitialActiveFieldIds(idSet);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Falha ao carregar a configuração para "${type}".`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllFields();
    }, []);

    useEffect(() => {
        if (allFields.length > 0) {
            fetchConfigForType(selectedType);
        }
    }, [selectedType, allFields, fetchConfigForType]);
    
    const handleToggle = (fieldId: number) => {
        setActiveFieldIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fieldId)) {
                newSet.delete(fieldId);
            } else {
                newSet.add(fieldId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await apiClient.post(`/admin/forms/associates/config/${selectedType}`, {
                fieldIds: Array.from(activeFieldIds)
            });
            setInitialActiveFieldIds(activeFieldIds);
            setShowSavedToast(true);
            setTimeout(() => setShowSavedToast(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar a configuração.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-2">
                    <CheckSquareIcon className="w-8 h-8 text-fuchsia-300" />
                    <h2 className="text-2xl font-bold text-white">Editor de Formulários de Associados</h2>
                </div>
                <p className="text-gray-400 mb-8">
                    Configure quais campos devem aparecer no formulário de cadastro para cada tipo de associado.
                </p>

                <div className="space-y-6 p-6 bg-[#202124]/50 border border-gray-700/50 rounded-lg">
                    <div>
                        <label htmlFor="associateType" className="block text-sm font-medium text-gray-300 mb-2">Selecione o tipo de associado para configurar</label>
                        <select
                            id="associateType"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value as AssociateType)}
                            className="w-full sm:w-72 bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition"
                        >
                            {associateTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10"><Loader /></div>
                    ) : error ? (
                        <div className="text-center text-red-400 py-10">{error}</div>
                    ) : (
                        <div className="space-y-4 pt-4 border-t border-gray-600/50">
                            {allFields.map(field => {
                                const isBase = !!field.is_base_field;
                                const isActive = isBase || activeFieldIds.has(field.id);
                                return (
                                    <div key={field.id} className={`flex items-center justify-between p-3 rounded-lg ${isBase ? 'bg-gray-700/30' : 'bg-[#202124]'}`}>
                                        <div>
                                            <p className={`font-medium ${isBase ? 'text-gray-400' : 'text-white'}`}>{field.label}</p>
                                            <p className="text-xs text-gray-500 font-mono">{field.field_name} ({field.field_type})</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => !isBase && handleToggle(field.id)}
                                            disabled={isBase}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#202124] ${
                                                isActive ? 'bg-green-600' : 'bg-gray-600'
                                            } ${isBase ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                            role="switch"
                                            aria-checked={isActive}
                                            aria-label={`Ativar campo ${field.label}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                isActive ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
             <div 
                className={`fixed bottom-8 right-0 left-0 flex justify-center md:right-8 z-50 transition-all duration-300 ease-in-out ${
                (hasUnsavedChanges || showSavedToast) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'
                }`}
            >
                <div className="relative">
                    {hasUnsavedChanges && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-2xl hover:bg-green-700 transition-transform hover:scale-105 disabled:opacity-70 disabled:cursor-wait"
                            aria-label="Salvar alterações"
                        >
                            {isSaving ? <Loader /> : <CheckSquareIcon className="w-6 h-6" />}
                            <span className="text-sm">{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                        </button>
                    )}
                    {showSavedToast && (
                        <div className="flex items-center gap-3 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-2xl border border-green-500/50" role="status">
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            <span className="font-semibold text-sm">Configuração salva!</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
