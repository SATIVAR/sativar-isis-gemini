
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`relative bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-fuchsia-500/25 dark:shadow-purple-500/10 border border-white/30 ${className}`}>
        <div className="absolute inset-0 bg-white/10 rounded-full backdrop-blur-sm"></div>
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-1/2 h-1/2 text-white relative z-10"
            aria-label="SATIVAR - Isis Logo"
        >
            <path d="M12 6V2H8"></path>
            <path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z"></path>
            <path d="M2 12h2"></path>
            <path d="M9 11v2"></path>
            <path d="M15 11v2"></path>
            <path d="M20 12h2"></path>
        </svg>
    </div>
);