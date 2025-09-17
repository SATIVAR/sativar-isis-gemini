import React from 'react';
import { useDrag } from 'react-dnd';
import type { FormField } from '../../../types.ts';
import { Trash2Icon } from '../../icons.tsx';
import { ItemTypes } from './Canvas.tsx';

interface PaletteFieldProps {
    field: FormField;
    onDelete: (id: number) => void;
}

export const PaletteField: React.FC<PaletteFieldProps> = ({ field, onDelete }) => {
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