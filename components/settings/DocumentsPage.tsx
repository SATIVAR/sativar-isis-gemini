
import React from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import { FileTextIcon } from '../icons.tsx';

const mimeTypeOptions = [
    { id: 'application/pdf', label: 'PDF' },
    { id: 'image/jpeg', label: 'JPG/JPEG' },
    { id: 'image/png', label: 'PNG' },
];

export const DocumentsPage: React.FC = () => {
    const { formState, setFormState } = useSettings();
    const { allowedMimeTypes = [], pdfOnly = false } = formState.documentSettings || { allowedMimeTypes: [], pdfOnly: false };

    const handlePdfOnlyToggle = () => {
        const newPdfOnly = !pdfOnly;
        setFormState(prev => ({
            ...prev,
            documentSettings: {
                ...prev.documentSettings,
                pdfOnly: newPdfOnly,
                allowedMimeTypes: newPdfOnly ? ['application/pdf'] : prev.documentSettings.allowedMimeTypes,
            }
        }));
    };

    const handleMimeTypeChange = (mimeType: string) => {
        const newMimeTypes = allowedMimeTypes.includes(mimeType)
            ? allowedMimeTypes.filter(m => m !== mimeType)
            : [...allowedMimeTypes, mimeType];
        
        setFormState(prev => ({
            ...prev,
            documentSettings: {
                ...prev.documentSettings,
                allowedMimeTypes: newMimeTypes,
            }
        }));
    };

    return (
        <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8 space-y-8">
            <div>
                <div className="flex items-center gap-4 mb-2">
                    <FileTextIcon className="w-8 h-8 text-fuchsia-300" />
                    <h2 className="text-2xl font-bold text-white">Configurações de Documentos</h2>
                </div>
                <p className="text-gray-400">
                    Defina os tipos de arquivo permitidos para upload no sistema e outras regras de documentos.
                </p>
            </div>
            <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <h3 className="text-lg font-semibold text-fuchsia-300">Tipos de Arquivo Permitidos</h3>
                <div className="flex items-center justify-between p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                    <label htmlFor="pdf-only-toggle" className="text-sm font-medium text-gray-300 select-none">
                        Permitir somente arquivos PDF
                    </label>
                    <button
                        type="button"
                        id="pdf-only-toggle"
                        onClick={handlePdfOnlyToggle}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#202124] ${pdfOnly ? 'bg-green-600' : 'bg-gray-600'}`}
                        role="switch"
                        aria-checked={pdfOnly}
                    >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pdfOnly ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className={`pt-4 border-t border-gray-700/50 ${pdfOnly ? 'opacity-50' : ''}`}>
                     <p className="text-sm font-medium text-gray-300 mb-3">
                        Selecione os tipos de arquivo permitidos:
                     </p>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {mimeTypeOptions.map(option => (
                            <label key={option.id} className="flex items-center gap-3 p-3 bg-[#202124] rounded-lg border border-gray-600/50 cursor-pointer has-[:checked]:border-fuchsia-500 has-[:checked]:bg-fuchsia-900/40">
                                <input
                                    type="checkbox"
                                    checked={allowedMimeTypes.includes(option.id)}
                                    onChange={() => handleMimeTypeChange(option.id)}
                                    disabled={pdfOnly}
                                    className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-fuchsia-600 focus:ring-fuchsia-500"
                                />
                                <span className="text-sm text-gray-300">{option.label}</span>
                            </label>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    );
};
