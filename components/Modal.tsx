import React, { ReactNode, useEffect } from 'react';
import { XCircleIcon } from './icons.tsx';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  icon?: ReactNode;
  size?: 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose, footer, icon, size = 'md' }) => {
  // Add keyboard support for closing the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  
  const sizeClass = size === 'lg' ? 'max-w-lg' : 'max-w-md';

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
    >
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes scale-up {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            .animate-scale-up { animation: scale-up 0.2s ease-out forwards; }
        `}</style>
      <div 
        className={`bg-[#202124] rounded-xl border border-gray-700 w-full ${sizeClass} shadow-2xl animate-scale-up flex flex-col`} 
        onClick={e => e.stopPropagation()}
      >
        <header className="flex-shrink-0 p-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {icon}
            <h3 id="modal-title" className="text-lg font-bold text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Fechar">
            <XCircleIcon className="w-6 h-6"/>
          </button>
        </header>
        <main className="p-6 text-gray-300 text-sm">
          {children}
        </main>
        {footer && (
          <footer className="flex-shrink-0 p-4 border-t border-gray-700/50 flex justify-end gap-3 bg-[#303134]/30 rounded-b-xl">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};