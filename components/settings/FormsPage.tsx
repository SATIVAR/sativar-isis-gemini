


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { apiClient } from '../../services/database/apiClient.ts';
import type { FormField, FormStep, FormLayoutField, AssociateType } from '../../types.ts';
import { useModal } from '../../hooks/useModal.ts';
import { Loader } from '../Loader.tsx';
import { CheckSquareIcon, PlusCircleIcon } from '../icons.tsx';
import { Palette } from './form-builder/Palette.tsx';
import { Canvas } from './form-builder/Canvas.tsx';
import { PropertiesPanel } from './form-builder/PropertiesPanel.tsx';
import { FloatingSaveButton } from './form-builder/FloatingSaveButton.tsx';
import { FieldEditorModal } from './form-builder/FieldEditorModal.tsx';

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
    const [selectedAssociateType, setSelectedAssociateType] = useState<AssociateType>('paciente');
    const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
    const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
    const [editingPaletteField, setEditingPaletteField] = useState<FormField | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const modal = useModal();

    const hasUnsavedChanges = useMemo(() => JSON.stringify(layout) !== JSON.stringify(initialLayout), [layout, initialLayout]);

    const fetchAllFields = useCallback(async () => {
        try {
            const fieldsData = await apiClient.get<FormField[]>('/admin/fields');
            setAllFields(fieldsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao carregar campos da paleta.');
        }
    }, []);

    const fetchLayout = useCallback(async (type: AssociateType) => {
        setIsLoading(true);
        setError(null);
        setSelectedFieldId(null);
        try {
            const layoutData = await apiClient.get<FormStep[]>(`/admin/layouts/${type}`);
            const correctedLayout = layoutData.map(step => ({
                ...step,
                fields: step.fields.map(field => ({
                    ...field,
                    is_required: field.is_base_field ? true : !!field.is_required,
                })),
            }));
            setLayout(correctedLayout);
            setInitialLayout(correctedLayout);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao carregar o layout do formulário.');
            setLayout([]);
            setInitialLayout([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllFields();
    }, [fetchAllFields]);

    useEffect(() => {
        if (selectedAssociateType) {
            fetchLayout(selectedAssociateType);
        }
    }, [selectedAssociateType, fetchLayout]);

    const handleSaveLayout = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await apiClient.put(`/admin/layouts/${selectedAssociateType}`, layout);
            setInitialLayout(layout);
            modal.alert({
                title: 'Layout Salvo',
                message: 'O layout do formulário foi salvo com sucesso.'
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar o layout.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldDrop = (field: FormField, stepIndex: number) => {
        setLayout(prev => {
            const newLayout = [...prev];
            const targetStep = newLayout[stepIndex];
            if (targetStep && !targetStep.fields.some(f => f.id === field.id)) {
                const newField: FormLayoutField = {
                    ...field,
                    display_order: targetStep.fields.length,
                    is_required: !!field.is_base_field,
                    visibility_conditions: null,
                };
                targetStep.fields.push(newField);
            }
            return newLayout;
        });
    };

    const handleStepDrop = (dropIndex: number) => {
        const newStep: FormStep = {
            id: `new_${Date.now()}`,
            title: `Nova Etapa ${layout.length + 1}`,
            step_order: dropIndex,
            fields: [],
        };

        setLayout(prev => {
            const newLayout = [...prev];
            newLayout.splice(dropIndex, 0, newStep);
            return newLayout.map((step, index) => ({ ...step, step_order: index }));
        });
    };

    const handleFieldReorder = (drag: { stepIndex: number; fieldIndex: number }, hover: { stepIndex: number; fieldIndex: number }) => {
        setLayout(prev => {
            const newLayout = JSON.parse(JSON.stringify(prev));
            const dragStep = newLayout[drag.stepIndex];
            const [draggedField] = dragStep.fields.splice(drag.fieldIndex, 1);
            
            const hoverStep = newLayout[hover.stepIndex];
            hoverStep.fields.splice(hover.fieldIndex, 0, draggedField);
            
            return newLayout;
        });
    };
    
     const handleStepReorder = (dragIndex: number, hoverIndex: number) => {
        setLayout(prev => {
            const newLayout = [...prev];
            const [draggedStep] = newLayout.splice(dragIndex, 1);
            newLayout.splice(hoverIndex, 0, draggedStep);
            return newLayout.map((step, index) => ({ ...step, step_order: index }));
        });
    };

    const handleFieldSelect = (id: number) => setSelectedFieldId(id);
    const handleFieldRemove = (id: number) => {
        if (selectedFieldId === id) setSelectedFieldId(null);
        setLayout(prev => prev.map(step => ({
            ...step,
            fields: step.fields.filter(field => field.id !== id)
        })));
    };
    
    const handleStepRemove = (id: number | string) => {
        setLayout(prev => {
            const newLayout = prev.filter(step => step.id !== id);
            return newLayout.map((step, index) => ({ ...step, step_order: index }));
        });
    };
    
    const handleStepUpdate = (updatedStep: FormStep) => {
        setLayout(prev => prev.map(step => step.id === updatedStep.id ? updatedStep : step));
    };

    const handleFieldUpdate = (updatedField: FormLayoutField) => {
        setLayout(prev => prev.map(step => ({
            ...step,
            fields: step.fields.map(f => f.id === updatedField.id ? updatedField : f)
        })));
    };
    
    const handleEditPaletteField = (field: FormField) => {
        setEditingPaletteField(field);
        setIsFieldEditorOpen(true);
    };

    const handleCloseFieldEditor = () => {
        setIsFieldEditorOpen(false);
        setEditingPaletteField(null);
    };
    
    const handleDeletePaletteField = async (id: number) => {
        const fieldToDelete = allFields.find(f => f.id === id);
        if (!fieldToDelete) return;

        const confirmed = await modal.confirm({
            title: 'Excluir Campo da Paleta',
            message: `Tem certeza que deseja excluir permanentemente o campo "${fieldToDelete.label}"? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Excluir Permanentemente',
            danger: true
        });

        if (confirmed) {
            try {
                await apiClient.delete(`/admin/fields/${id}`);
                await fetchAllFields(); // Refresh palette
            } catch (err) {
                modal.alert({ title: 'Erro', message: `Falha ao excluir campo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`});
            }
        }
    };
    
    const selectedField = useMemo(() => {
        if (!selectedFieldId) return null;
        for (const step of layout) {
            const field = step.fields.find(f => f.id === selectedFieldId);
            if (field) return field;
        }
        return null;
    }, [selectedFieldId, layout]);

    return (
        <DndProvider backend={HTML5Backend}>
            {isFieldEditorOpen && <FieldEditorModal field={editingPaletteField} onClose={handleCloseFieldEditor} onSaveSuccess={fetchAllFields} />}
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <CheckSquareIcon className="w-8 h-8 text-fuchsia-300" />
                        <h2 className="text-2xl font-bold text-white">Construtor de Formulários</h2>
                    </div>
                    <p className="text-gray-400">
                        Personalize os formulários de cadastro para cada tipo de associado. Arraste campos da paleta para o layout.
                    </p>
                </div>
                
                 <div className="bg-[#202124] rounded-xl border border-gray-700 p-4 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                         <div>
                            <label htmlFor="associateTypeSelect" className="block text-sm font-medium text-gray-300 mb-2">
                                Editando formulário para:
                            </label>
                            <select
                                id="associateTypeSelect"
                                value={selectedAssociateType}
                                onChange={(e) => setSelectedAssociateType(e.target.value as AssociateType)}
                                className="bg-[#303134] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500"
                            >
                                {associateTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                         <button onClick={() => setIsFieldEditorOpen(true)} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-green-600 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                            <PlusCircleIcon className="w-5 h-5" /> Criar Novo Campo
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-center">{error}</p>}
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20"><Loader /></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <div className="lg:col-span-2">
                            <Canvas
                                layout={layout}
                                onFieldDrop={handleFieldDrop}
                                onStepDrop={handleStepDrop}
                                onFieldReorder={handleFieldReorder}
                                onStepReorder={handleStepReorder}
                                onFieldSelect={handleFieldSelect}
                                onFieldRemove={handleFieldRemove}
                                onStepRemove={handleStepRemove}
                                onStepUpdate={handleStepUpdate}
                                selectedFieldId={selectedFieldId}
                            />
                        </div>
                        <div className="lg:sticky lg:top-6 space-y-6">
                            <Palette
                                allFields={allFields}
                                layout={layout}
                                onDeleteField={handleDeletePaletteField}
                                onEditField={handleEditPaletteField}
                            />
                            {selectedField && (
                                <PropertiesPanel
                                    field={selectedField}
                                    layout={layout}
                                    onUpdate={handleFieldUpdate}
                                    onClose={() => setSelectedFieldId(null)}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
            <FloatingSaveButton
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                onSave={handleSaveLayout}
            />
        </DndProvider>
    );
};