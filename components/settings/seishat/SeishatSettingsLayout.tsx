import React, { useState } from 'react';
import { SeishatSettingsSidebar, type SeishatSettingsPageName } from './SeishatSettingsSidebar.tsx';
import { ProductsPage } from '../ProductsPage.tsx';
import { useAuth } from '../../../hooks/useAuth.ts';
import { Loader } from '../../Loader.tsx';

interface SeishatSettingsLayoutProps {
  onLogout: () => void;
}

export const SeishatSettingsLayout: React.FC<SeishatSettingsLayoutProps> = ({ onLogout }) => {
  const [currentPage, setCurrentPage] = useState<SeishatSettingsPageName>('products');
  const auth = useAuth();

  const handleInternalLogout = () => {
    auth.logout();
    onLogout();
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'products':
        return <ProductsPage />;
      // Add other cases for future pages like patients, prescribers etc.
      default:
        return <ProductsPage />;
    }
  };

  if (!auth.user) {
    return <div className="flex justify-center items-center h-full"><Loader /></div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      <SeishatSettingsSidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        onLogout={handleInternalLogout}
        userRole={auth.user.role}
      />
      <div className="flex-grow overflow-y-auto">
        {renderPage()}
      </div>
    </div>
  );
};
