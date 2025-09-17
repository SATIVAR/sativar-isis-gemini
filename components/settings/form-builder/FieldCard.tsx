
import React, { useRef } from 'react';
import type { FormLayoutField } from '../../../types.ts';
import { GripVerticalIcon, Trash2Icon } from '../../icons.tsx';

interface FieldCardProps {
    index: number;
    field: FormLayoutField;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    onMove: (dragIndex: number, hoverIndex: number) => void;
}

export const FieldCard: React.FC<FieldCardProps> = ({
    index,
    field,
    isSelected,
    onSelect,
    onRemove,
    onMove
}) => {
    const ref = useRef<HTMLDivElement>(null);
    
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ index }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const dragData = e.dataTransfer.getData('application/json');
        if (dragData) {
            const { index: dragIndex } = JSON.parse(dragData);
            if (dragIndex !== index) {
                onMove(dragIndex, index);
            }
        }
    };
    
    return (
        <div
            ref={ref}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={onSelect}
            className={`group flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected 
                ? 'bg-fuchsia-900/40 border-fuchsia-500 shadow-lg' 
                : 'bg-[#303134]/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600'
            }`}
        >
            <div className="cursor-move text-gray-500">
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
             {!field.is_core_field && (
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
