import React from 'react';
import { StoreIcon, LogOutIcon, UsersIcon, FileTextIcon, ShoppingCartIcon, DollarSignIcon, BarChart2Icon } from '../icons.tsx';
import type { UserRole } from '../../../types.ts';

export type SeishatSettingsPageName = 'products' | 'patients' | 'prescribers' | 'documents' | 'orders' | 'expenses' | 'reports';

interface NavItemProps {
  pageName: SeishatSettingsPageName;
  label: string;
  icon: React.ReactNode;
  currentPage: SeishatSettingsPageName;
  onClick: (page: SeishatSettingsPageName) => void;
  disabled?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ pageName, label, icon, currentPage, onClick, disabled }) => (
  <button
    onClick={() => !disabled && onClick(pageName)}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      currentPage === pageName
        ? 'bg-fuchsia-600/20 text-fuchsia-300'
        : disabled 
          ? 'text-gray-600 cursor-not-allowed'
          : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
    }`}
    aria-current={currentPage === pageName ? 'page' : undefined}
    disabled={disabled}
  >
    {icon}
    <span>{label}</span>
    {disabled && <span className="text-xs text-gray-500 ml-auto">(Em breve)</span>}
  </button>
);

interface SeishatSettingsSidebarProps {
  currentPage: SeishatSettingsPageName;
  setCurrentPage: (page: SeishatSettingsPageName) => void;
  onLogout: () => void;
  userRole: UserRole;
}


export const SeishatSettingsSidebar: React.FC<SeishatSettingsSidebarProps> = ({ currentPage, setCurrentPage, onLogout, userRole }) => {
  const navItems: Array<{ page: SeishatSettingsPageName; label: string; icon: React.ReactNode; roles: UserRole[]; disabled?: boolean }> = [
    { page: 'products', label: 'Produtos', icon: <StoreIcon className="w-5 h-5" />, roles: ['admin', 'manager'] },
    { page: 'patients', label: 'Pacientes', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
    { page: 'prescribers', label: 'Prescritores', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
    { page: 'documents', label: 'Documentos', icon: <FileTextIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
    { page: 'orders', label: 'Pedidos', icon: <ShoppingCartIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
    { page: 'expenses', label: 'Despesas', icon: <DollarSignIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
    { page: 'reports', label: 'Relatórios', icon: <BarChart2Icon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
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
                disabled={item.disabled}
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
