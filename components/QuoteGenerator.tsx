import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings.ts';
import { processPrescription, pingAI, isApiKeyConfigured, generateHighlight } from '../services/geminiService.ts';
import { getSativarUsers } from '../services/wpApiService.ts';
import type { ChatMessage, QuoteResult } from '../types.ts';
import { AlertTriangleIcon, XCircleIcon } from './icons.tsx';
import { Chat } from './Chat.tsx';

const getInitialMessages = (): ChatMessage[] => [
    {
        id: 'init-greeting',
        sender: 'ai',
        content: { type: 'text', text: 'Olá! Sou a Ísis, sua parceira de equipe virtual. Fico feliz em ajudar! Posso analisar receitas para gerar orçamentos em segundos, consultar informações de associados e muito mais. 😊' },
    },
    {
        id: 'init-actions',
        sender: 'ai',
        content: {
            type: 'actions',
            text: 'Como posso te ajudar agora?',
            actions: [
                { label: 'Analisar Receita', payload: 'start_quote' },
                { label: 'Consultar Associado', payload: 'start_user_lookup' },
                { label: 'Informações Gerais', payload: 'general_info' },
                { label: 'Gerar Destaque do Dia', payload: 'generate_highlight' },
            ]
        }
    }
];

const FilePreviewModal: React.FC<{
    file: { url: string; type: string; name: string };
    onClose: () => void;
}> = ({ file, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="file-preview-title">
            <div className="bg-[#202124] rounded-xl border border-gray-700 w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0 p-3 border-b border-gray-700 flex justify-between items-center">
                    <p id="file-preview-title" className="text-white font-semibold truncate">{file.name}</p>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Fechar visualização">
                        <XCircleIcon className="w-6 h-6"/>
                    </button>
                </div>
                <div className="flex-grow p-2 overflow-auto flex items-center justify-center">
                    {file.type.startsWith('image/') ? (
                        <img src={file.url} alt={`Visualização de ${file.name}`} className="max-w-full max-h-full object-contain" />
                    ) : file.type === 'application/pdf' ? (
                        <iframe src={file.url} className="w-full h-full border-0" title={file.name} />
                    ) : (
                        <div className="text-center text-gray-400 p-10">
                            <p>Visualização não disponível para este tipo de arquivo.</p>
                            <a href={file.url} download={file.name} className="mt-4 inline-block text-fuchsia-400 underline">Baixar arquivo</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export const QuoteGenerator: React.FC = () => {
    const { settings, isLoaded, wooProducts, systemPrompt, wpConfig } = useSettings();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<'file' | 'text' | null>(null);
    const [showSettingsWarning, setShowSettingsWarning] = useState(false);
    const [wpConfigMissing, setWpConfigMissing] = useState(false);
    const [processingAction, setProcessingAction] = useState<{ messageId: string; payload: string } | null>(null);
    const initialMessageSent = useRef(false);
    const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);
    const objectUrls = useRef<string[]>([]);

    const apiKeyMissing = useMemo(() => !isApiKeyConfigured(), []);

    // On unmount, clean up all URLs created during the component's lifetime
    useEffect(() => {
        return () => {
            objectUrls.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // This effect runs once settings are loaded to initialize component state
    useEffect(() => {
        if (!isLoaded) return;
        
        // Check for WP config
        if (!wpConfig || !wpConfig.url) {
            setWpConfigMissing(true);
        } else {
            setWpConfigMissing(false);
        }

        // Set initial greeting message once settings are loaded
        if (!initialMessageSent.current) {
            setMessages(getInitialMessages());
            initialMessageSent.current = true;
        }
        
        // Check for settings completeness
        if (settings.associationName.includes("[Insira") || settings.pixKey.includes("[Insira")) {
             setShowSettingsWarning(true);
        } else {
            setShowSettingsWarning(false);
        }
    }, [isLoaded, settings, wpConfig]);


    const handleAction = useCallback(async (messageId: string, payload: string) => {
        const actionMessage = messages.find(m => m.id === messageId);
        if (!actionMessage || actionMessage.content.type !== 'actions') return;

        setProcessingAction({ messageId, payload });
        // Brief delay to allow UI to update and show the visual effect
        await new Promise(resolve => setTimeout(resolve, 300));

        const actionLabel = actionMessage.content.actions.find(a => a.payload === payload)?.label || 'Minha escolha';

        const userResponseMessage: ChatMessage = {
            id: `user-action-${Date.now()}`,
            sender: 'user',
            content: { type: 'text', text: actionLabel },
            isActionComplete: true,
        };
        
        // Handle async actions separately
        if (payload === 'generate_highlight') {
            const loadingMessage: ChatMessage = {
                id: `ai-loading-${Date.now()}`,
                sender: 'ai',
                content: { type: 'loading' },
            };

            setMessages(prev => [...prev.filter(m => m.id !== messageId), userResponseMessage, loadingMessage]);
            setIsLoading(true);
            setLoadingAction('text');

            try {
                const lastQuoteMessage = [...messages].reverse().find(m => m.content.type === 'quote');
                const recentQuoteSummary = lastQuoteMessage && lastQuoteMessage.content.type === 'quote' 
                    ? lastQuoteMessage.content.result.internalSummary 
                    : undefined;
                
                const result = await generateHighlight(recentQuoteSummary);
                const aiMessage: ChatMessage = {
                    id: `ai-highlight-${Date.now()}`,
                    sender: 'ai',
                    content: { type: 'text', text: result },
                };
                setMessages(prev => [...prev.slice(0, -1), aiMessage]);
            } catch (err) {
                const errorMessage: ChatMessage = {
                    id: `ai-error-${Date.now()}`,
                    sender: 'ai',
                    content: { type: 'error', message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' },
                };
                setMessages(prev => [...prev.slice(0, -1), errorMessage]);
            } finally {
                setIsLoading(false);
                setLoadingAction(null);
                setProcessingAction(null);
            }
            return;
        }
        
        // Replace action message with user's choice and add follow-ups
        setMessages(prevMessages => {
            const newMessages = prevMessages.filter(m => m.id !== messageId);
            newMessages.push(userResponseMessage);

            let followUpMessages: ChatMessage[] = [];
            switch (payload) {
                case 'start_quote':
                    followUpMessages.push({
                        id: `ai-resp-${Date.now()}`, sender: 'ai',
                        content: { type: 'text', text: 'Ótimo! Por favor, anexe o arquivo da receita (imagem ou PDF) no campo abaixo para eu analisar.' },
                    });
                    break;
                case 'start_user_lookup':
                    followUpMessages.push({
                        id: `ai-resp-${Date.now()}`, sender: 'ai',
                        content: { type: 'user_search' },
                    });
                    break;
                case 'general_info':
                    followUpMessages.push({
                        id: `ai-resp-${Date.now()}`, sender: 'ai',
                        content: {
                            type: 'actions', text: 'Claro! Sobre o que você gostaria de saber?',
                            actions: [
                                { label: 'Produtos disponíveis', payload: 'info_products' },
                                { label: 'Horário de funcionamento', payload: 'info_hours' },
                                { label: 'Formas de pagamento', payload: 'info_payment' },
                                { label: 'Outra dúvida', payload: 'info_other' },
                            ]
                        }
                    });
                    break;
                case 'info_products':
                    followUpMessages.push({
                        id: `ai-resp-${Date.now()}`,
                        sender: 'ai',
                        content: { type: 'product_search' }
                    });
                    break;
                case 'info_hours':
                    followUpMessages.push({
                        id: `ai-resp-${Date.now()}`, sender: 'ai',
                        content: { type: 'text', text: `Nosso horário de funcionamento é: ${settings.operatingHours || 'Não informado.'}` }
                    });
                    break;
                case 'info_payment':
                    followUpMessages.push({
                        id: `ai-resp-${Date.now()}`, sender: 'ai',
                        content: { type: 'text', text: `O pagamento pode ser feito via PIX. A chave é o CNPJ: ${settings.pixKey || 'Não informado.'}` }
                    });
                    break;
                case 'info_other':
                    followUpMessages.push({
                        id: `ai-resp-${Date.now()}`, sender: 'ai',
                        content: { type: 'text', text: 'Sem problemas. Por favor, digite sua pergunta que eu tentarei responder.' }
                    });
                    break;
            }
            return [...newMessages, ...followUpMessages];
        });
        
        setProcessingAction(null);

    }, [messages, settings, wooProducts]);

    const handleSendFile = useCallback(async (file: File) => {
        if (showSettingsWarning || apiKeyMissing || wpConfigMissing) return;

        const fileURL = URL.createObjectURL(file);
        objectUrls.current.push(fileURL); // Track the URL for later cleanup

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            content: { 
                type: 'file_request', 
                fileName: file.name,
                fileURL: fileURL,
                fileType: file.type,
            },
        };
        const loadingMessage: ChatMessage = {
            id: `ai-loading-${Date.now()}`,
            sender: 'ai',
            content: { type: 'loading' },
        };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        setIsLoading(true);
        setLoadingAction('file');

        try {
            const result = await processPrescription(file, systemPrompt);
            const resultMessage: ChatMessage = {
                id: `ai-result-${Date.now()}`,
                sender: 'ai',
                content: { type: 'quote', result },
            };
            setMessages(prev => [...prev.slice(0, -1), resultMessage]);
        } catch (err) {
            const errorMessage: ChatMessage = {
                id: `ai-error-${Date.now()}`,
                sender: 'ai',
                content: { type: 'error', message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' },
            };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        } finally {
            setIsLoading(false);
            setLoadingAction(null);
        }
    }, [systemPrompt, showSettingsWarning, apiKeyMissing, wpConfigMissing]);

    const handleSendText = useCallback(async (text: string) => {
        if (apiKeyMissing) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            content: { type: 'text', text },
        };
        const loadingMessage: ChatMessage = {
            id: `ai-loading-${Date.now()}`,
            sender: 'ai',
            content: { type: 'loading' },
        };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        setIsLoading(true);
        setLoadingAction('text');
        
        try {
            const result = await pingAI(text, showSettingsWarning);
            const aiMessage: ChatMessage = {
                id: `ai-text-${Date.now()}`,
                sender: 'ai',
                content: { type: 'text', text: result },
            };
            setMessages(prev => [...prev.slice(0, -1), aiMessage]);
        } catch (err) {
            const errorMessage: ChatMessage = {
                id: `ai-error-${Date.now()}`,
                sender: 'ai',
                content: { type: 'error', message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' },
            };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        } finally {
            setIsLoading(false);
            setLoadingAction(null);
        }
    }, [showSettingsWarning, apiKeyMissing]);
    
    const handleSend = useCallback(async ({ text, file }: { text: string; file: File | null }) => {
        if (file) {
            await handleSendFile(file);
        } else if (text.trim()) {
            await handleSendText(text);
        }
    }, [handleSendFile, handleSendText]);

    const handleResetChat = useCallback(() => {
        // Revoke all previously created object URLs to prevent memory leaks
        objectUrls.current.forEach(url => URL.revokeObjectURL(url));
        objectUrls.current = [];
        setMessages(getInitialMessages());
    }, []);

    const handleOpenFilePreview = (file: { url: string; type: string; name: string }) => {
        setPreviewFile(file);
    };

    const handleClosePreview = () => {
        // We no longer revoke the URL here. It will be cleaned up on chat reset or component unmount.
        setPreviewFile(null);
    };

    const isChatDisabled = showSettingsWarning || apiKeyMissing || wpConfigMissing;
    let disabledReason = "";
    if (apiKeyMissing) {
        disabledReason = "Ação necessária: A Chave da API do Gemini não foi configurada no ambiente.";
    } else if (wpConfigMissing) {
        disabledReason = "Ação necessária: Configure a API do Sativar_WP_API nas Configurações.";
    } else if (showSettingsWarning) {
        disabledReason = "Complete as configurações da associação para habilitar o envio de receitas.";
    }

    return (
        <div className="flex h-full flex-col">
            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={handleClosePreview} />
            )}
            {apiKeyMissing && (
                <div className="flex-shrink-0 p-2">
                    <div className="mx-auto max-w-4xl rounded-md bg-red-900/50 p-3 text-sm text-red-300 flex items-start gap-3 border border-red-700/50">
                        <AlertTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Ação Necessária: Chave da API do Gemini ausente</p>
                            <p className="mt-1">
                                A aplicação está em modo de funcionalidade limitada. Para habilitar a análise de receitas, um administrador deve configurar a variável de ambiente <code>VITE_GEMINI_API_KEY</code> no painel de controle do ambiente de hospedagem.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {(wpConfigMissing && !apiKeyMissing) && (
                 <div className="flex-shrink-0 p-2">
                    <div className="mx-auto max-w-4xl rounded-md bg-yellow-900/50 p-3 text-sm text-yellow-300 flex items-center gap-3 border border-yellow-700/50">
                        <AlertTriangleIcon className="h-5 w-5 flex-shrink-0" />
                        <span>A conexão com o sistema Sativar_WP_API ainda não foi configurada. Visite a página de 'Configurações' para habilitar a integração.</span>
                    </div>
                </div>
            )}
            
            <Chat 
                messages={messages}
                onSend={handleSend}
                isLoading={isLoading}
                disabled={isChatDisabled}
                disabledReason={disabledReason}
                loadingAction={loadingAction}
                onAction={handleAction}
                processingAction={processingAction}
                onResetChat={handleResetChat}
                onOpenFilePreview={handleOpenFilePreview}
            />
        </div>
    );
};