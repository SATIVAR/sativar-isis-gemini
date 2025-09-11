import React from 'react';
import type { Conversation } from '../types.ts';
import { PlusIcon, FileTextIcon, Trash2Icon } from './icons.tsx';
import { Loader } from './Loader.tsx';

interface ChatHistoryTabsProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
    isLoading: boolean;
}

const TabItem: React.FC<{
    conversation: Conversation;
    isActive: boolean;
    onClick: () => void;
    onDelete: (id: string) => void;
}> = ({ conversation, isActive, onClick, onDelete }) => {
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Tem certeza que deseja apagar a conversa "${conversation.title}"? Esta ação não pode ser desfeita.`)) {
            onDelete(conversation.id);
        }
    };

    return (
        <div 
            className="w-full group relative flex items-center justify-center"
            title={conversation.title}
        >
            <button
                onClick={onClick}
                className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                    isActive ? 'bg-fuchsia-600/20 text-fuchsia-200' : 'hover:bg-gray-700/50 text-gray-400'
                }`}
                aria-current={isActive}
                aria-label={`Selecionar conversa: ${conversation.title}`}
            >
                <FileTextIcon className="w-6 h-6" />
            </button>
            <button 
                onClick={handleDelete}
                className="absolute right-1 top-1 p-1 rounded-full bg-[#202124] opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-all focus:opacity-100 z-10"
                aria-label={`Apagar conversa ${conversation.title}`}
            >
                <Trash2Icon className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ChatHistoryTabs: React.FC<ChatHistoryTabsProps> = ({ conversations, activeConversationId, onSelectConversation, onNewConversation, onDeleteConversation, isLoading }) => {
    
    const handleNewConversationClick = () => {
        const CONVERSATION_LIMIT = 5;
        const isLimitReached = conversations.length >= CONVERSATION_LIMIT;

        const message = isLimitReached
            ? "Você atingiu o limite de 5 conversas. Iniciar uma nova análise substituirá a conversa mais antiga do seu histórico. Deseja continuar?"
            : "Isso iniciará uma nova análise. A conversa atual será salva no seu histórico. Deseja continuar?";

        if (window.confirm(message)) {
            onNewConversation();
        }
    };

    return (
        <aside className="w-20 flex-shrink-0 bg-[#202124] border-r border-gray-700/50 p-2 flex flex-col h-full">
            <button
                onClick={handleNewConversationClick}
                disabled={isLoading}
                className="w-12 h-12 mx-auto flex items-center justify-center bg-gray-700 text-white rounded-lg shadow-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
                title="Nova Análise"
                aria-label="Iniciar nova análise"
            >
                <PlusIcon className="w-6 h-6" />
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
                        />
                    ))
                )}
            </div>
        </aside>
    );
};