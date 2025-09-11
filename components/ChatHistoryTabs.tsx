import React from 'react';
import type { Conversation } from '../types.ts';
import { PlusIcon, FileTextIcon } from './icons.tsx';
import { Loader } from './Loader.tsx';

interface ChatHistoryTabsProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    isLoading: boolean;
}

const TabItem: React.FC<{
    conversation: Conversation;
    isActive: boolean;
    onClick: () => void;
}> = ({ conversation, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left font-medium transition-colors ${
                isActive
                    ? 'bg-fuchsia-600/20 text-fuchsia-200'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
            aria-current={isActive}
        >
            <FileTextIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate flex-grow">{conversation.title}</span>
        </button>
    );
};

export const ChatHistoryTabs: React.FC<ChatHistoryTabsProps> = ({ conversations, activeConversationId, onSelectConversation, onNewConversation, isLoading }) => {
    
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
        <aside className="w-64 flex-shrink-0 bg-[#202124] border-r border-gray-700/50 p-4 flex flex-col h-full">
            <button
                onClick={handleNewConversationClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
                <PlusIcon className="w-5 h-5" />
                Nova Análise
            </button>
            <div className="flex-grow overflow-y-auto mt-4 space-y-1 pr-1 -mr-2">
                <p className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">Histórico</p>
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
                        />
                    ))
                )}
            </div>
        </aside>
    );
};
