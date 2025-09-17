import React from 'react';
import type { FormLayoutField } from '../../../types.ts';
import { SettingsIcon, XCircleIcon } from '../../icons.tsx';

interface PropertiesPanelProps {
    field: FormLayoutField;
    onUpdate: (updatedField: FormLayoutField) => void;
    onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ field, onUpdate, onClose }) => {
    
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
                        disabled={!!field.is_core_field}
                    >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            field.is_required ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                </div>
                {!!field.is_core_field && <p className="text-xs text-gray-500 mt-2">Campos essenciais são sempre obrigatórios.</p>}
            </div>

            {/* Placeholder for future properties */}
            <div className="text-center text-sm text-gray-600 pt-4">
                <p>Mais opções de validação e configuração estarão disponíveis em breve.</p>
            </div>

        </div>
    );
};
