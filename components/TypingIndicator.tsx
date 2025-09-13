import React, { useState, useEffect } from 'react';

export const TypingIndicator: React.FC<{ text?: string }> = ({ text }) => {
    const [currentText, setCurrentText] = useState<string | undefined>(undefined);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Handle the very first text appearing without animation
        if (text && !currentText) {
            setCurrentText(text);
            return;
        }

        // Handle text changes
        if (text !== currentText) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setCurrentText(text);
                setIsAnimating(false);
            }, 300); // Half of total animation time
            return () => clearTimeout(timer);
        }
    }, [text, currentText]);

    return (
        <div className="flex items-center gap-1.5 py-2">
            <style>{`
            @keyframes bounce {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1.0); }
            }
            .bounce-dot {
                width: 8px;
                height: 8px;
                background-color: #c084fc;
                border-radius: 100%;
                display: inline-block;
                animation: bounce 1.4s infinite ease-in-out both;
            }
            .bounce-dot:nth-child(1) { animation-delay: -0.32s; }
            .bounce-dot:nth-child(2) { animation-delay: -0.16s; }
            .text-transition {
                transition: opacity 0.3s ease-in-out;
            }
            `}</style>
            <div className="bounce-dot"></div>
            <div className="bounce-dot"></div>
            <div className="bounce-dot"></div>
            <span
                className={`ml-2 text-sm text-gray-400 italic text-transition ${
                    isAnimating || !currentText ? 'opacity-0' : 'opacity-100'
                }`}
            >
                {currentText}
            </span>
        </div>
    );
};
