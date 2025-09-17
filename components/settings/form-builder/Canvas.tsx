
import React, { useRef, useState } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import type { FormLayoutField, FormField, FormStep } from '../../../types.ts';
import { FieldCard } from './FieldCard.tsx';
import { GripVerticalIcon, Trash2Icon } from '../../icons.tsx';

export const ItemTypes = {
    PALETTE_FIELD: 'paletteField',
    CANVAS_FIELD: 'canvasField',
    STEP_SEPARATOR: 'stepSeparator',
    CANVAS_STEP: 'canvasStep'
};

interface StepCardProps {
    step: FormStep;
    stepIndex: number;
    children: React.ReactNode;
    onMove: (dragIndex: number, hoverIndex: number) => void;
    onUpdate: (updatedStep: FormStep) => void;
    onRemove: () => void;
}

const StepCard: React.FC<StepCardProps> = ({ step, stepIndex, children, onMove, onUpdate, onRemove }) => {
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

interface CanvasProps {
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
}

export const Canvas: React.FC<CanvasProps> = ({
    layout, onFieldDrop, onStepDrop, onFieldReorder, onStepReorder,
    onFieldSelect, onFieldRemove, onStepRemove, onStepUpdate, selectedFieldId
}) => {
    
    // FIX: Use imperative ref connection for drop target to fix typing error.
    const canvasDropRef = useRef<HTMLDivElement>(null);
    const [{ isOverCanvas }, dropCanvas] = useDrop(() => ({
        accept: ItemTypes.STEP_SEPARATOR,
        drop: () => onStepDrop(layout.length), // Drop at the end if not over a specific drop zone
        collect: (monitor) => ({ isOverCanvas: monitor.isOver() }),
    }), [layout.length, onStepDrop]);
    dropCanvas(canvasDropRef);
    
    const DropZone: React.FC<{ index: number }> = ({ index }) => {
        // FIX: Use imperative ref connection for drop target to fix typing error.
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

const FieldDropZone: React.FC<{onDrop: (field: FormField) => void}> = ({ onDrop }) => {
    // FIX: Use imperative ref connection for drop target to fix typing error.
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
