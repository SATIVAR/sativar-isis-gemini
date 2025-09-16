
import React, { useState, useMemo, useEffect } from 'react';
import { 
    DatabaseIcon, ServerIcon, StoreIcon, FileCodeIcon, 
    LogOutIcon, UsersIcon, ClockIcon, BellIcon, 
    BarChart2Icon, FileTextIcon, ShoppingCartIcon, DollarSignIcon,
    BriefcaseIcon, SparklesIcon, ChevronDownIcon 
} from '../icons.tsx';
import type { UserRole } from '../../types.ts';

export type SettingsPageName = 'association' | 'users' | 'api' | 'products' | 'notifications' | 'advanced' | 'prompt' | 'apiHistory' | 'patients' | 'prescribers' | 'documents' | 'orders' | 'expenses' | 'reports';

interface NavItemProps {
  pageName: SettingsPageName;
  label: string;
  icon: React.ReactNode;
  currentPage: SettingsPageName;
  onClick: (page: SettingsPageName) => void;
  disabled?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ pageName, label, icon, currentPage, onClick, disabled }) => (
    <button
      onClick={() => !disabled && onClick(pageName)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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

type AccordionName = 'seishat' | 'isis' | 'none';

const AccordionItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
  isActiveSection: boolean;
}> = ({ label, icon, children, isOpen, onClick, isActiveSection }) => (
  <div>
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActiveSection && !isOpen ? 'bg-fuchsia-600/10 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
      }`}
      aria-expanded={isOpen}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <div
      className={`pl-4 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}
    >
        <div className="border-l border-gray-600/50 flex flex-col gap-1 pl-4 py-1 mt-1">
            {children}
        </div>
    </div>
  </div>
);


interface SettingsSidebarProps {
  currentPage: SettingsPageName;
  setCurrentPage: (page: SettingsPageName) => void;
  onLogout: () => void;
  userRole: UserRole;
}

// FIX: Define a type for navigation items to ensure type safety for 'page' and 'disabled' properties.
interface NavItemConfig {
  page: SettingsPageName;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  disabled?: boolean;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ currentPage, setCurrentPage, onLogout, userRole }) => {
    const [openAccordion, setOpenAccordion] = useState<AccordionName>('none');
    
    const generalItems: NavItemConfig[] = [
        { page: 'association', label: 'Associação', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin', 'manager'] },
        { page: 'users', label: 'Usuários do Sistema', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin'] },
        { page: 'notifications', label: 'Notificações', icon: <BellIcon className="w-5 h-5" />, roles: ['admin', 'manager'] },
    ];
    
    const seishatItems: NavItemConfig[] = [
        { page: 'products', label: 'Produtos', icon: <StoreIcon className="w-5 h-5" />, roles: ['admin', 'manager'] },
        { page: 'patients', label: 'Pacientes', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'prescribers', label: 'Prescritores', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'documents', label: 'Documentos', icon: <FileTextIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'orders', label: 'Pedidos', icon: <ShoppingCartIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'expenses', label: 'Despesas', icon: <DollarSignIcon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
        { page: 'reports', label: 'Relatórios', icon: <BarChart2Icon className="w-5 h-5" />, roles: ['admin', 'manager'], disabled: true },
    ];
    
    const isisItems: NavItemConfig[] = [
        { page: 'api', label: 'Configuração da API', icon: <ServerIcon className="w-5 h-5" />, roles: ['admin'] },
        { page: 'prompt', label: 'Prompt do Sistema', icon: <FileCodeIcon className="w-5 h-5" />, roles: ['admin'] },
        { page: 'apiHistory', label: 'Log de Chamadas', icon: <ClockIcon className="w-5 h-5" />, roles: ['admin'] },
        { page: 'advanced', label: 'Avançado', icon: <DatabaseIcon className="w-5 h-5" />, roles: ['admin'] },
    ];

    const handleAccordionClick = (name: AccordionName) => {
      setOpenAccordion(prev => (prev === name ? 'none' : name));
    };

    const isSeishatSectionActive = useMemo(() => seishatItems.some(item => item.page === currentPage), [currentPage, seishatItems]);
    const isIsisSectionActive = useMemo(() => isisItems.some(item => item.page === currentPage), [currentPage, isisItems]);

    useEffect(() => {
        if (isSeishatSectionActive) {
            setOpenAccordion('seishat');
        } else if (isIsisSectionActive) {
            setOpenAccordion('isis');
        }
    }, [isSeishatSectionActive, isIsisSectionActive]);
  
  return (
    <aside className="w-full md:w-64 flex-shrink-0 bg-[#202124] rounded-xl border border-gray-700 p-4 flex flex-col justify-between">
        <div>
            <h2 className="text-lg font-bold text-white px-2 mb-4">Painel de Controle</h2>
            <nav className="space-y-3">
                <div className="space-y-1">
                    <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Geral</div>
                    {generalItems.filter(i => i.roles.includes(userRole)).map(item => (
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
                </div>

                {seishatItems.some(i => i.roles.includes(userRole)) && (
                    <div className="pt-2">
                        <AccordionItem
                            label="Seishat (CRM)"
                            icon={<BriefcaseIcon className="w-5 h-5" />}
                            isOpen={openAccordion === 'seishat'}
                            onClick={() => handleAccordionClick('seishat')}
                            isActiveSection={isSeishatSectionActive}
                        >
                            {seishatItems.filter(i => i.roles.includes(userRole)).map(item => (
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
                        </AccordionItem>
                    </div>
                )}
                
                {isisItems.some(i => i.roles.includes(userRole)) && (
                    <div className="pt-2">
                        <AccordionItem
                            label="Ísis (IA)"
                            icon={<SparklesIcon className="w-5 h-5" />}
                            isOpen={openAccordion === 'isis'}
                            onClick={() => handleAccordionClick('isis')}
                            isActiveSection={isIsisSectionActive}
                        >
                             {isisItems.filter(i => i.roles.includes(userRole)).map(item => (
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
                        </AccordionItem>
                    </div>
                )}
            </nav>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-900/40 hover:text-red-300 transition-colors">
            <LogOutIcon className="w-5 h-5" />
            Sair
        </button>
    </aside>
  );
};
