
import React from 'react';
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

export const Canvas: React.FC<CanvasProps> = ({
    layout,
    onFieldDrop,
    onFieldReorder,
    onFieldSelect,
    onFieldRemove,
    selectedFieldId
}) => {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const fieldData = e.dataTransfer.getData('application/json');
        if (fieldData) {
            const field: FormField = JSON.parse(fieldData);
            onFieldDrop(field);
        }
    };
    
    return (
        <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="bg-[#202124] rounded-xl border border-dashed border-gray-700 p-4 min-h-[60vh] space-y-3 transition-colors duration-300"
            aria-label="Área do formulário. Arraste campos da paleta para cá."
        >
            <h3 className="text-lg font-semibold text-gray-300 px-2">Layout do Formulário</h3>
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
                    />
                ))
            )}
        </div>
    );
};
