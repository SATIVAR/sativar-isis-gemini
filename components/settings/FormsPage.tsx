import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CheckSquareIcon, PlusCircleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';
import { apiClient } from '../../services/database/apiClient.ts';
import type { FormField, AssociateType, FormLayoutField } from '../../types.ts';
import { FieldEditorModal } from './form-builder/FieldEditorModal.tsx';
import { Canvas } from './form-builder/Canvas.tsx';
import { Palette } from './form-builder/Palette.tsx';
import { PropertiesPanel } from './form-builder/PropertiesPanel.tsx';
import { FloatingSaveButton } from './form-builder/FloatingSaveButton.tsx';

const associateTypes: { id: AssociateType; label: string }[] = [
    { id: 'paciente', label: 'Paciente' },
    { id: 'responsavel', label: 'Responsável por Paciente' },
    { id: 'tutor', label: 'Tutor de Animal' },
    { id: 'colaborador', label: 'Colaborador' },
];

export const FormsPage: React.FC = () => {
    const [allFields, setAllFields] = useState<FormField[]>([]);
    const [layout, setLayout] = useState<FormLayoutField[]>([]);
    const [initialLayout, setInitialLayout] = useState<FormLayoutField[]>([]);
    const [selectedType, setSelectedType] = useState<AssociateType>('paciente');
    const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const hasUnsavedChanges = JSON.stringify(layout) !== JSON.stringify(initialLayout);
    const selectedField = layout.find(f => f.id === selectedFieldId) || null;

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [fields, layoutData] = await Promise.all([
                apiClient.get<FormField[]>('/admin/fields'),
                apiClient.get<FormLayoutField[]>(`/admin/layouts/${selectedType}`),
            ]);
            setAllFields(fields);
            setLayout(layoutData);
            setInitialLayout(layoutData);
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
            const payload = layout.map((field, index) => ({
                field_id: field.id,
                display_order: index,
                is_required: !!field.is_required,
            }));

            await apiClient.put(`/admin/layouts/${selectedType}`, payload);
            setInitialLayout(layout);
            setShowSavedToast(true);
            setTimeout(() => setShowSavedToast(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar o layout.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFieldDrop = (field: FormField) => {
        if (layout.some(f => f.id === field.id)) return; // Avoid duplicates
        
        const newFieldInLayout: FormLayoutField = {
            ...field,
            display_order: layout.length,
            is_required: false,
        };
        setLayout(prev => [...prev, newFieldInLayout]);
    };

    const handleFieldReorder = useCallback((dragIndex: number, hoverIndex: number) => {
        setLayout(prev => {
            const newLayout = [...prev];
            const [draggedItem] = newLayout.splice(dragIndex, 1);
            newLayout.splice(hoverIndex, 0, draggedItem);
            return newLayout;
        });
    }, []);
    
    const handleRemoveField = (fieldId: number) => {
        setLayout(prev => prev.filter(f => f.id !== fieldId));
        if (selectedFieldId === fieldId) {
            setSelectedFieldId(null);
        }
    };
    
    const handleFieldUpdate = (updatedField: FormLayoutField) => {
        setLayout(prev => prev.map(f => f.id === updatedField.id ? updatedField : f));
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
                            Arraste, solte e configure os campos para montar o formulário de cada tipo de associado.
                        </p>
                    </div>
                     <button onClick={() => setIsModalOpen(true)} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-gray-600">
                        <PlusCircleIcon className="w-5 h-5" /> Adicionar Novo Campo à Paleta
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
                                onFieldReorder={handleFieldReorder}
                                onFieldSelect={setSelectedFieldId}
                                onFieldRemove={handleRemoveField}
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
                                <Palette allFields={allFields} layout={layout} />
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
