import React from 'react';
import { UsersIcon } from './icons.tsx';

export const UserSearch: React.FC = () => {
    return (
        <div className="p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-gray-400" />
                <p className="text-sm text-gray-300">Funcionalidade de busca de usuários em desenvolvimento.</p>
            </div>
        </div>
    );
};
