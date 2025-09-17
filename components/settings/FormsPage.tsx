import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CheckSquareIcon, PlusCircleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';
import { apiClient } from '../../services/database/apiClient.ts';
import type { FormField, AssociateType, FormLayoutField, FormStep } from '../../types.ts';
import { FieldEditorModal } from './form-builder/FieldEditorModal.tsx';
import { Canvas } from './form-builder/Canvas.tsx';
import { Palette } from './form-builder/Palette.tsx';
import { PropertiesPanel } from './form-builder/PropertiesPanel.tsx';
import { FloatingSaveButton } from './form-builder/FloatingSaveButton.tsx';
import { useModal } from '../../hooks/useModal.ts';

const associateTypes: { id: AssociateType; label: string }[] = [
    { id: 'paciente', label: 'Paciente' },
    { id: 'responsavel', label: 'Responsável por Paciente' },
    { id: 'tutor', label: 'Tutor de Animal' },
    { id: 'colaborador', label: 'Colaborador' },
];

export const FormsPage: React.FC = () => {
    const [allFields, setAllFields] = useState<FormField[]>([]);
    const [layout, setLayout] = useState<FormStep[]>([]);
    const [initialLayout, setInitialLayout] = useState<FormStep[]>([]);
    const [selectedType, setSelectedType] = useState<AssociateType>('paciente');
    const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modal = useModal();

    const hasUnsavedChanges = JSON.stringify(layout) !== JSON.stringify(initialLayout);
    const selectedField = layout.flatMap(s => s.fields).find(f => f.id === selectedFieldId) || null;

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [fields, layoutData] = await Promise.all([
                apiClient.get<FormField[]>('/admin/fields'),
                apiClient.get<FormStep[]>(`/admin/layouts/${selectedType}`),
            ]);
            setAllFields(fields);
            
            if (layoutData.length === 0) {
                const newLayout: FormStep[] = [{ id: crypto.randomUUID(), title: 'Informações Principais', step_order: 0, fields: [] }];
                setLayout(newLayout);
                setInitialLayout(newLayout);
            } else {
                setLayout(layoutData);
                setInitialLayout(layoutData);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao carregar dados do formulário.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedType]);

    useEffect(() => {
        fetchAllData();
        setSelectedFieldId(null);
    }, [selectedType, fetchAllData]);

    const handleSaveLayout = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await apiClient.put(`/admin/layouts/${selectedType}`, layout);
            setInitialLayout(layout);
            setShowSavedToast(true);
            setTimeout(() => setShowSavedToast(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar o layout.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFieldDrop = (field: FormField, stepIndex: number) => {
        if (layout.flatMap(s => s.fields).some(f => f.id === field.id)) return;
        
        const newFieldInLayout: FormLayoutField = { ...field, display_order: layout[stepIndex].fields.length, is_required: false };

        setLayout(prev => {
            const newLayout = [...prev];
            newLayout[stepIndex].fields.push(newFieldInLayout);
            return newLayout;
        });
    };
    
    const handleStepDrop = (dropIndex: number) => {
        const newStep: FormStep = {
            id: crypto.randomUUID(),
            title: `Nova Etapa ${layout.length + 1}`,
            step_order: dropIndex,
            fields: []
        };
        setLayout(prev => {
            const newLayout = [...prev];
            newLayout.splice(dropIndex, 0, newStep);
            return newLayout;
        });
    };

    const handleFieldReorder = useCallback((drag: { stepIndex: number, fieldIndex: number }, hover: { stepIndex: number, fieldIndex: number }) => {
        setLayout(prev => {
            const newLayout = JSON.parse(JSON.stringify(prev)); // Deep copy
            const [draggedItem] = newLayout[drag.stepIndex].fields.splice(drag.fieldIndex, 1);
            newLayout[hover.stepIndex].fields.splice(hover.fieldIndex, 0, draggedItem);
            return newLayout;
        });
    }, []);
    
    const handleStepReorder = useCallback((dragIndex: number, hoverIndex: number) => {
        setLayout(prev => {
            const newLayout = [...prev];
            const [draggedItem] = newLayout.splice(dragIndex, 1);
            newLayout.splice(hoverIndex, 0, draggedItem);
            return newLayout;
        });
    }, []);
    
    const handleRemoveField = (fieldId: number) => {
        setLayout(prev => prev.map(step => ({
            ...step,
            fields: step.fields.filter(f => f.id !== fieldId)
        })));
        if (selectedFieldId === fieldId) {
            setSelectedFieldId(null);
        }
    };
    
    const handleFieldUpdate = (updatedField: FormLayoutField) => {
        setLayout(prev => prev.map(step => ({
            ...step,
            fields: step.fields.map(f => f.id === updatedField.id ? updatedField : f)
        })));
    };
    
    const handleStepUpdate = (updatedStep: FormStep) => {
        setLayout(prev => prev.map(s => s.id === updatedStep.id ? updatedStep : s));
    };
    
    const handleStepRemove = (stepId: number | string) => {
        if (layout.length <= 1) {
            modal.alert({ title: 'Ação Inválida', message: 'O formulário deve ter pelo menos uma etapa.' });
            return;
        }
        setLayout(prev => prev.filter(s => s.id !== stepId));
    };

    const handleDeleteFieldFromPalette = async (fieldId: number) => {
        const fieldToDelete = allFields.find(f => f.id === fieldId);
        if (!fieldToDelete) return;

        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão Permanente',
            message: `Tem certeza que deseja excluir o campo "${fieldToDelete.label}" da paleta? Esta ação é permanente e removerá o campo de TODOS os layouts de formulário.`,
            confirmLabel: 'Excluir da Paleta',
            danger: true,
        });

        if (confirmed) {
            setIsLoading(true);
            setError(null);
            try {
                await apiClient.delete(`/admin/fields/${fieldId}`);
                await fetchAllData();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Falha ao excluir o campo.');
                setIsLoading(false);
            }
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            {isModalOpen && <FieldEditorModal onClose={() => setIsModalOpen(false)} onSaveSuccess={fetchAllData} />}
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <CheckSquareIcon className="w-8 h-8 text-fuchsia-300" />
                            <h2 className="text-2xl font-bold text-white">Construtor de Formulários</h2>
                        </div>
                        <p className="text-gray-400">
                            Arraste, solte e configure os campos e etapas para montar o formulário.
                        </p>
                    </div>
                     <button onClick={() => setIsModalOpen(true)} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-gray-600">
                        <PlusCircleIcon className="w-5 h-5" /> Adicionar Campo à Paleta
                    </button>
                </div>
                
                 <div className="mb-6">
                    <label htmlFor="associateType" className="block text-sm font-medium text-gray-300 mb-2">Configurando formulário para:</label>
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
                    <div className="flex justify-center py-20"><Loader /></div>
                ) : error ? (
                    <div className="text-center text-red-400 py-20">{error}</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                           <Canvas
                                layout={layout}
                                onFieldDrop={handleFieldDrop}
                                onStepDrop={handleStepDrop}
                                onFieldReorder={handleFieldReorder}
                                onStepReorder={handleStepReorder}
                                onFieldSelect={setSelectedFieldId}
                                onFieldRemove={handleRemoveField}
                                onStepRemove={handleStepRemove}
                                onStepUpdate={handleStepUpdate}
                                selectedFieldId={selectedFieldId}
                           />
                        </div>
                        <div className="lg:col-span-1">
                             {selectedField ? (
                                <PropertiesPanel 
                                    key={selectedField.id}
                                    field={selectedField}
                                    onUpdate={handleFieldUpdate}
                                    onClose={() => setSelectedFieldId(null)}
                                />
                             ) : (
                                <Palette
                                    allFields={allFields}
                                    layout={layout}
                                    onDeleteField={handleDeleteFieldFromPalette}
                                />
                             )}
                        </div>
                    </div>
                )}
            </div>
            <FloatingSaveButton
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                showSavedToast={showSavedToast}
                onSave={handleSaveLayout}
            />
        </DndProvider>
    );
};