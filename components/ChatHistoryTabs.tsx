import React from 'react';
import type { Conversation } from '../types.ts';
import { PlusIcon, FileTextIcon, Trash2Icon } from './icons.tsx';
import { Loader } from './Loader.tsx';
import { useModal } from '../hooks/useModal.ts';

interface ChatHistoryTabsProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
    isLoading: boolean;
    mode?: 'sidebar' | 'drawer';
}

const TabItem: React.FC<{
    conversation: Conversation;
    isActive: boolean;
    onClick: () => void;
    onDelete: (id: string) => void;
    canDelete: boolean;
    mode: 'sidebar' | 'drawer';
}> = ({ conversation, isActive, onClick, onDelete, canDelete, mode }) => {
    const modal = useModal();
    
    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canDelete) {
            modal.alert({
                title: "Ação Inválida",
                message: "Não é possível apagar a última conversa do histórico. Inicie uma nova conversa para poder apagar esta."
            });
            return;
        }
        
        const confirmed = await modal.confirm({
            title: "Confirmar Exclusão",
            message: `Tem certeza que deseja apagar a conversa "${conversation.title}"? Esta ação não pode ser desfeita.`,
            confirmLabel: "Apagar",
            danger: true
        });

        if (confirmed) {
            onDelete(conversation.id);
        }
    };

    if (mode === 'drawer') {
        return (
             <div className="w-full group relative flex items-center">
                <button
                    onClick={onClick}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-fuchsia-600/20 text-fuchsia-300' : 'hover:bg-gray-700/50 text-gray-400'
                    }`}
                     aria-current={isActive}
                     aria-label={`Selecionar conversa: ${conversation.title}`}
                >
                    <FileTextIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate flex-grow">{conversation.title}</span>
                </button>
                <button 
                    onClick={handleDelete}
                    className="p-1 rounded-full text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Apagar conversa ${conversation.title}`}
                >
                    <Trash2Icon className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div 
            className="w-full group relative flex items-center justify-center"
            title={conversation.title}
        >
            <button
                onClick={onClick}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                    isActive ? 'bg-fuchsia-600/20 text-fuchsia-200' : 'hover:bg-gray-700/50 text-gray-400'
                }`}
                aria-current={isActive}
                aria-label={`Selecionar conversa: ${conversation.title}`}
            >
                <FileTextIcon className="w-5 h-5" />
            </button>
            <button 
                onClick={handleDelete}
                className="absolute right-1 top-1 p-0.5 rounded-full bg-[#202124] opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-all focus:opacity-100 z-10"
                aria-label={`Apagar conversa ${conversation.title}`}
            >
                <Trash2Icon className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export const ChatHistoryTabs: React.FC<ChatHistoryTabsProps> = ({ conversations, activeConversationId, onSelectConversation, onNewConversation, onDeleteConversation, isLoading, mode = 'sidebar' }) => {
    const modal = useModal();
    
    const handleNewConversationClick = async () => {
        const CONVERSATION_LIMIT = 5;
        const isLimitReached = conversations.length >= CONVERSATION_LIMIT;

        const message = isLimitReached
            ? "Você atingiu o limite de 5 conversas. Iniciar uma nova análise substituirá a conversa mais antiga do seu histórico. Deseja continuar?"
            : "Isso iniciará uma nova análise. A conversa atual será salva no seu histórico. Deseja continuar?";
        
        const confirmed = await modal.confirm({
            title: "Nova Análise",
            message,
            confirmLabel: "Continuar"
        });

        if (confirmed) {
            onNewConversation();
        }
    };
    
    const canDelete = conversations.length > 1;

    if (mode === 'drawer') {
        return (
            <div className="h-full flex flex-col text-white">
                <div className="p-4 border-b border-gray-700/50">
                    <h2 className="text-lg font-bold">Histórico de Conversas</h2>
                </div>
                {isLoading ? (
                    <div className="flex-grow flex justify-center items-center">
                        <Loader />
                    </div>
                ) : (
                    <>
                        <div className="p-2">
                            <button
                                onClick={handleNewConversationClick}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg shadow-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
                                aria-label="Iniciar nova análise"
                            >
                                <PlusIcon className="w-5 h-5" /> Nova Análise
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 space-y-1">
                             {conversations.map(convo => (
                                <TabItem
                                    key={convo.id}
                                    conversation={convo}
                                    isActive={convo.id === activeConversationId}
                                    onClick={() => onSelectConversation(convo.id)}
                                    onDelete={onDeleteConversation}
                                    canDelete={canDelete}
                                    mode="drawer"
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <aside className="w-16 flex-shrink-0 bg-[#202124] border-l border-gray-700/50 p-2 flex flex-col h-full">
            <button
                onClick={handleNewConversationClick}
                disabled={isLoading}
                className="w-10 h-10 mx-auto flex items-center justify-center bg-gray-700 text-white rounded-lg shadow-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
                title="Nova Análise"
                aria-label="Iniciar nova análise"
            >
                <PlusIcon className="w-5 h-5" />
            </button>
            <div className="flex-grow overflow-y-auto mt-4 space-y-2">
                {isLoading ? (
                    <div className="flex justify-center items-center pt-10">
                        <Loader />
                    </div>
                ) : (
                    conversations.map(convo => (
                        <TabItem
                            key={convo.id}
                            conversation={convo}
                            isActive={convo.id === activeConversationId}
                            onClick={() => onSelectConversation(convo.id)}
                            onDelete={onDeleteConversation}
                            canDelete={canDelete}
                            mode="sidebar"
                        />
                    ))
                )}
            </div>
        </aside>
    );
};