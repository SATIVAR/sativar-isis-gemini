
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings.ts';
import { processPrescription, pingAI, isApiKeyConfigured, generateHighlight, generateConversationTitle } from '../services/geminiService.ts';
import type { ChatMessage } from '../types.ts';
import { AlertTriangleIcon, XCircleIcon, ServerIcon } from './icons.tsx';
import { Chat } from './Chat.tsx';
import { useChatHistory } from '../hooks/useChatHistory.ts';
import { ChatHistoryTabs } from './ChatHistoryTabs.tsx';
import { Loader } from './Loader.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { AdminLogin } from './AdminLogin.tsx';

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
    const auth = useAuth();
    const { isLoaded, sativarSeishatProducts, systemPrompt, wpConfig, settings } = useSettings();
    const {
        messages, setMessages, addMessage,
        conversations, activeConversationId,
        activeConversation,
        selectConversation, startNewConversation, deleteConversation,
        isLoading: isHistoryLoading, isChatEmpty, updateConversationTitle
    } = useChatHistory();

    const [isSending, setIsSending] = useState(false);
    const [loadingAction, setLoadingAction] = useState<'file' | 'text' | null>(null);
    const [showSettingsWarning, setShowSettingsWarning] = useState(false);
    const [wpConfigMissing, setWpConfigMissing] = useState(false);
    const [processingAction, setProcessingAction] = useState<{ messageId: string; payload: string; text?: string } | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);
    const objectUrls = useRef<string[]>([]);
    
    const apiKeyMissing = !isApiKeyConfigured();

    // On conversation change or unmount, clean up all URLs created.
    useEffect(() => {
        return () => {
            objectUrls.current.forEach(url => URL.revokeObjectURL(url));
            objectUrls.current = [];
        };
    }, [activeConversationId]);

    // This effect runs once settings are loaded to check for configuration issues.
    useEffect(() => {
        if (!isLoaded) return;
        
        setWpConfigMissing(!wpConfig || !wpConfig.url);
        setShowSettingsWarning(settings.associationName.includes("[Insira") || settings.pixKey.includes("[Insira"));

    }, [isLoaded, settings, wpConfig]);


    const handleAction = useCallback(async (messageId: string, payload: string) => {
        const actionMessage = messages.find(m => m.id === messageId);
        if (!actionMessage || actionMessage.content.type !== 'actions') return;

        setProcessingAction({ messageId, payload });

        const actionLabel = actionMessage.content.actions.find(a => a.payload === payload)?.label || 'Minha escolha';

        const userResponseMessage: ChatMessage = {
            id: `user-action-${Date.now()}`,
            sender: 'user',
            content: { type: 'text', text: actionLabel },
            isActionComplete: true,
            timestamp: new Date().toISOString(),
        };
        
        // Replace action buttons with user's plain text response
        setMessages(prev => [...prev.filter(m => m.id !== messageId), userResponseMessage]);
        await addMessage(userResponseMessage);

        // Handle async 'generate_highlight' action
        if (payload === 'generate_highlight') {
            const loadingMessage: ChatMessage = { id: `ai-loading-${Date.now()}`, sender: 'ai', content: { type: 'loading' }, timestamp: new Date().toISOString() };
            
            setMessages(prev => [...prev, loadingMessage]);
            
            setIsSending(true);
            setLoadingAction('text');
            try {
                const lastQuoteMessage = [...messages].reverse().find(m => m.content.type === 'quote');
                const recentQuoteSummary = lastQuoteMessage?.content.type === 'quote' ? lastQuoteMessage.content.result.internalSummary : undefined;
                
                const result = await generateHighlight(recentQuoteSummary);
                const aiMessage: ChatMessage = { id: `ai-highlight-${Date.now()}`, sender: 'ai', content: { type: 'text', text: result }, timestamp: new Date().toISOString() };
                setMessages(prev => [...prev.slice(0, -1), aiMessage]);
                await addMessage(aiMessage);
            } catch (err) {
                const errorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, sender: 'ai', content: { type: 'error', message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' }, timestamp: new Date().toISOString() };
                setMessages(prev => [...prev.slice(0, -1), errorMessage]);
                await addMessage(errorMessage);
            } finally {
                setIsSending(false);
                setLoadingAction(null);
                setProcessingAction(null);
            }
            return;
        }
        
        // Handle 'start_quote' action with thinking simulation
        if (payload === 'start_quote') {
            setProcessingAction({ messageId, payload, text: 'Iniciando sistema de análise...' });

            setTimeout(() => {
                setProcessingAction({ messageId, payload, text: 'Preparando para receber o arquivo...' });
            }, 800);

            setTimeout(async () => {
                const followUpMessage: ChatMessage = { 
                    id: `ai-resp-${Date.now()}`, 
                    sender: 'ai', 
                    content: { type: 'text', text: 'Ótimo! Por favor, anexe o arquivo da receita (imagem ou PDF) no campo abaixo para eu analisar.' }, 
                    timestamp: new Date().toISOString() 
                };
                setMessages(prev => [...prev, followUpMessage]);
                await addMessage(followUpMessage);
                
                setProcessingAction(null);
            }, 1600);
            
            return; 
        }

        // Handle other synchronous actions
        let followUpMessages: ChatMessage[] = [];
        
        switch (payload) {
            case 'start_user_lookup':
                followUpMessages.push({ id: `ai-resp-${Date.now()}`, sender: 'ai', content: { type: 'user_search' }, timestamp: new Date().toISOString() });
                break;
            case 'general_info':
                followUpMessages.push({ id: `ai-resp-${Date.now()}`, sender: 'ai', content: { type: 'actions', text: 'Claro! Sobre o que você gostaria de saber?', actions: [ { label: 'Horário de funcionamento', payload: 'info_hours' }, { label: 'Formas de pagamento', payload: 'info_payment' }, { label: 'Outra dúvida', payload: 'info_other' }, ] }, timestamp: new Date().toISOString() });
                break;
            case 'info_products':
                followUpMessages.push({ id: `ai-resp-${Date.now()}`, sender: 'ai', content: { type: 'product_search' }, timestamp: new Date().toISOString() });
                break;
            case 'info_hours':
                followUpMessages.push({ id: `ai-resp-${Date.now()}`, sender: 'ai', content: { type: 'text', text: `Nosso horário de funcionamento é: ${settings.operatingHours || 'Não informado.'}` }, timestamp: new Date().toISOString() });
                break;
            case 'info_payment':
                followUpMessages.push({ id: `ai-resp-${Date.now()}`, sender: 'ai', content: { type: 'text', text: `O pagamento pode ser feito via PIX. A chave é o CNPJ: ${settings.pixKey || 'Não informado.'}` }, timestamp: new Date().toISOString() });
                break;
            case 'info_other':
                followUpMessages.push({ id: `ai-resp-${Date.now()}`, sender: 'ai', content: { type: 'text', text: 'Sem problemas. Por favor, digite sua pergunta que eu tentarei responder.' }, timestamp: new Date().toISOString() });
                break;
        }

        if (followUpMessages.length > 0) {
            setMessages(prev => [...prev, ...followUpMessages]);
            for(const msg of followUpMessages) {
                await addMessage(msg);
            }
        }
        
        setProcessingAction(null);

    }, [messages, settings, addMessage, setMessages]);

    const handleSendFile = useCallback(async (file: File) => {
        if (showSettingsWarning || apiKeyMissing || wpConfigMissing) return;

        const fileURL = URL.createObjectURL(file);
        objectUrls.current.push(fileURL);

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', content: { type: 'file_request', fileName: file.name, fileURL: fileURL, fileType: file.type }, timestamp: new Date().toISOString() };
        const loadingMessage: ChatMessage = { id: `ai-loading-${Date.now()}`, sender: 'ai', content: { type: 'loading' }, timestamp: new Date().toISOString() };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        await addMessage(userMessage);

        setIsSending(true);
        setLoadingAction('file');
        try {
            const result = await processPrescription(file, systemPrompt);
            if(activeConversationId) {
                const dynamicTitle = await generateConversationTitle(result.internalSummary || `Análise para ${result.patientName || 'Paciente'}`);
                updateConversationTitle(activeConversationId, dynamicTitle);
            }
            const resultMessage: ChatMessage = { id: `ai-result-${Date.now()}`, sender: 'ai', content: { type: 'quote', result }, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev.slice(0, -1), resultMessage]);
            await addMessage(resultMessage);
        } catch (err) {
            const errorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, sender: 'ai', content: { type: 'error', message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' }, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
            await addMessage(errorMessage);
        } finally {
            setIsSending(false);
            setLoadingAction(null);
        }
    }, [systemPrompt, showSettingsWarning, apiKeyMissing, wpConfigMissing, setMessages, addMessage, activeConversationId, updateConversationTitle]);

    const handleSendText = useCallback(async (text: string) => {
        if (apiKeyMissing) return;

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', content: { type: 'text', text }, timestamp: new Date().toISOString() };
        const loadingMessage: ChatMessage = { id: `ai-loading-${Date.now()}`, sender: 'ai', content: { type: 'loading' }, timestamp: new Date().toISOString() };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        await addMessage(userMessage);
        
        setIsSending(true);
        setLoadingAction('text');
        try {
            const result = await pingAI(text, showSettingsWarning);
            const aiMessage: ChatMessage = { id: `ai-text-${Date.now()}`, sender: 'ai', content: { type: 'text', text: result }, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev.slice(0, -1), aiMessage]);
            await addMessage(aiMessage);
        } catch (err) {
            const errorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, sender: 'ai', content: { type: 'error', message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' }, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
            await addMessage(errorMessage);
        } finally {
            setIsSending(false);
            setLoadingAction(null);
        }
    }, [showSettingsWarning, apiKeyMissing, setMessages, addMessage]);
    
    const handleSend = useCallback(async ({ text, file }: { text: string; file: File | null }) => {
        if (file) {
            await handleSendFile(file);
        } else if (text.trim()) {
            await handleSendText(text);
        }
    }, [handleSendFile, handleSendText]);
    
    const handleOpenFilePreview = (file: { url: string; type: string; name: string }) => {
        setPreviewFile(file);
    };

    if (auth.isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (!auth.isAuthenticated) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                <AdminLogin />
            </div>
        );
    }

    const isChatClosed = activeConversation?.is_closed === true;
    const isChatDisabled = showSettingsWarning || apiKeyMissing || wpConfigMissing || isChatClosed;
    
    let disabledReason = "";
    if (apiKeyMissing) disabledReason = "Ação necessária: A Chave da API do Gemini não foi configurada no ambiente.";
    else if (wpConfigMissing) disabledReason = "Ação necessária: Configure a API do Sativar_WP_API nas Configurações.";
    else if (showSettingsWarning) disabledReason = "Complete as configurações da associação para habilitar o envio de receitas.";
    else if (isChatClosed) disabledReason = "Chat encerrado. Inicie uma nova análise para continuar.";

    return (
        <div className="flex h-full flex-row">
            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
            <div className="flex h-full flex-col flex-grow min-w-0">
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
                
                {isHistoryLoading ? (
                     <div className="flex-grow flex items-center justify-center">
                        <Loader />
                    </div>
                ) : isChatEmpty ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-400 p-4">
                        <ServerIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                        <h3 className="text-lg font-semibold text-white">Não foi possível carregar o histórico</h3>
                        <p>Verifique a conexão com o servidor e atualize a página.</p>
                    </div>
                ) : (
                    <Chat 
                        messages={messages}
                        onSend={handleSend}
                        isLoading={isSending}
                        disabled={isChatDisabled}
                        disabledReason={disabledReason}
                        loadingAction={loadingAction}
                        onAction={handleAction}
                        processingAction={processingAction}
                        onOpenFilePreview={handleOpenFilePreview}
                    />
                )}
            </div>
            <ChatHistoryTabs
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={selectConversation}
                onNewConversation={startNewConversation}
                onDeleteConversation={deleteConversation}
                isLoading={isHistoryLoading}
            />
        </div>
    );
};
