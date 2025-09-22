import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { apiClient } from '../../services/database/apiClient.ts';
import type { FormField, FormStep, AssociateType } from '../../types.ts';
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
    const [layouts, setLayouts] = useState<{ main: FormStep[], extra: FormStep[] }>({ main: [], extra: [] });
    const [initialLayouts, setInitialLayouts] = useState<{ main: FormStep[], extra: FormStep[] }>({ main: [], extra: [] });
    const [selectedAssociateType, setSelectedAssociateType] = useState<AssociateType>('paciente');
    const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
    const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
    const [editingPaletteField, setEditingPaletteField] = useState<FormField | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const modal = useModal();

    const hasUnsavedChanges = useMemo(() => JSON.stringify(layouts) !== JSON.stringify(initialLayouts), [layouts, initialLayouts]);

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
            const { main, extra } = await apiClient.get<{ main: FormStep[], extra: FormStep[] }>(`/admin/layouts/${type}`);
            const correctLayout = (layout: FormStep[]) => layout.map(step => ({
                ...step,
                fields: step.fields.map(field => ({ ...field, is_required: field.is_base_field ? true : !!field.is_required })),
            }));
            const newLayouts = { main: correctLayout(main), extra: correctLayout(extra) };
            setLayouts(newLayouts);
            setInitialLayouts(newLayouts);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao carregar o layout do formulário.');
            setLayouts({ main: [], extra: [] });
            setInitialLayouts({ main: [], extra: [] });
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
            await apiClient.put(`/admin/layouts/${selectedAssociateType}`, layouts);
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => {
                setInitialLayouts(layouts);
                setSaveSuccess(false);
            }, 1500);
        } catch (err) {
            setIsSaving(false);
            const errorMessage = err instanceof Error ? err.message : 'Falha ao salvar o layout.';
            setError(errorMessage);
            modal.alert({ title: 'Erro ao Salvar', message: errorMessage });
        }
    };

    const handleFieldUpdate = (updatedField, layoutType) => {
        setLayouts(prev => ({
            ...prev,
            [layoutType]: prev[layoutType].map(step => ({
                ...step,
                fields: step.fields.map(f => f.id === updatedField.id ? updatedField : f)
            }))
        }));
    };
    
    const handleStepUpdate = (updatedStep, layoutType) => {
        setLayouts(prev => ({
            ...prev,
            [layoutType]: prev[layoutType].map(step => step.id === updatedStep.id ? updatedStep : step)
        }));
    };

    const handleFieldDrop = (field, stepIndex, layoutType) => {
        setLayouts(prev => {
            const newLayouts = { ...prev };
            const targetLayout = [...newLayouts[layoutType]];
            const targetStep = targetLayout[stepIndex];
            if (targetStep && !targetStep.fields.some(f => f.id === field.id)) {
                targetStep.fields.push({
                    ...field,
                    display_order: targetStep.fields.length,
                    is_required: !!field.is_base_field,
                    visibility_conditions: null,
                });
            }
            newLayouts[layoutType] = targetLayout;
            return newLayouts;
        });
    };

    const handleStepDrop = (dropIndex, layoutType) => {
        setLayouts(prev => {
            const newLayouts = { ...prev };
            const targetLayout = [...newLayouts[layoutType]];
            const newStep = {
                id: `new_${Date.now()}`,
                title: `Nova Etapa ${targetLayout.length + 1}`,
                step_order: dropIndex,
                fields: [],
            };
            targetLayout.splice(dropIndex, 0, newStep);
            newLayouts[layoutType] = targetLayout.map((step, index) => ({ ...step, step_order: index }));
            return newLayouts;
        });
    };

    const handleFieldReorder = (drag, hover, layoutType) => {
        setLayouts(prev => {
            const newLayouts = JSON.parse(JSON.stringify(prev));
            const targetLayout = newLayouts[layoutType];
            const dragStep = targetLayout[drag.stepIndex];
            const [draggedField] = dragStep.fields.splice(drag.fieldIndex, 1);
            
            const hoverStep = targetLayout[hover.stepIndex];
            hoverStep.fields.splice(hover.fieldIndex, 0, draggedField);
            
            return newLayouts;
        });
    };
    
     const handleStepReorder = (dragIndex, hoverIndex, layoutType) => {
        setLayouts(prev => {
            const newLayouts = { ...prev };
            const targetLayout = [...newLayouts[layoutType]];
            const [draggedStep] = targetLayout.splice(dragIndex, 1);
            targetLayout.splice(hoverIndex, 0, draggedStep);
            newLayouts[layoutType] = targetLayout.map((step, index) => ({ ...step, step_order: index }));
            return newLayouts;
        });
    };

    const handleFieldSelect = (id) => setSelectedFieldId(id);
    const handleFieldRemove = (id, layoutType) => {
        if (selectedFieldId === id) setSelectedFieldId(null);
        setLayouts(prev => ({
            ...prev,
            [layoutType]: prev[layoutType].map(step => ({
                ...step,
                fields: step.fields.filter(field => field.id !== id)
            }))
        }));
    };
    
    const handleStepRemove = (id, layoutType) => {
        setLayouts(prev => {
            const newLayout = prev[layoutType].filter(step => step.id !== id);
            return {
                ...prev,
                [layoutType]: newLayout.map((step, index) => ({ ...step, step_order: index }))
            };
        });
    };
    
    const handleEditPaletteField = (field) => { setEditingPaletteField(field); setIsFieldEditorOpen(true); };
    const handleCloseFieldEditor = () => { setIsFieldEditorOpen(false); setEditingPaletteField(null); };
    
    const handleDeletePaletteField = async (id) => {
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
                await fetchAllFields();
            } catch (err) {
                modal.alert({ title: 'Erro', message: `Falha ao excluir campo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`});
            }
        }
    };
    
    const selectedFieldData = useMemo(() => {
        if (!selectedFieldId) return null;
        for (const layoutType of ['main', 'extra'] as const) {
            for (const step of layouts[layoutType]) {
                const field = step.fields.find(f => f.id === selectedFieldId);
                if (field) return { field, layoutType };
            }
        }
        return null;
    }, [selectedFieldId, layouts]);

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
                        <div className="lg:col-span-2 space-y-8">
                            <Canvas
                                title="Layout do Formulário (Cadastro)"
                                layout={layouts.main}
                                onFieldDrop={(field, stepIndex) => handleFieldDrop(field, stepIndex, 'main')}
                                onStepDrop={(dropIndex) => handleStepDrop(dropIndex, 'main')}
                                onFieldReorder={(drag, hover) => handleFieldReorder(drag, hover, 'main')}
                                onStepReorder={(drag, hover) => handleStepReorder(drag, hover, 'main')}
                                onFieldSelect={handleFieldSelect}
                                onFieldRemove={(id) => handleFieldRemove(id, 'main')}
                                onStepRemove={(id) => handleStepRemove(id, 'main')}
                                onStepUpdate={(step) => handleStepUpdate(step, 'main')}
                                selectedFieldId={selectedFieldId}
                            />
                            <Canvas
                                title="Informações Extras (Edição)"
                                layout={layouts.extra}
                                onFieldDrop={(field, stepIndex) => handleFieldDrop(field, stepIndex, 'extra')}
                                onStepDrop={(dropIndex) => handleStepDrop(dropIndex, 'extra')}
                                onFieldReorder={(drag, hover) => handleFieldReorder(drag, hover, 'extra')}
                                onStepReorder={(drag, hover) => handleStepReorder(drag, hover, 'extra')}
                                onFieldSelect={handleFieldSelect}
                                onFieldRemove={(id) => handleFieldRemove(id, 'extra')}
                                onStepRemove={(id) => handleStepRemove(id, 'extra')}
                                onStepUpdate={(step) => handleStepUpdate(step, 'extra')}
                                selectedFieldId={selectedFieldId}
                            />
                        </div>
                        <div className="lg:sticky lg:top-6 space-y-6">
                            {selectedFieldData && (
                                <PropertiesPanel
                                    field={selectedFieldData.field}
                                    layout={[...layouts.main, ...layouts.extra]}
                                    onUpdate={(field) => handleFieldUpdate(field, selectedFieldData.layoutType)}
                                    onClose={() => setSelectedFieldId(null)}
                                />
                            )}
                            <Palette
                                allFields={allFields}
                                layout={[...layouts.main, ...layouts.extra]}
                                onDeleteField={handleDeletePaletteField}
                                onEditField={handleEditPaletteField}
                            />
                        </div>
                    </div>
                )}
            </div>
            <FloatingSaveButton
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                saveSuccess={saveSuccess}
                onSave={handleSaveLayout}
            />
        </DndProvider>
    );
};