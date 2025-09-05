import React, { useState } from 'react';
import type { Page } from '../App';
import { SettingsIcon, BellIcon, PlusCircleIcon } from './icons';
import { useSimpleReminders } from '../hooks/useSimpleReminders';
import { RemindersList, ReminderModal } from './Reminders';
import { Logo } from './Logo';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

import { useSettings } from '../hooks/useSettings';

interface HeaderProps {
    setCurrentPage: (page: Page) => void;
    currentPage: Page;
}

export const Header: React.FC<HeaderProps> = ({ setCurrentPage, currentPage }) => {
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { reminders, hasOverdueReminders } = useSimpleReminders();
  const { settings } = useSettings();

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
      {isAddModalOpen && <ReminderModal onClose={() => setIsAddModalOpen(false)} />}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-700/50 bg-[#131314] p-4">
        <div className="flex items-center gap-4">
          <Logo className="h-10 w-10" />
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-semibold text-gray-200 hover:text-white transition-colors" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
                SATIVAR - Isis
              </h1>
              <span className="select-none bg-green-900/50 text-green-300 text-xs font-mono px-2 py-0.5 rounded-full border border-green-700/50">
                v0.25
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-400">{settings.associationName}</span>
              <ConnectionStatusIndicator />
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-full p-2 transition-colors hover:bg-gray-700"
            aria-label="Adicionar nova tarefa"
          >
            <PlusCircleIcon className="h-6 w-6 text-gray-400" />
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