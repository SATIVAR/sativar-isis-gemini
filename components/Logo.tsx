import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="SATIVAR - Isis Logo"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="100%" stopColor="#166534" />
      </linearGradient>
    </defs>
    {/* Main bot head/body, shaped like a chat bubble */}
    <path 
        d="M18 3H6C4.34315 3 3 4.34315 3 6V14C3 15.6569 4.34315 17 6 17H7V21L11.6667 17H18C19.6569 17 21 15.6569 21 14V6C21 4.34315 19.6569 3 18 3Z" 
        fill="url(#logoGradient)" 
    />
    
    {/* Robot Eyes */}
    <circle cx="10" cy="10" r="1.5" fill="#dcfce7"/>
    <circle cx="14" cy="10" r="1.5" fill="#dcfce7"/>
    
    {/* Robot Mouth */}
    <path d="M10 14H14" stroke="#dcfce7" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);