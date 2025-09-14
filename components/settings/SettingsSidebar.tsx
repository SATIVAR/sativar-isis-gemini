


import React from 'react';
import { DatabaseIcon, ServerIcon, StoreIcon, FileCodeIcon, LogOutIcon, UsersIcon, ClockIcon, BellIcon, BarChart2Icon } from '../icons.tsx';
import type { UserRole } from '../../types.ts';

export type SettingsPageName = 'association' | 'users' | 'api' | 'products' | 'notifications' | 'advanced' | 'prompt' | 'apiHistory';

interface NavItemProps {
  pageName: SettingsPageName;
  label: string;
  icon: React.ReactNode;
  currentPage: SettingsPageName;
  onClick: (page: SettingsPageName) => void;
}

const NavItem: React.FC<NavItemProps> = ({ pageName, label, icon, currentPage, onClick }) => (
  <button
    onClick={() => onClick(pageName)}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      currentPage === pageName
        ? 'bg-fuchsia-600/20 text-fuchsia-300'
        : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
    }`}
    aria-current={currentPage === pageName ? 'page' : undefined}
  >
    {icon}
    <span>{label}</span>
  </button>
);

interface SettingsSidebarProps {
  currentPage: SettingsPageName;
  setCurrentPage: (page: SettingsPageName) => void;
  onLogout: () => void;
  userRole: UserRole;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ currentPage, setCurrentPage, onLogout, userRole }) => {
  const navItems: Array<{ page: SettingsPageName; label: string; icon: React.ReactNode; roles: UserRole[] }> = [
    { page: 'association', label: 'Associação', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin', 'manager'] },
    { page: 'users', label: 'Usuários do Sistema', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin'] },
    { page: 'api', label: 'Configuração da API', icon: <ServerIcon className="w-5 h-5" />, roles: ['admin'] },
    { page: 'products', label: 'Produtos', icon: <StoreIcon className="w-5 h-5" />, roles: ['admin', 'manager'] },
    { page: 'notifications', label: 'Notificações', icon: <BellIcon className="w-5 h-5" />, roles: ['admin', 'manager'] },
    { page: 'advanced', label: 'Avançado', icon: <DatabaseIcon className="w-5 h-5" />, roles: ['admin'] },
    { page: 'apiHistory', label: 'Log de Chamadas', icon: <ClockIcon className="w-5 h-5" />, roles: ['admin'] },
    { page: 'prompt', label: 'Prompt do Sistema', icon: <FileCodeIcon className="w-5 h-5" />, roles: ['admin'] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-full md:w-64 flex-shrink-0 bg-[#202124] rounded-xl border border-gray-700 p-4 flex flex-col justify-between">
        <div>
            <h2 className="text-lg font-bold text-white px-2 mb-4">Painel de Controle</h2>
            <nav className="space-y-1">
            {visibleNavItems.map(item => (
                <NavItem
                key={item.page}
                pageName={item.page}
                label={item.label}
                icon={item.icon}
                currentPage={currentPage}
                onClick={setCurrentPage}
                />
            ))}
            </nav>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-900/40 hover:text-red-300 transition-colors">
            <LogOutIcon className="w-5 h-5" />
            Sair
        </button>
    </aside>
  );
};