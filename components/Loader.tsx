
import React from 'react';

export const Loader: React.FC = () => (
  <div className="relative h-5 w-5">
    <style>{`
      @keyframes pulse-ring {
        0% {
          transform: scale(.33);
        }
        80%, 100% {
          opacity: 0;
        }
      }
      @keyframes pulse-dot {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(.75);
        }
      }
      .pulse-ring {
        animation: pulse-ring 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      }
      .pulse-dot {
        animation: pulse-dot 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) -.4s infinite;
      }
    `}</style>
    <div className="absolute top-0 left-0 w-full h-full rounded-full border-2 border-fuchsia-400 pulse-ring"></div>
    <div className="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full bg-fuchsia-400 pulse-dot"></div>
  </div>
);
