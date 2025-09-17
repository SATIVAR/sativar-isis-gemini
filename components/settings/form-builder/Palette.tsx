import React from 'react';
import type { FormField, FormStep } from '../../../types.ts';
import { PaletteField } from './PaletteField.tsx';
import { ItemTypes } from './Canvas.tsx';
// FIX: Add missing 'useDrag' import.
import { useDrag } from 'react-dnd';

interface PaletteProps {
    allFields: FormField[];
    layout: FormStep[];
    onDeleteField: (id: number) => void;
}

const StepSeparatorPaletteItem = () => {
    // FIX: Correctly connect the drag source to a ref to resolve the TypeScript error.
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

export const Palette: React.FC<PaletteProps> = ({ allFields, layout, onDeleteField }) => {
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