
import React from 'react';
import { CheckSquareIcon, CheckCircleIcon } from '../../icons.tsx';
import { Loader } from '../../Loader.tsx';

interface FloatingSaveButtonProps {
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    showSavedToast: boolean;
    onSave: () => void;
}

export const FloatingSaveButton: React.FC<FloatingSaveButtonProps> = ({
    hasUnsavedChanges,
    isSaving,
    showSavedToast,
    onSave,
}) => (
    <div 
        className={`fixed bottom-8 right-0 left-0 flex justify-center md:right-8 z-50 transition-all duration-300 ease-in-out ${
        (hasUnsavedChanges || showSavedToast) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'
        }`}
    >
        <div className="relative">
            {hasUnsavedChanges && (
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-2xl hover:bg-green-700 transition-transform hover:scale-105 disabled:opacity-70 disabled:cursor-wait"
                    aria-label="Salvar alterações no layout"
                >
                    {isSaving ? <Loader /> : <CheckSquareIcon className="w-6 h-6" />}
                    <span className="text-sm">{isSaving ? 'Salvando...' : 'Salvar Layout'}</span>
                </button>
            )}
            {showSavedToast && (
                <div className="flex items-center gap-3 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-2xl border border-green-500/50" role="status">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span className="font-semibold text-sm">Layout salvo com sucesso!</span>
                </div>
            )}
        </div>
    </div>
);
