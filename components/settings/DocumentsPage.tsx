import React, { useState, useMemo } from 'react';
import { useModal } from '../../hooks/useModal.ts';
import { FileTextIcon, FolderIcon, SettingsIcon, Trash2Icon } from '../icons.tsx';
import { DocumentSettingsModal } from './DocumentSettingsModal.tsx';

// --- MOCK DATA ---
// In a real application, this would come from an API call.
const mockFileSystem = {
  id: 'root',
  name: 'Início',
  type: 'folder',
  children: [
    {
      id: 'folder-1', name: '#1_joao_da_silva', type: 'folder',
      children: [
        { id: 'file-1', name: 'receita_2024.pdf', type: 'file', size: '1.2MB', date: '2024-07-15T10:30:00Z' },
        { id: 'file-2', name: 'termo_assinado.pdf', type: 'file', size: '800KB', date: '2024-07-15T10:25:00Z' },
        { id: 'file-3', name: 'comprovante_residencia.jpg', type: 'file', size: '2.1MB', date: '2024-07-14T15:00:00Z' },
      ],
    },
    {
      id: 'folder-2', name: '#2_maria_oliveira', type: 'folder',
      children: [
         { id: 'file-4', name: 'prescricao_medica.pdf', type: 'file', size: '950KB', date: '2024-07-10T09:00:00Z' },
      ],
    },
    {
        id: 'folder-3', name: '#3_carlos_souza', type: 'folder', children: [],
    }
  ],
};
// --- END MOCK DATA ---

type FileSystemItem = {
    id: string;
    name: string;
    type: 'folder' | 'file';
    children?: FileSystemItem[];
    size?: string;
    date?: string;
};


export const DocumentsPage: React.FC = () => {
    const [fileSystem, setFileSystem] = useState<FileSystemItem>(mockFileSystem);
    const [path, setPath] = useState<string[]>([]); // Array of folder IDs
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const modal = useModal();

    const currentFolder = useMemo(() => {
        let current = fileSystem;
        for (const folderId of path) {
            current = current.children?.find(item => item.id === folderId) || current;
        }
        return current;
    }, [path, fileSystem]);

    const handleNavigate = (folderId: string) => {
        setPath(prev => [...prev, folderId]);
    };

    const handleBreadcrumbClick = (index: number) => {
        setPath(prev => prev.slice(0, index));
    };
    
    const handleDelete = async (itemId: string, itemName: string) => {
        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
            danger: true
        });

        if(confirmed) {
            // This is a mock implementation. A real one would call an API.
            const deleteRecursive = (items: FileSystemItem[], id: string) => {
                return items.filter(item => {
                    if (item.children) {
                        item.children = deleteRecursive(item.children, id);
                    }
                    return item.id !== id;
                });
            };
            setFileSystem(prev => ({
                ...prev,
                children: deleteRecursive(prev.children || [], itemId)
            }));
        }
    };

    return (
        <>
            {isSettingsOpen && <DocumentSettingsModal onClose={() => setIsSettingsOpen(false)} />}
            <div className="max-w-7xl mx-auto space-y-6">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <FolderIcon className="w-8 h-8 text-fuchsia-300" />
                            <h2 className="text-2xl font-bold text-white">Documentos</h2>
                        </div>
                        <p className="text-gray-400">
                            Gerencie os documentos dos associados.
                        </p>
                    </div>
                    <button onClick={() => setIsSettingsOpen(true)} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gray-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-gray-600">
                        <SettingsIcon className="w-5 h-5" /> Configurações
                    </button>
                </div>
                
                {/* Breadcrumbs */}
                <nav className="flex items-center text-sm text-gray-400 bg-[#202124] p-2 rounded-lg border border-gray-700">
                    <button onClick={() => handleBreadcrumbClick(0)} className="hover:text-white">Início</button>
                    {path.map((folderId, index) => {
                        const folder = fileSystem.children?.find(f => f.id === folderId);
                        return (
                            <React.Fragment key={folderId}>
                                <span className="mx-2">/</span>
                                <button onClick={() => handleBreadcrumbClick(index + 1)} className="hover:text-white">{folder?.name || folderId}</button>
                            </React.Fragment>
                        );
                    })}
                </nav>

                {/* File/Folder Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(currentFolder.children || []).map(item => (
                        <div key={item.id} className="group relative">
                             <button
                                onClick={() => item.type === 'folder' && handleNavigate(item.id)}
                                className="w-full flex flex-col items-center justify-center p-4 bg-[#202124] rounded-lg border border-gray-700/50 aspect-square text-center hover:bg-gray-800/50 hover:border-fuchsia-500/50 transition-colors"
                                aria-label={`Acessar ${item.name}`}
                            >
                                {item.type === 'folder' ? (
                                    <FolderIcon className="w-16 h-16 text-fuchsia-300" />
                                ) : (
                                    <FileTextIcon className="w-16 h-16 text-gray-400" />
                                )}
                                <p className="mt-2 text-sm text-gray-200 font-medium truncate w-full">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.size || ''}</p>
                            </button>
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 bg-gray-900/50 rounded-full text-gray-400 hover:bg-red-800 hover:text-white">
                                    <Trash2Icon className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {currentFolder.children?.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-gray-500 py-20 rounded-lg border-2 border-dashed border-gray-700">
                        <FolderIcon className="w-12 h-12" />
                        <p className="mt-2 text-lg font-semibold text-gray-400">Esta pasta está vazia.</p>
                    </div>
                )}
            </div>
        </>
    );
};