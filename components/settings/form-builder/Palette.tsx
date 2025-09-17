import React from 'react';
import type { FormField, FormLayoutField } from '../../../types.ts';
import { PaletteField } from './PaletteField.tsx';

interface PaletteProps {
    allFields: FormField[];
    layout: FormLayoutField[];
    onDeleteField: (id: number) => void;
}

export const Palette: React.FC<PaletteProps> = ({ allFields, layout, onDeleteField }) => {
    const availableFields = allFields.filter(
        field => !layout.some(layoutField => layoutField.id === field.id)
    );

    return (
        <div className="bg-[#202124] rounded-xl border border-gray-700 p-4 space-y-3">
             <h3 className="text-lg font-semibold text-gray-300 px-2">Paleta de Campos</h3>
             <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
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