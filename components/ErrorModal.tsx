import React from 'react';
import { AppError, ErrorHandler } from '../utils/errorHandler';

interface ErrorModalProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ error, onRetry, onDismiss }) => {
  const suggestions = ErrorHandler.getErrorSuggestions(error.code);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-red-600">Erro</h3>
            <button 
              onClick={onDismiss}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-800 font-medium mb-2">{error.message}</p>
            {error.details && (
              <p className="text-gray-600 text-sm mb-3">{error.details}</p>
            )}
            
            {error.context && (
              <div className="bg-blue-50 p-3 rounded-md mb-3">
                <p className="text-blue-800 text-sm">
                  <span className="font-medium">Contexto:</span> {error.context}
                </p>
              </div>
            )}
            
            {suggestions && (
              <div className="bg-yellow-50 p-3 rounded-md mb-3">
                <p className="text-yellow-800 text-sm">
                  <span className="font-medium">Sugestões:</span> {suggestions}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Tentar Novamente
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;