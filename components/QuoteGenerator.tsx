import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSettings } from '../hooks/useSettings.ts';
import { processPrescription, pingAI, isApiKeyConfigured, generateHighlight, generateConversationTitle } from '../services/geminiService.ts';
import type { ChatMessage } from '../types.ts';
import { AlertTriangleIcon, XCircleIcon, ServerIcon, CheckIcon } from './icons.tsx';
import { Chat } from './Chat.tsx';
import { useChatHistory } from '../hooks/useChatHistory.ts';
import { ChatHistoryTabs } from './ChatHistoryTabs.tsx';
import { Loader } from './Loader.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { AdminLogin } from './AdminLogin.tsx';
import { AdminRegistration } from './AdminRegistration.tsx';
import { useTokenUsage } from '../hooks/useTokenUsage.ts';

interface FilePreviewModalProps {
    file: File | { url: string; type: string; name: string };
    onClose: () => void;
    onConfirm?: () => void;
    isConfirmation?: boolean;
}

const thinkingPhrases = [
    'Recebendo arquivo...',
    'Analisando o documento...',
    'Extraindo informações importantes...',
    'Identificando produtos e dosagens...',
    'Verificando a validade da receita...',
    'Consultando o catálogo de produtos...',
    'Calculando os valores do orçamento...',
    'Formatando a resposta para você...',
    'Quase pronto, finalizando a análise!',
];

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, onConfirm, isConfirmation }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fileDetails = useMemo(() => {
        const name = file instanceof File ? file.name : file.name;
        const type = file instanceof File ? file.type : file.type;
        return { name, type };
    }, [file]);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (file instanceof File) {
            objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        } else {
            setPreviewUrl(file.url);
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                setPreviewUrl(null);
            }
        };
    }, [file]);


    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="file-preview-title">
            <div className="bg-[#202124] rounded-xl border border-gray-700 w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0 p-3 border-b border-gray-700 flex justify-between items-center">
                    <p id="file-preview-title" className="text-white font-semibold truncate">{fileDetails.name}</p>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Fechar visualização">
                        <XCircleIcon className="w-6 h-6"/>
                    </button>
                </div>
                <div className="flex-grow p-2 overflow-auto flex items-center justify-center">
                    {previewUrl && fileDetails.type.startsWith('image/') ? (
                        <img src={previewUrl} alt={`Visualização de ${fileDetails.name}`} className="max-w-full max-h-full object-contain" />
                    ) : previewUrl && fileDetails.type === 'application/pdf' ? (
                        <iframe src={previewUrl} className="w-full h-full border-0" title={fileDetails.name} />
                    ) : (
                        <div className="text-center text-gray-400 p-10">
                            {previewUrl ? (
                                <>
                                    <p>Visualização não disponível para este tipo de arquivo.</p>
                                    <a href={previewUrl} download={fileDetails.name} className="mt-4 inline-block text-fuchsia-400 underline">Baixar arquivo</a>
                                </>
                            ) : (
                                <Loader />
                            )}
                        </div>
                    )}
                </div>
                {isConfirmation && (
                    <div className="flex-shrink-0 p-4 border-t border-gray-700/50 flex justify-end gap-3 bg-[#303134]/30 rounded-b-xl">
                        <button onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500">
                            Cancelar
                        </button>
                        <button onClick={onConfirm} className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500">
                            <CheckIcon className="w-5 h-5" />
                            Confirmar e Analisar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

interface QuoteGeneratorProps {
    isMobileHistoryOpen: boolean;
    setIsMobileHistoryOpen: (isOpen: boolean) => void;
}

export const QuoteGenerator: React.FC<QuoteGeneratorProps> = ({ isMobileHistoryOpen, setIsMobileHistoryOpen }) => {
    const auth = useAuth();
    const { isLoaded, sativarSeishatProducts, systemPrompt, wpConfig, settings } = useSettings();
    const {
        messages, setMessages, addMessage,
        conversations, activeConversationId,
        activeConversation,
        selectConversation, startNewConversation, deleteConversation,
        isLoading: isHistoryLoading, isChatEmpty, updateConversationTitle
    } = useChatHistory();
    const { addTokens } = useTokenUsage();

    const [isSending, setIsSending] = useState(false);
    const [loadingAction, setLoadingAction] = useState<'file' | 'text' | null>(null);
    const [showSettingsWarning, setShowSettingsWarning] = useState(false);
    const [wpConfigMissing, setWpConfigMissing] = useState(false);
    const [processingAction, setProcessingAction] = useState<{ messageId: string; payload: string; text?: string } | null>(null);
    
    // State for file previews
    const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);
    const [pendingAnalysisFile, setPendingAnalysisFile] = useState<File | null>(null);
    
    const objectUrls = useRef<string[]>([]);
    const loadingIntervalRef = useRef<number | null>(null);
    
    const apiKeyMissing = !isApiKeyConfigured();

    // On conversation change or unmount, clean up all URLs created.
    useEffect(() => {
        return () => {
            objectUrls.current.forEach(url => URL.revokeObjectURL(url));
            objectUrls.current = [];
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
            }
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
            const startTime = Date.now();
            try {
                const lastQuoteMessage = [...messages].reverse().find(m => m.content.type === 'quote');
                const recentQuoteSummary = lastQuoteMessage?.content.type === 'quote' ? lastQuoteMessage.content.result.internalSummary : undefined;
                
                const { text, tokenCount } = await generateHighlight(recentQuoteSummary);
                const duration = Date.now() - startTime;
                addTokens(tokenCount);
                const aiMessage: ChatMessage = { id: `ai-highlight-${Date.now()}`, sender: 'ai', content: { type: 'text', text }, timestamp: new Date().toISOString(), tokenCount, duration };
                setMessages(prev => [...prev.slice(0, -1), aiMessage]);
                await addMessage(aiMessage);
            } catch (err) {
                const duration = Date.now() - startTime;
                const errorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, sender: 'ai', content: { type: 'error', message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' }, timestamp: new Date().toISOString(), duration };
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

    }, [messages, settings, addMessage, setMessages, addTokens]);

    const runFileAnalysis = useCallback(async (file: File) => {
        if (showSettingsWarning || apiKeyMissing || wpConfigMissing) return;

        const fileURL = URL.createObjectURL(file);
        objectUrls.current.push(fileURL);

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', content: { type: 'file_request', fileName: file.name, fileURL: fileURL, fileType: file.type }, timestamp: new Date().toISOString() };
        const loadingMessageId = `ai-loading-${Date.now()}`;
        const loadingMessage: ChatMessage = { id: loadingMessageId, sender: 'ai', content: { type: 'loading', text: thinkingPhrases[0] }, timestamp: new Date().toISOString() };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        await addMessage(userMessage);

        setIsSending(true);
        setLoadingAction('file');
        
        let phraseIndex = 1;
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = window.setInterval(() => {
            setMessages(prev => prev.map(msg => {
                if (msg.id === loadingMessageId && msg.content.type === 'loading') {
                    const newText = thinkingPhrases[phraseIndex % thinkingPhrases.length];
                    return { ...msg, content: { ...msg.content, text: newText } };
                }
                return msg;
            }));
            phraseIndex++;
        }, 2000);

        const startTime = Date.now();
        try {
            const { result, tokenCount } = await processPrescription(file, systemPrompt);
            const duration = Date.now() - startTime;
            addTokens(tokenCount);
            if(activeConversationId) {
                const { text: dynamicTitle, tokenCount: titleTokenCount } = await generateConversationTitle(result.internalSummary || `Análise para ${result.patientName || 'Paciente'}`);
                addTokens(titleTokenCount);
                updateConversationTitle(activeConversationId, dynamicTitle);
            }
            const resultMessage: ChatMessage = { id: `ai-result-${Date.now()}`, sender: 'ai', content: { type: 'quote', result }, timestamp: new Date().toISOString(), tokenCount, duration };
            setMessages(prev => [...prev.slice(0, -1), resultMessage]);
            await addMessage(resultMessage);
        } catch (err) {
            const duration = Date.now() - startTime;
            const errorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, sender: 'ai', content: { type: 'error', message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' }, timestamp: new Date().toISOString(), duration };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
            await addMessage(errorMessage);
        } finally {
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
                loadingIntervalRef.current = null;
            }
            setIsSending(false);
            setLoadingAction(null);
        }
    }, [systemPrompt, showSettingsWarning, apiKeyMissing, wpConfigMissing, setMessages, addMessage, activeConversationId, updateConversationTitle, addTokens]);

    const handleSendText = useCallback(async (text: string) => {
        if (apiKeyMissing) return;

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', content: { type: 'text', text }, timestamp: new Date().toISOString() };
        const loadingMessage: ChatMessage = { id: `ai-loading-${Date.now()}`, sender: 'ai', content: { type: 'loading' }, timestamp: new Date().toISOString() };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        await addMessage(userMessage);
        
        setIsSending(true);
        setLoadingAction('text');
        const startTime = Date.now();
        try {
            const { text: result, tokenCount } = await pingAI(text, showSettingsWarning);
            const duration = Date.now() - startTime;
            addTokens(tokenCount);
            const aiMessage: ChatMessage = { id: `ai-text-${Date.now()}`, sender: 'ai', content: { type: 'text', text: result }, timestamp: new Date().toISOString(), tokenCount, duration };
            setMessages(prev => [...prev.slice(0, -1), aiMessage]);
            await addMessage(aiMessage);
        } catch (err) {
            const duration = Date.now() - startTime;
            const errorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, sender: 'ai', content: { type: 'error', message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' }, timestamp: new Date().toISOString(), duration };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
            await addMessage(errorMessage);
        } finally {
            setIsSending(false);
            setLoadingAction(null);
        }
    }, [showSettingsWarning, apiKeyMissing, setMessages, addMessage, addTokens]);
    
    const handleSend = useCallback(async ({ text, file }: { text: string; file: File | null }) => {
        if (file) {
            // Instead of analyzing immediately, set the file to be confirmed via modal.
            setPendingAnalysisFile(file);
        } else if (text.trim()) {
            await handleSendText(text);
        }
    }, [handleSendText]);

    const handleConfirmAndAnalyze = useCallback(async () => {
        if (pendingAnalysisFile) {
            // Capture the file and close the modal immediately for a responsive UI.
            const fileToAnalyze = pendingAnalysisFile;
            setPendingAnalysisFile(null);
            await runFileAnalysis(fileToAnalyze);
        }
    }, [pendingAnalysisFile, runFileAnalysis]);
    
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

    if (!auth.isAdminSetup) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                <AdminRegistration onRegistrationSuccess={auth.checkSetup} />
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

    const handleSelectAndClose = (id: string) => {
        selectConversation(id);
        setIsMobileHistoryOpen(false);
    };

    const handleNewAndClose = () => {
        startNewConversation();
        setIsMobileHistoryOpen(false);
    };

    return (
        <div className="flex h-full flex-row overflow-hidden">
            {/* Modal for viewing files already in chat history */}
            {previewFile && (
                <FilePreviewModal 
                    file={previewFile} 
                    onClose={() => setPreviewFile(null)} 
                />
            )}
            {/* Modal for confirming new file before analysis */}
            {pendingAnalysisFile && (
                <FilePreviewModal 
                    file={pendingAnalysisFile}
                    onClose={() => setPendingAnalysisFile(null)}
                    onConfirm={handleConfirmAndAnalyze}
                    isConfirmation={true}
                />
            )}
            {isMobileHistoryOpen && (
                <div className="min-[461px]:hidden fixed inset-0 z-30" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setIsMobileHistoryOpen(false)} aria-hidden="true"></div>
                    <div className="absolute top-0 right-0 h-full bg-[#131314] w-72 shadow-xl flex flex-col animate-slide-in-right">
                         <style>{`@keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } } .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }`}</style>
                         <ChatHistoryTabs
                            mode="drawer"
                            conversations={conversations}
                            activeConversationId={activeConversationId}
                            onSelectConversation={handleSelectAndClose}
                            onNewConversation={handleNewAndClose}
                            onDeleteConversation={deleteConversation}
                            isLoading={isHistoryLoading}
                        />
                    </div>
                </div>
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
            <div className="hidden min-[461px]:flex h-full">
                <ChatHistoryTabs
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelectConversation={selectConversation}
                    onNewConversation={startNewConversation}
                    onDeleteConversation={deleteConversation}
                    isLoading={isHistoryLoading}
                />
            </div>
        </div>
    );
};