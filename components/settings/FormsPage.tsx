import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CheckSquareIcon, PlusCircleIcon, SettingsIcon, XCircleIcon, GripVerticalIcon, Trash2Icon, CheckCircleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';
import { apiClient } from '../../services/database/apiClient.ts';
import type { AssociateType, FormField, FormFieldType, FormLayoutField, FormStep } from '../../types.ts';
import { useModal } from '../../hooks/useModal.ts';
import { Modal } from '../Modal.tsx';

// --- SUB-COMPONENTS (Isolated in this file) ---

const ItemTypes = {
    PALETTE_FIELD: 'paletteField',
    CANVAS_FIELD: 'canvasField',
    STEP_SEPARATOR: 'stepSeparator',
    CANVAS_STEP: 'canvasStep'
};

// --- FieldEditorModal ---
const fieldTypes: { id: FormFieldType, label: string }[] = [
    { id: 'text', label: 'Texto Curto' },
    { id: 'textarea', label: 'Texto Longo' },
    { id: 'email', label: 'Email' },
    { id: 'password', label: 'Senha' },
    { id: 'select', label: 'Seleção (Dropdown)' },
    { id: 'radio', label: 'Múltipla Escolha (Radio)' },
    { id: 'checkbox', label: 'Caixa de Seleção (Checkbox)' },
];

const FieldEditorModal: React.FC<{
    field?: FormField | null;
    onClose: () => void;
    onSaveSuccess: () => void;
}> = ({ field, onClose, onSaveSuccess }) => {
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
                // Editing existing fields is not part of the current spec to avoid complexity.
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


// --- PaletteField ---
const PaletteField: React.FC<{
    field: FormField;
    onDelete: (id: number) => void;
}> = ({ field, onDelete }) => {
    const dragRef = React.useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.PALETTE_FIELD,
        item: { type: ItemTypes.PALETTE_FIELD, field },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));
    drag(dragRef);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents drag from initiating on button click
        onDelete(field.id);
    };

    return (
        <div
            ref={dragRef}
            style={{ opacity: isDragging ? 0.5 : 1 }}
            className="group flex items-center gap-3 p-3 rounded-lg bg-[#303134]/50 border border-gray-700 cursor-grab hover:bg-gray-700/50 hover:border-gray-600 transition-colors"
        >
            <div className="flex-grow">
                <p className="font-medium text-white">{field.label}</p>
                 <p className="text-xs text-gray-400 font-mono">
                    {field.field_name} ({field.field_type})
                </p>
            </div>
            {!!field.is_deletable && (
                 <button
                    onClick={handleDelete}
                    className="p-1 rounded-full text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label={`Excluir campo ${field.label} da paleta`}
                >
                    <Trash2Icon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

// --- Palette ---
const StepSeparatorPaletteItem = () => {
    const dragRef = React.useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.STEP_SEPARATOR,
        item: { type: ItemTypes.STEP_SEPARATOR },
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }));
    drag(dragRef);

    return (
        <div
            ref={dragRef}
            style={{ opacity: isDragging ? 0.5 : 1 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-fuchsia-900/40 border border-fuchsia-600/50 cursor-grab hover:bg-fuchsia-900/60 transition-colors"
        >
            <div className="flex-grow">
                <p className="font-medium text-fuchsia-200">Separador de Etapa</p>
                <p className="text-xs text-fuchsia-300/80">Arraste para criar uma nova seção no formulário.</p>
            </div>
        </div>
    );
};
const Palette: React.FC<{
    allFields: FormField[];
    layout: FormStep[];
    onDeleteField: (id: number) => void;
}> = ({ allFields, layout, onDeleteField }) => {
    const fieldsInLayout = new Set(layout.flatMap(step => step.fields.map(field => field.id)));
    const availableFields = allFields.filter(field => !fieldsInLayout.has(field.id));

    return (
        <div className="bg-[#202124] rounded-xl border border-gray-700 p-4 space-y-3">
             <h3 className="text-lg font-semibold text-gray-300 px-2">Paleta de Campos</h3>
             <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                <StepSeparatorPaletteItem />
                <div className="border-b border-gray-700 my-3"></div>

                {availableFields.length > 0 ? (
                    availableFields.map(field => (
                        <PaletteField
                            key={field.id}
                            field={field}
                            onDelete={onDeleteField}
                        />
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-10">
                        <p>Todos os campos disponíveis já estão no formulário.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- FieldCard ---
interface DragItem {
    index: number;
    stepIndex: number;
    field: FormLayoutField;
}
const FieldCard: React.FC<{
    index: number;
    stepIndex: number;
    field: FormLayoutField;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    onMove: (drag: { stepIndex: number, fieldIndex: number }, hover: { stepIndex: number, fieldIndex: number }) => void;
}> = ({ index, stepIndex, field, isSelected, onSelect, onRemove, onMove }) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: any }>({
        accept: ItemTypes.CANVAS_FIELD,
        collect(monitor) {
            return { handlerId: monitor.getHandlerId() };
        },
        hover(item: DragItem, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            const dragStepIndex = item.stepIndex;
            const hoverStepIndex = stepIndex;

            if (dragIndex === hoverIndex && dragStepIndex === hoverStepIndex) return;
            
            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
            
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
            
            onMove({ stepIndex: dragStepIndex, fieldIndex: dragIndex }, { stepIndex: hoverStepIndex, fieldIndex: hoverIndex });
            
            item.index = hoverIndex;
            item.stepIndex = hoverStepIndex;
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemTypes.CANVAS_FIELD,
        item: { index, stepIndex, field },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const dragHandleRef = useRef<HTMLDivElement>(null);
    preview(drop(ref));
    drag(dragHandleRef);
    

    return (
        <div
            ref={ref}
            data-handler-id={handlerId}
            onClick={onSelect}
            style={{ opacity: isDragging ? 0.4 : 1 }}
            className={`group flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected 
                ? 'bg-fuchsia-900/40 border-fuchsia-500 shadow-lg' 
                : 'bg-[#303134]/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600'
            }`}
        >
            <div ref={dragHandleRef} className="cursor-move text-gray-500 p-1">
                <GripVerticalIcon className="w-5 h-5" />
            </div>
            <div className="flex-grow">
                <p className="font-medium text-white">
                    {field.label} {field.is_required ? <span className="text-red-400">*</span> : ''}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                    {field.field_name} ({field.field_type})
                </p>
            </div>
            {!field.is_base_field && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="p-1 rounded-full text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remover campo ${field.label}`}
                >
                    <Trash2Icon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

// --- Canvas ---
const FieldDropZone: React.FC<{onDrop: (field: FormField) => void}> = ({ onDrop }) => {
    const fieldDropZoneRef = useRef<HTMLDivElement>(null);
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: [ItemTypes.PALETTE_FIELD, ItemTypes.CANVAS_FIELD],
        drop: (item: { type: string; field: FormField; }, monitor) => {
            if (item.type === ItemTypes.PALETTE_FIELD) {
                onDrop(item.field);
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            canDrop: monitor.canDrop(),
        })
    }), [onDrop]);
    drop(fieldDropZoneRef);
    
    return (
        <div ref={fieldDropZoneRef} className="h-12 border-2 border-dashed border-transparent rounded-lg transition-colors"
            style={{ borderColor: isOver && canDrop ? '#a855f7' : 'transparent' }}
        />
    )
}
const StepCard: React.FC<{
    step: FormStep;
    stepIndex: number;
    children: React.ReactNode;
    onMove: (dragIndex: number, hoverIndex: number) => void;
    onUpdate: (updatedStep: FormStep) => void;
    onRemove: () => void;
}> = ({ step, stepIndex, children, onMove, onUpdate, onRemove }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ handlerId }, drop] = useDrop({
        accept: ItemTypes.CANVAS_STEP,
        collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
        hover: (item: { index: number }, monitor) => {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = stepIndex;
            if (dragIndex === hoverIndex) return;
            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
            onMove(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemTypes.CANVAS_STEP,
        item: { index: stepIndex },
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    preview(drop(ref));
    const dragHandleRef = useRef<HTMLDivElement>(null);
    drag(dragHandleRef);
    
    return (
        <div ref={ref} data-handler-id={handlerId} style={{ opacity: isDragging ? 0.3 : 1 }} className="bg-[#303134]/50 rounded-lg p-4 border border-gray-600/50">
            <div className="flex items-center justify-between mb-3 -mt-1">
                <div className="flex items-center gap-2 flex-grow">
                    <div ref={dragHandleRef} className="cursor-move text-gray-500 p-1">
                        <GripVerticalIcon className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={step.title}
                        onChange={(e) => onUpdate({ ...step, title: e.target.value })}
                        className="bg-transparent text-lg font-semibold text-fuchsia-300 w-full outline-none focus:ring-1 focus:ring-fuchsia-500 rounded px-1"
                    />
                </div>
                <button
                    onClick={onRemove}
                    className="p-1 rounded-full text-gray-500 hover:text-red-400"
                    aria-label={`Remover etapa ${step.title}`}
                >
                    <Trash2Icon className="w-4 h-4" />
                </button>
            </div>
            {children}
        </div>
    );
};
const Canvas: React.FC<{
    layout: FormStep[];
    onFieldDrop: (field: FormField, stepIndex: number) => void;
    onStepDrop: (dropIndex: number) => void;
    onFieldReorder: (drag: { stepIndex: number, fieldIndex: number }, hover: { stepIndex: number, fieldIndex: number }) => void;
    onStepReorder: (dragIndex: number, hoverIndex: number) => void;
    onFieldSelect: (id: number) => void;
    onFieldRemove: (id: number) => void;
    onStepRemove: (id: number | string) => void;
    onStepUpdate: (updatedStep: FormStep) => void;
    selectedFieldId: number | null;
}> = ({ layout, onFieldDrop, onStepDrop, onFieldReorder, onStepReorder, onFieldSelect, onFieldRemove, onStepRemove, onStepUpdate, selectedFieldId }) => {
    
    const canvasDropRef = useRef<HTMLDivElement>(null);
    const [{ isOverCanvas }, dropCanvas] = useDrop(() => ({
        accept: ItemTypes.STEP_SEPARATOR,
        drop: () => onStepDrop(layout.length), // Drop at the end if not over a specific drop zone
        collect: (monitor) => ({ isOverCanvas: monitor.isOver() }),
    }), [layout.length, onStepDrop]);
    dropCanvas(canvasDropRef);
    
    const DropZone: React.FC<{ index: number }> = ({ index }) => {
        const dropZoneRef = useRef<HTMLDivElement>(null);
        const [{ isOver }, drop] = useDrop(() => ({
            accept: ItemTypes.STEP_SEPARATOR,
            drop: () => onStepDrop(index),
            collect: (monitor) => ({ isOver: monitor.isOver() }),
        }));
        drop(dropZoneRef);

        return (
             <div ref={dropZoneRef} className="h-4 my-2 relative">
                {isOver && <div className="absolute inset-0 bg-fuchsia-500/50 border-2 border-dashed border-fuchsia-300 rounded-lg" />}
            </div>
        );
    };

    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-300 px-2 mb-3">Layout do Formulário</h3>
            <div 
                ref={canvasDropRef}
                className={`bg-[#202124] rounded-xl border border-dashed p-4 min-h-[60vh] transition-colors duration-300 ${
                    isOverCanvas ? 'border-fuchsia-500 bg-fuchsia-900/20' : 'border-gray-700'
                }`}
                aria-label="Área do formulário"
            >
                <DropZone index={0} />
                {layout.map((step, stepIndex) => (
                    <React.Fragment key={step.id}>
                        <StepCard
                            step={step}
                            stepIndex={stepIndex}
                            onMove={onStepReorder}
                            onUpdate={onStepUpdate}
                            onRemove={() => onStepRemove(step.id)}
                        >
                            <div className="space-y-3 min-h-[50px]">
                                {step.fields.map((field, fieldIndex) => (
                                    <FieldCard
                                        key={field.id}
                                        index={fieldIndex}
                                        stepIndex={stepIndex}
                                        field={field}
                                        isSelected={selectedFieldId === field.id}
                                        onSelect={() => onFieldSelect(field.id)}
                                        onRemove={() => onFieldRemove(field.id)}
                                        onMove={onFieldReorder}
                                    />
                                ))}
                                 <FieldDropZone onDrop={(field) => onFieldDrop(field, stepIndex)} />
                            </div>
                        </StepCard>
                        <DropZone index={stepIndex + 1} />
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

// --- PropertiesPanel ---
const PropertiesPanel: React.FC<{
    field: FormLayoutField;
    onUpdate: (updatedField: FormLayoutField) => void;
    onClose: () => void;
}> = ({ field, onUpdate, onClose }) => {
    
    const handleRequiredToggle = () => {
        onUpdate({ ...field, is_required: !field.is_required });
    };

    return (
        <div className="bg-[#202124] rounded-xl border border-gray-700 p-4 space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-fuchsia-300" />
                    <h3 className="text-lg font-semibold text-gray-300">Propriedades</h3>
                </div>
                <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Fechar painel">
                    <XCircleIcon className="w-5 h-5"/>
                </button>
            </div>
            
             <div className="pt-2">
                <p className="text-sm font-medium text-white">{field.label}</p>
                <p className="text-xs text-gray-400 font-mono">{field.field_name}</p>
            </div>

            <div className="pt-4 border-t border-gray-600/50">
                <div className="flex items-center justify-between">
                     <label htmlFor="is-required-toggle" className="text-sm font-medium text-gray-300 select-none">
                        Campo Obrigatório
                    </label>
                    <button
                        type="button"
                        id="is-required-toggle"
                        onClick={handleRequiredToggle}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#202124] ${
                            field.is_required ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={!!field.is_required}
                        disabled={!!field.is_base_field}
                    >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            field.is_required ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                </div>
                {!!field.is_base_field && <p className="text-xs text-gray-500 mt-2">Campos essenciais são sempre obrigatórios.</p>}
            </div>

            {/* Placeholder for future properties */}
            <div className="text-center text-sm text-gray-600 pt-4">
                <p>Mais opções de validação e configuração estarão disponíveis em breve.</p>
            </div>

        </div>
    );
};

// --- MAIN COMPONENT ---
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

    const fetchAllData = useCallback(async (type: AssociateType) => {
        setIsLoading(true);
        setError(null);
        try {
            const [fields, layoutData] = await Promise.all([
                apiClient.get<FormField[]>('/admin/fields'),
                apiClient.get<FormStep[]>(`/admin/layouts/${type}`),
            ]);
            setAllFields(fields);
            
            if (layoutData.length === 0) {
                const newLayout: FormStep[] = [{ id: crypto.randomUUID(), title: 'Informações Principais', step_order: 0, fields: [] }];
                setLayout(newLayout);
                setInitialLayout(JSON.parse(JSON.stringify(newLayout))); // Deep copy
            } else {
                setLayout(layoutData);
                setInitialLayout(JSON.parse(JSON.stringify(layoutData))); // Deep copy
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao carregar dados do formulário.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData(selectedType);
        setSelectedFieldId(null);
    }, [selectedType, fetchAllData]);

    const handleSaveLayout = async (): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            await apiClient.put(`/admin/layouts/${selectedType}`, layout);
            setInitialLayout(JSON.parse(JSON.stringify(layout))); // Deep copy
            setShowSavedToast(true);
            setTimeout(() => setShowSavedToast(false), 2500);
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Falha ao salvar o layout.';
            setError(errorMessage);
            modal.alert({ title: 'Erro ao Salvar', message: errorMessage });
            return false;
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as AssociateType;
        if (newType === selectedType) {
            return;
        }

        if (hasUnsavedChanges) {
            const confirmed = await modal.confirm({
                title: 'Salvar Alterações?',
                message: 'Você tem alterações não salvas neste layout. Deseja salvá-las antes de trocar de formulário?',
                confirmLabel: 'Salvar e Trocar',
                cancelLabel: 'Descartar e Trocar',
            });

            if (confirmed) {
                const success = await handleSaveLayout();
                if (!success) {
                    return; // Do not switch if saving failed
                }
            }
        }
        
        setSelectedType(newType);
    };
    
    const handleFieldDrop = (field: FormField, stepIndex: number) => {
        if (layout.flatMap(s => s.fields).some(f => f.id === field.id)) return;
        
        const newFieldInLayout: FormLayoutField = { ...field, display_order: layout[stepIndex].fields.length, is_required: !!field.is_base_field };

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
                await fetchAllData(selectedType); // Pass current type to avoid race condition
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Falha ao excluir o campo.');
                setIsLoading(false);
            }
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            {isModalOpen && (
                <FieldEditorModal
                    onClose={() => setIsModalOpen(false)}
                    onSaveSuccess={() => fetchAllData(selectedType)}
                />
            )}
            <div className="max-w-7xl mx-auto relative">
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
                    <div className="flex-shrink-0 flex items-center gap-2">
                         <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-gray-600">
                            <PlusCircleIcon className="w-5 h-5" /> Adicionar Campo
                        </button>
                         <button
                            onClick={handleSaveLayout}
                            disabled={!hasUnsavedChanges || isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader /> : <CheckSquareIcon className="w-5 h-5" />}
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
                
                 <div className="mb-6">
                    <label htmlFor="associateType" className="block text-sm font-medium text-gray-300 mb-2">Configurando formulário para:</label>
                    <select
                        id="associateType"
                        value={selectedType}
                        onChange={handleTypeChange}
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
                 {/* Toast notification at top right */}
                <div className={`fixed top-20 right-8 z-50 transition-all duration-300 ease-in-out ${showSavedToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'}`}>
                    <div className="flex items-center gap-3 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-2xl border border-green-500/50" role="status">
                        <CheckCircleIcon className="w-5 h-5 text-green-400" />
                        <span className="font-semibold text-sm">Layout salvo com sucesso!</span>
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};