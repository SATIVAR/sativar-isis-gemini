import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  progress?: number;
  operation?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Processando...', 
  progress,
  operation 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
      <h3 className="text-lg font-medium text-gray-800 mb-2">
        {operation ? `${operation}...` : 'Processando...'}
      </h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {progress !== undefined && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      {progress !== undefined && (
        <span className="text-sm text-gray-500 mt-2">{progress}%</span>
      )}
    </div>
  );
};

export default LoadingSpinner;