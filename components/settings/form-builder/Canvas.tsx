import React from 'react';
import { useDrop } from 'react-dnd';
import type { FormLayoutField, FormField } from '../../../types.ts';
import { FieldCard } from './FieldCard.tsx';

interface CanvasProps {
    layout: FormLayoutField[];
    onFieldDrop: (field: FormField) => void;
    onFieldReorder: (dragIndex: number, hoverIndex: number) => void;
    onFieldSelect: (id: number) => void;
    onFieldRemove: (id: number) => void;
    selectedFieldId: number | null;
}

const ItemTypes = {
    PALETTE_FIELD: 'paletteField',
    CANVAS_FIELD: 'canvasField',
};

export const Canvas: React.FC<CanvasProps> = ({
    layout,
    onFieldDrop,
    onFieldReorder,
    onFieldSelect,
    onFieldRemove,
    selectedFieldId
}) => {
    // FIX: Apply react-dnd drop connector via a ref object to resolve TypeScript error with React 18 types.
    const dropRef = React.useRef<HTMLDivElement>(null);
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: [ItemTypes.PALETTE_FIELD, ItemTypes.CANVAS_FIELD],
        drop: (item: { type: string; field?: FormField; index?: number }, monitor) => {
            if (monitor.didDrop()) return;

            if (item.type === ItemTypes.PALETTE_FIELD && item.field) {
                onFieldDrop(item.field);
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            canDrop: monitor.canDrop(),
        }),
    }), [onFieldDrop]);
    drop(dropRef);
    
    const isActive = isOver && canDrop;

    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-300 px-2 mb-3">Layout do Formulário</h3>
            <div 
                ref={dropRef}
                className={`bg-[#202124] rounded-xl border border-dashed p-4 min-h-[60vh] space-y-3 transition-colors duration-300 ${
                    isActive ? 'border-fuchsia-500 bg-fuchsia-900/20' : 'border-gray-700'
                }`}
                aria-label="Área do formulário. Arraste campos da paleta para cá."
            >
                {layout.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-gray-500 py-20">
                        <p className="font-semibold">Arraste os campos da paleta à direita para começar a construir o formulário.</p>
                    </div>
                ) : (
                    layout.map((field, index) => (
                        <FieldCard
                            key={field.id}
                            index={index}
                            field={field}
                            isSelected={selectedFieldId === field.id}
                            onSelect={() => onFieldSelect(field.id)}
                            onRemove={() => onFieldRemove(field.id)}
                            onMove={onFieldReorder}
                            itemType={ItemTypes.CANVAS_FIELD}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
