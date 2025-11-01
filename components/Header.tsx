
import React, { useState } from 'react';
import type { Page, AppMode } from '../App.tsx';
import { SettingsIcon, BellIcon, PlusIcon, RepeatIcon, BriefcaseIcon, SparklesIcon } from './icons.tsx';
import { useReminders } from '../hooks/useReminders.ts';
import { useSettings } from '../hooks/useSettings.ts';
import { RemindersList } from './Reminders.tsx';
import { Logo } from './Logo.tsx';
import { useConnection } from '../hooks/useConnection.ts';
import { useAuth } from '../hooks/useAuth.ts';

interface HeaderProps {
    setCurrentPage: (page: Page) => void;
    currentPage: Page;
    currentMode: AppMode;
    setCurrentMode: (mode: AppMode) => void;
    onToggleMobileHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ setCurrentPage, currentPage, currentMode, setCurrentMode, onToggleMobileHistory }) => {
    const [isRemindersOpen, setIsRemindersOpen] = useState(false);
    const { reminders, hasOverdueReminders } = useReminders();
    const { settings } = useSettings();
    const { isOnline } = useConnection();
    const auth = useAuth();

    const pendingCount = reminders.filter(r => !r.isCompleted).length;
    
    const handleSettingsClick = () => {
        setIsRemindersOpen(false); // Close reminders when navigating
        if (currentPage === 'settings') {
            setCurrentPage('main');
        } else {
            setCurrentPage('settings');
        }
    };
    
    const handleHomeClick = () => {
        setIsRemindersOpen(false); // Close reminders when navigating
        setCurrentPage('main');
    }

    const handleModeToggle = () => {
        setCurrentMode(currentMode === 'isis' ? 'seishat' : 'isis');
        setCurrentPage('main'); // Always go to the main page of the new mode
    };

    return (
        <>
            <style>{`
                @keyframes gentle-pulse {
                    0%, 100% {
                        transform: scale(1);
                        color: #f87171; /* Tailwind red-400 */
                    }
                    50% {
                        transform: scale(1.1);
                        color: #fca5a5; /* Tailwind red-300 */
                    }
                }
                .pulse-alert svg {
                    animation: gentle-pulse 2s ease-in-out infinite;
                }
            `}</style>
            <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-700/50 bg-[#131314] p-4">
                <div className="flex items-center gap-2 md:gap-4">
                     <Logo className="h-10 w-10" />
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-xl font-semibold text-gray-200 hover:text-white transition-colors" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
                                SATIVAR - {currentMode === 'isis' ? 'Isis' : 'Seishat'}
                            </h1>
                            <span
                                className={`select-none text-xs font-mono px-2 py-0.5 rounded-full transition-colors cursor-help ${isOnline ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                                title={isOnline ? 'v0.30 - Conectado ao servidor' : 'v0.30 - Operando em modo offline. As alterações serão salvas localmente.'}
                            >
                                v0.30
                            </span>
                        </div>
                        {settings.associationName && (
                            <p className="text-sm text-gray-400 -mt-1">{settings.associationName}</p>
                        )}
                    </div>
                </div>
                {auth.isAuthenticated && (
                    <nav className="flex items-center gap-2">
                        {currentMode === 'isis' && currentPage === 'main' && (
                            <button
                                onClick={onToggleMobileHistory}
                                className="rounded-full p-2 transition-colors hover:bg-gray-700 min-[461px]:hidden"
                                aria-label="Nova análise ou ver histórico"
                            >
                                <PlusIcon className="h-6 w-6 text-gray-400" />
                            </button>
                        )}
                        
                        <button
                            onClick={handleModeToggle}
                            className="rounded-full p-2 transition-colors hover:bg-gray-700"
                            title={currentMode === 'isis' ? 'Alternar para Modo Seishat (CRM)' : 'Alternar para Modo Isis (IA)'}
                            aria-label="Alternar modo de operação"
                        >
                           {currentMode === 'isis' ? <BriefcaseIcon className="h-6 w-6 text-gray-400" /> : <SparklesIcon className="h-6 w-6 text-gray-400" />}
                        </button>
                        
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
                        
                        {auth.user?.role !== 'user' && currentMode === 'isis' && (
                            <button 
                                onClick={handleSettingsClick}
                                className="rounded-full p-2 transition-colors hover:bg-gray-700"
                                aria-label="Toggle settings"
                            >
                                <SettingsIcon className="h-6 w-6 text-gray-400" />
                            </button>
                        )}
                    </nav>
                )}
            </header>
        </>
    );
};
