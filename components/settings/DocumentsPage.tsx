import React, { useState, useMemo, useEffect } from 'react';
import { useModal } from '../../hooks/useModal.ts';
import { FileTextIcon, FolderIcon, SettingsIcon, Trash2Icon } from '../icons.tsx';
import { DocumentSettingsModal } from './DocumentSettingsModal.tsx';
import { apiClient } from '../../services/database/apiClient.ts';
import { Loader } from '../Loader.tsx';

type FileSystemItem = {
    id: string | number;
    name: string;
    type: 'folder' | 'file';
    size?: string;
};

const ROOT_FOLDER = { id: 'root', name: 'Início' };

export const DocumentsPage: React.FC = () => {
    const [path, setPath] = useState<Array<{ id: string | number; name: string }>>([ROOT_FOLDER]);
    const [items, setItems] = useState<FileSystemItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const modal = useModal();

    useEffect(() => {
        const fetchItems = async () => {
            setIsLoading(true);
            const currentFolder = path[path.length - 1];
            const parentFolderId = currentFolder.id === 'root' ? null : currentFolder.id;
            
            try {
                const params = new URLSearchParams();
                if (parentFolderId) {
                    params.append('parentFolderId', String(parentFolderId));
                }
                const data = await apiClient.get<FileSystemItem[]>(`/seishat/documents?${params.toString()}`);
                setItems(data);
            } catch (error) {
                console.error("Failed to fetch documents", error);
                modal.alert({ title: "Erro", message: "Não foi possível carregar os documentos." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchItems();
    }, [path]);

    const handleNavigate = (folder: FileSystemItem) => {
        setPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    };

    const handleBreadcrumbClick = (index: number) => {
        setPath(prev => prev.slice(0, index + 1));
    };
    
    const handleDelete = async (item: FileSystemItem) => {
        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir "${item.name}"? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Excluir',
            danger: true
        });

        if(confirmed) {
            try {
                await apiClient.delete(`/seishat/documents/${item.type}/${item.id}`);
                setItems(prev => prev.filter(i => i.id !== item.id));
            } catch(err) {
                const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
                modal.alert({ title: 'Erro ao Excluir', message });
            }
        }
    };

    const breadcrumbPath = useMemo(() => {
        let cumulativePath = '';
        return path.map(p => {
            cumulativePath += `/${p.name}`;
            return { ...p, fullPath: cumulativePath };
        });
    }, [path]);

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
                <nav className="flex items-center text-sm text-gray-400 bg-[#202124] p-2 rounded-lg border border-gray-700 overflow-x-auto">
                    {breadcrumbPath.map((p, index) => (
                        <React.Fragment key={p.id}>
                            {index > 0 && <span className="mx-2 text-gray-600">/</span>}
                            <button
                                onClick={() => handleBreadcrumbClick(index)}
                                className={`whitespace-nowrap px-2 py-1 rounded-md ${index === breadcrumbPath.length - 1 ? 'text-white font-semibold' : 'hover:bg-gray-700/50 hover:text-white'}`}
                            >
                                {p.name}
                            </button>
                        </React.Fragment>
                    ))}
                </nav>

                {/* File/Folder Grid */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20"><Loader /></div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {items.map(item => (
                                <div key={item.id} className="group relative">
                                    <button
                                        onClick={() => item.type === 'folder' && handleNavigate(item)}
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
                                        <button onClick={() => handleDelete(item)} className="p-1.5 bg-gray-900/50 rounded-full text-gray-400 hover:bg-red-800 hover:text-white">
                                            <Trash2Icon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!isLoading && items.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-gray-500 py-20 rounded-lg border-2 border-dashed border-gray-700">
                                <FolderIcon className="w-12 h-12" />
                                <p className="mt-2 text-lg font-semibold text-gray-400">Esta pasta está vazia.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};