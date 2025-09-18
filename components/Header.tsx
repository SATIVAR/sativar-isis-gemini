

import React, { useState } from 'react';
import type { AppMode } from '../App.tsx';
import { BellIcon, PlusIcon, BriefcaseIcon, SparklesIcon } from './icons.tsx';
import { useReminders } from '../hooks/useReminders.ts';
import { useSettings } from '../hooks/useSettings.ts';
import { RemindersList } from './Reminders.tsx';
import { Logo } from './Logo.tsx';
import { useConnection } from '../hooks/useConnection.ts';
import { useAuth } from '../hooks/useAuth.ts';

interface HeaderProps {
    currentMode: AppMode;
    setCurrentMode: (mode: AppMode) => void;
    onToggleMobileHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentMode, setCurrentMode, onToggleMobileHistory }) => {
    const [isRemindersOpen, setIsRemindersOpen] = useState(false);
    const { reminders, hasOverdueReminders } = useReminders();
    const { settings } = useSettings();
    const { isOnline } = useConnection();
    const auth = useAuth();
    const appVersion = `v.${new Date().getFullYear().toString().slice(-2)}`;

    const pendingCount = reminders.filter(r => !r.isCompleted).length;
    
    const handleHomeClick = () => {
        setIsRemindersOpen(false); // Close reminders when navigating
        // The concept of a separate "main" page is removed; this just ensures reminders close.
    }

    const handleModeToggle = () => {
        setCurrentMode(currentMode === 'isis' ? 'seishat' : 'isis');
    };

    const canShowModeToggle = auth.user?.role === 'admin' || settings.isIsisAiEnabled;
    const isIsisDeactivatedForOthers = auth.user?.role === 'admin' && !settings.isIsisAiEnabled;

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
                                title={isOnline ? `${appVersion} - Conectado ao servidor` : `${appVersion} - Operando em modo offline. As alterações serão salvas localmente.`}
                            >
                                {appVersion}
                            </span>
                        </div>
                        {settings.associationName && (
                            <p className="text-sm text-gray-400 -mt-1">{settings.associationName}</p>
                        )}
                    </div>
                </div>
                {auth.isAuthenticated && (
                    <nav className="flex items-center gap-2">
                        {currentMode === 'isis' && (
                            <button
                                onClick={onToggleMobileHistory}
                                className="rounded-full p-2 transition-colors hover:bg-gray-700 min-[461px]:hidden"
                                aria-label="Nova análise ou ver histórico"
                            >
                                <PlusIcon className="h-6 w-6 text-gray-400" />
                            </button>
                        )}
                        
                        {canShowModeToggle && (
                            <div className="relative">
                                <button
                                    onClick={handleModeToggle}
                                    className="rounded-full p-2 transition-colors hover:bg-gray-700"
                                    title={
                                        isIsisDeactivatedForOthers 
                                            ? 'Modo Isis está desativado para outros usuários'
                                            : (currentMode === 'isis' ? 'Acessar Painel Seishat (CRM)' : 'Acessar Modo Isis (IA)')
                                    }
                                    aria-label="Alternar modo de operação"
                                >
                                    {currentMode === 'isis' ? <BriefcaseIcon className="h-6 w-6 text-gray-400" /> : <SparklesIcon className="h-6 w-6 text-gray-400" />}
                                </button>
                                {isIsisDeactivatedForOthers && (
                                     <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-600 border-2 border-[#131314] ring-1 ring-red-500">
                                        <span className="sr-only">Modo Isis Desativado</span>
                                    </span>
                                )}
                            </div>
                        )}
                        
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
                        
                    </nav>
                )}
            </header>
        </>
    );
};
