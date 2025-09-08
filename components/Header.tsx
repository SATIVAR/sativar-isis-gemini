
import React, { useState } from 'react';
import type { Page } from '../App.tsx';
import { SettingsIcon, BellIcon } from './icons.tsx';
import { useReminders } from '../hooks/useReminders.ts';
import { useSettings } from '../hooks/useSettings.ts';
import { RemindersList } from './Reminders.tsx';
import { Logo } from './Logo.tsx';
import { useConnection } from '../hooks/useConnection.ts';

interface HeaderProps {
    setCurrentPage: (page: Page) => void;
    currentPage: Page;
}

export const Header: React.FC<HeaderProps> = ({ setCurrentPage, currentPage }) => {
    const [isRemindersOpen, setIsRemindersOpen] = useState(false);
    const { reminders, hasOverdueReminders } = useReminders();
    const { settings } = useSettings();
    const { isOnline } = useConnection();

    const pendingCount = reminders.filter(r => !r.isCompleted).length;
    
    const handleSettingsClick = () => {
        setIsRemindersOpen(false); // Close reminders when navigating
        if (currentPage === 'settings') {
            setCurrentPage('chat');
        } else {
            setCurrentPage('settings');
        }
    };
    
    const handleHomeClick = () => {
        setIsRemindersOpen(false); // Close reminders when navigating
        setCurrentPage('chat');
    }

    return (
        <>
            <style>{`
                @keyframes pulse-red {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
                    }
                }
                .pulse-alert {
                    animation: pulse-red 2s infinite;
                }
            `}</style>
            <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-700/50 bg-[#131314] p-4">
                <div className="flex items-center gap-4">
                     <Logo className="h-10 w-10" />
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-xl font-semibold text-gray-200 hover:text-white transition-colors" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
                                SATIVAR - Isis
                            </h1>
                            <span className="select-none bg-green-900/50 text-green-300 text-xs font-mono px-2 py-0.5 rounded-full border border-green-700/50">
                                v0.30
                            </span>
                            <div 
                                className={`w-2.5 h-2.5 rounded-full transition-colors ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                                title={isOnline ? 'Conectado ao servidor' : 'Operando em modo offline. As alterações serão salvas localmente.'}
                            ></div>
                        </div>
                        {settings.associationName && (
                            <p className="text-sm text-gray-400 -mt-1">{settings.associationName}</p>
                        )}
                    </div>
                </div>
                <nav className="flex items-center gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setIsRemindersOpen(prev => !prev)}
                            className={`rounded-full p-2 transition-colors hover:bg-gray-700 ${hasOverdueReminders ? 'pulse-alert' : ''}`}
                            aria-label="Toggle reminders"
                        >
                            <BellIcon className="h-6 w-6 text-gray-400" />
                            {pendingCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                        {isRemindersOpen && <RemindersList onClose={() => setIsRemindersOpen(false)} />}
                    </div>

                    <button 
                        onClick={handleSettingsClick}
                        className="rounded-full p-2 transition-colors hover:bg-gray-700"
                        aria-label="Toggle settings"
                    >
                        <SettingsIcon className="h-6 w-6 text-gray-400" />
                    </button>
                </nav>
            </header>
        </>
    );
};
