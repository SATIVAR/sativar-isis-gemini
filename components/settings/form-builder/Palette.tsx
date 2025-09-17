
import React from 'react';
import type { FormField, FormLayoutField } from '../../../types.ts';

const PaletteField: React.FC<{ field: FormField }> = ({ field }) => {
    
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify(field));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="flex items-center gap-3 p-3 rounded-lg bg-[#303134]/50 border border-gray-700 cursor-grab hover:bg-gray-700/50 hover:border-gray-600 transition-colors"
        >
            <div className="flex-grow">
                <p className="font-medium text-white">{field.label}</p>
                 <p className="text-xs text-gray-400 font-mono">
                    {field.field_name} ({field.field_type})
                </p>
            </div>
        </div>
    );
};

interface PaletteProps {
    allFields: FormField[];
    layout: FormLayoutField[];
}

export const Palette: React.FC<PaletteProps> = ({ allFields, layout }) => {
    const availableFields = allFields.filter(
        field => !layout.some(layoutField => layoutField.id === field.id)
    );

    return (
        <div className="bg-[#202124] rounded-xl border border-gray-700 p-4 space-y-3">
             <h3 className="text-lg font-semibold text-gray-300 px-2">Paleta de Campos</h3>
             <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                {availableFields.length > 0 ? (
                    availableFields.map(field => <PaletteField key={field.id} field={field} />)
                ) : (
                    <div className="text-center text-gray-500 py-10">
                        <p>Todos os campos disponíveis já estão no formulário.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
