import React from 'react';
import type { Page } from '../App';
import { SettingsIcon } from './icons';

interface HeaderProps {
    setCurrentPage: (page: Page) => void;
    currentPage: Page;
}

export const Header: React.FC<HeaderProps> = ({ setCurrentPage, currentPage }) => {
    
    const handleSettingsClick = () => {
        if (currentPage === 'settings') {
            setCurrentPage('chat');
        } else {
            setCurrentPage('settings');
        }
    };

    return (
        <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-700/50 bg-[#131314] p-4">
            <div className="flex items-center gap-4">
                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-900">
                    <span className="text-xl font-bold text-fuchsia-200">I</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-200 hover:text-white transition-colors" onClick={() => setCurrentPage('chat')} style={{ cursor: 'pointer' }}>
                    SATIVAR - Isis
                </h1>
            </div>
            <nav>
                <button 
                    onClick={handleSettingsClick}
                    className="rounded-full p-2 transition-colors hover:bg-gray-700"
                    aria-label="Toggle settings"
                >
                    <SettingsIcon className="h-6 w-6 text-gray-400" />
                </button>
            </nav>
        </header>
    );
};