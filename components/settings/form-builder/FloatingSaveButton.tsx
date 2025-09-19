import React from 'react';
import { CheckSquareIcon } from '../../icons.tsx';
import { Loader } from '../../Loader.tsx';

interface FloatingSaveButtonProps {
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    onSave: () => void;
}

export const FloatingSaveButton: React.FC<FloatingSaveButtonProps> = ({
    hasUnsavedChanges,
    isSaving,
    onSave,
}) => (
    <div 
        className={`fixed bottom-8 right-0 left-0 flex justify-center md:right-8 z-50 transition-all duration-300 ease-in-out ${
        (hasUnsavedChanges) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'
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
        </div>
    </div>
);