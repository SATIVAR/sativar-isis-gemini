import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
// FIX: Import the FormLayoutField type from the central types.ts file.
import type { FormLayoutField } from '../../../types.ts';
import { GripVerticalIcon, Trash2Icon } from '../../icons.tsx';
import { ItemTypes } from './Canvas.tsx';

interface FieldCardProps {
    index: number;
    stepIndex: number;
    field: FormLayoutField;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    onMove: (drag: { stepIndex: number, fieldIndex: number }, hover: { stepIndex: number, fieldIndex: number }) => void;
}

interface DragItem {
    index: number;
    stepIndex: number;
    field: FormLayoutField;
}

export const FieldCard: React.FC<FieldCardProps> = ({
    index,
    stepIndex,
    field,
    isSelected,
    onSelect,
    onRemove,
    onMove,
}) => {
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