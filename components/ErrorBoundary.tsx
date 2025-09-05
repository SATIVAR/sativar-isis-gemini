import React, { useState, useEffect } from 'react';
import { AppError } from '../utils/errorHandler';
import { toastService } from '../services/toastService';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback: FallbackComponent }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (hasError) {
      // Show a user-friendly error message
      toastService.error('Ocorreu um erro inesperado. Por favor, tente novamente.');
    }
  }, [hasError]);

  const resetError = () => {
    setHasError(false);
    setError(null);
  };

  // This is a simplified error boundary implementation
  // In a real application, you would use React's built-in error boundaries
  // or a library like react-error-boundary for better error handling

  if (hasError) {
    // If a fallback component is provided, render it
    if (FallbackComponent) {
      return <FallbackComponent error={error!} resetError={resetError} />;
    }

    // Default error UI
    return (
      <div className="flex h-screen items-center justify-center bg-[#131314] font-sans text-gray-200">
        <div className="text-center max-w-md p-6 bg-gray-800 rounded-lg shadow-xl">
          <div className="mb-4">
            <div className="rounded-full h-16 w-16 bg-red-500 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-red-400">Algo deu errado!</h2>
          <p className="text-gray-300 mb-4">
            Ocorreu um erro inesperado. Nosso time foi notificado e estamos trabalhando para resolver.
          </p>
          <div className="bg-gray-900 p-4 rounded mb-4">
            <p className="text-sm text-gray-400 font-mono">
              {error instanceof AppError 
                ? error.message 
                : error?.toString() || 'Erro desconhecido'}
            </p>
            {error instanceof AppError && error.context && (
              <p className="text-sm text-gray-500 mt-2">
                Contexto: {error.context}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Recarregar Página
            </button>
            <button 
              onClick={resetError}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Tentar Novamente
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>Se o problema persistir, entre em contato com o suporte técnico.</p>
          </div>
        </div>
      </div>
    );
  }

  // Since we can't use React's built-in error boundaries in a functional component,
  // we'll just render the children normally
  return <>{children}</>;
};

export default ErrorBoundary;