import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../services/database/apiClient.ts';
import type { ChatMessage, Conversation } from '../types.ts';

interface ChatHistoryContextType {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: ChatMessage[];
    isLoading: boolean;
    isChatEmpty: boolean;
    selectConversation: (id: string) => Promise<void>;
    startNewConversation: () => Promise<void>;
    addMessage: (message: ChatMessage) => Promise<void>;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    updateConversationTitle: (id: string, title: string) => Promise<void>;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined);

export const ChatHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isChatEmpty, setIsChatEmpty] = useState(false);

    const selectConversation = useCallback(async (conversationId: string, setLoading = true) => {
        // This guard was too restrictive and could prevent loading chats.
        // It's safer to always fetch when the user explicitly clicks a conversation.
        if (activeConversationId === conversationId) return;

        if (setLoading) setIsLoading(true);
        
        try {
            const fetchedMessages = await apiClient.get<any[]>(`/chats/${conversationId}`);
            const parsedMessages = fetchedMessages.map(msg => ({
                id: msg.id,
                sender: msg.sender,
                content: typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content,
                isActionComplete: msg.is_action_complete === 1
            }));
            setMessages(parsedMessages);
            setActiveConversationId(conversationId);
        } catch (error) {
            console.error(`Failed to load messages for conversation ${conversationId}`, error);
            setMessages([]); // Or show an error message
        } finally {
            if (setLoading) setIsLoading(false);
        }
    }, [activeConversationId]);

    const startNewConversation = useCallback(async () => {
        setIsLoading(true);
        try {
            const newConvoId = crypto.randomUUID();
            const newConvoTitle = `Nova Análise - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            const newConvo = await apiClient.post<Conversation>('/chats', { 
                id: newConvoId, 
                title: newConvoTitle
            });
            
            // FIX: Generate initial messages with unique IDs to prevent primary key violation on subsequent new conversations.
            const initialMessages: ChatMessage[] = [
                {
                    id: crypto.randomUUID(),
                    sender: 'ai',
                    content: { type: 'text', text: 'Olá! Sou a Ísis, sua parceira de equipe virtual. Fico feliz em ajudar! Posso analisar receitas para gerar orçamentos em segundos, consultar informações de associados e muito mais. 😊' },
                },
                {
                    id: crypto.randomUUID(),
                    sender: 'ai',
                    content: {
                        type: 'actions',
                        text: 'Como posso te ajudar agora?',
                        actions: [
                            { label: 'Analisar Receita', payload: 'start_quote' },
                            { label: 'Consultar Associado', payload: 'start_user_lookup' },
                            { label: 'Produtos Disponíveis', payload: 'info_products' },
                            { label: 'Informações Gerais', payload: 'general_info' },
                            { label: 'Gerar Destaque do Dia', payload: 'generate_highlight' },
                        ]
                    }
                }
            ];

            // The API handles FIFO logic, just need to re-fetch the list
            const convos = await apiClient.get<Conversation[]>('/chats');
            setConversations(convos);
            setActiveConversationId(newConvo.id);
            setMessages(initialMessages);

            // Persist initial messages
            for (const msg of initialMessages) {
                await apiClient.post(`/chats/${newConvo.id}/messages`, msg);
            }
        } catch (error) {
            console.error("Failed to start new conversation", error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const loadConversations = useCallback(async (selectFirst = true) => {
        setIsLoading(true);
        setIsChatEmpty(false);
        try {
            const convos = await apiClient.get<Conversation[]>('/chats');
            setConversations(convos);
            if (convos.length > 0 && selectFirst) {
                await selectConversation(convos[0].id, false);
            } else if (convos.length === 0) {
                await startNewConversation();
            }
        } catch (error) {
            console.error("Failed to load conversations", error);
            setIsChatEmpty(true);
        } finally {
            setIsLoading(false);
        }
    }, [selectConversation, startNewConversation]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const addMessage = useCallback(async (message: ChatMessage) => {
        if (!activeConversationId) return;
        
        try {
            await apiClient.post(`/chats/${activeConversationId}/messages`, message);
        } catch (error) {
            console.error("Failed to save message", error);
        }
    }, [activeConversationId]);

    const updateConversationTitle = useCallback(async (id: string, title: string) => {
        setConversations(prev => prev.map(c => c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
        try {
            await apiClient.put(`/chats/${id}/title`, { title });
        } catch (error) {
            console.error(`Failed to update title for conversation ${id}`, error);
        }
    }, []);

    const value = useMemo(() => ({
        conversations,
        activeConversationId,
        messages,
        isLoading,
        isChatEmpty,
        selectConversation,
        startNewConversation,
        addMessage,
        setMessages,
        updateConversationTitle
    }), [conversations, activeConversationId, messages, isLoading, isChatEmpty, selectConversation, startNewConversation, addMessage, setMessages, updateConversationTitle]);

    return React.createElement(ChatHistoryContext.Provider, { value }, children);
};

export const useChatHistory = () => {
    const context = useContext(ChatHistoryContext);
    if (!context) {
        throw new Error('useChatHistory must be used within a ChatHistoryProvider');
    }
    return context;
};
