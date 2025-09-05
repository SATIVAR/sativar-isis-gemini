import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { processPrescription, pingAI, isApiKeyConfigured, API_KEY_STORAGE_KEY } from '../services/geminiService';
import type { ChatMessage } from '../types';
import { AlertTriangleIcon } from './icons';
import { Chat } from './Chat';


export const QuoteGenerator: React.FC = () => {
    const { settings, systemPrompt, isLoaded } = useSettings();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<'file' | 'text' | null>(null);
    const [showSettingsWarning, setShowSettingsWarning] = useState(false);
    const [apiKeyMissing, setApiKeyMissing] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const initialMessageSent = useRef(false);

    // Check for API key on mount
    useEffect(() => {
        if (!isApiKeyConfigured()) {
            setApiKeyMissing(true);
        }
    }, []);

    // Set initial greeting message once settings are loaded
    useEffect(() => {
        if (isLoaded && !initialMessageSent.current) {
            const associationName = settings.associationName && !settings.associationName.includes("[Insira")
                ? `da ${settings.associationName}`
                : "da associação";
            
            const greeting = `Olá! Sou a Ísis, sua assistente virtual ${associationName}. Estou aqui para ajudar a agilizar seu orçamento. Por favor, anexe a receita médica (em formato de imagem ou PDF) e eu farei a análise para você. 😊`;

            setMessages([
                {
                    id: 'init',
                    sender: 'ai',
                    content: { type: 'text', text: greeting },
                }
            ]);
            initialMessageSent.current = true;
        }
    }, [isLoaded, settings]);

    // Check for settings completeness
    useEffect(() => {
        if (isLoaded && systemPrompt.includes("[Insira")) {
             setShowSettingsWarning(true);
        } else {
            setShowSettingsWarning(false);
        }
    }, [systemPrompt, isLoaded]);

    const handleSend = useCallback(async ({ text, file }: { text: string; file: File | null }) => {
        if (file) {
            await handleSendFile(file);
        } else if (text.trim()) {
            await handleSendText(text);
        }
    }, [systemPrompt, showSettingsWarning, apiKeyMissing]);
    
    const handleSendFile = useCallback(async (file: File) => {
        if (!systemPrompt || showSettingsWarning || apiKeyMissing) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            content: { type: 'file_request', fileName: file.name },
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
    }, [systemPrompt, showSettingsWarning, apiKeyMissing]);

    const handleSendText = useCallback(async (text: string) => {
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
    }, [showSettingsWarning]);

    const handleSaveApiKey = () => {
        if (!apiKeyInput.trim()) {
            alert("Por favor, insira uma chave de API válida.");
            return;
        }
        try {
            localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyInput.trim());
            setApiKeyMissing(false);
            setApiKeyInput('');
        } catch (e) {
            console.error("Failed to save API key to localStorage", e);
            alert("Não foi possível salvar a chave da API. Verifique as permissões do seu navegador.");
        }
    };

    const isChatDisabled = showSettingsWarning || apiKeyMissing;
    let disabledReason = "";
    if (apiKeyMissing) {
        disabledReason = "Ação necessária: Configure a Chave da API do Gemini.";
    } else if (showSettingsWarning) {
        disabledReason = "Complete as configurações para habilitar o envio de receitas.";
    }

    return (
        <div className="flex h-full flex-col">
            {apiKeyMissing && (
                <div className="flex-shrink-0 p-2">
                    <div className="mx-auto max-w-4xl rounded-md bg-red-900/50 p-3 text-sm text-red-300 flex items-start gap-3 border border-red-700/50">
                        <AlertTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Ação Necessária: Chave da API do Gemini ausente</p>
                            <p className="mt-1">
                                A aplicação está em modo de funcionalidade limitada. Para habilitar a análise de receitas, insira sua chave da API do Google Gemini abaixo. A chave será salva localmente no seu navegador.
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <input
                                    type="password"
                                    placeholder="Cole sua chave da API aqui"
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    className="flex-grow bg-[#131314] border border-red-700/50 text-white rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-red-400 focus:border-red-400 outline-none transition"
                                    aria-label="Gemini API Key Input"
                                />
                                <button
                                    onClick={handleSaveApiKey}
                                    className="px-3 py-1.5 bg-red-600 text-white font-semibold rounded-md text-xs hover:bg-red-700 transition-colors"
                                >
                                    Salvar Chave
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-red-400">
                                Alternativamente, um administrador pode configurar a variável de ambiente <code>API_KEY</code> no painel de controle do ambiente de hospedagem para todos os usuários.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {showSettingsWarning && !apiKeyMissing && (
                <div className="flex-shrink-0 p-2">
                    <div className="mx-auto max-w-4xl rounded-md bg-yellow-900/50 p-3 text-sm text-yellow-300 flex items-center gap-3 border border-yellow-700/50">
                        <AlertTriangleIcon className="h-5 w-5 flex-shrink-0" />
                        <span>As configurações da associação parecem incompletas. Visite a página de 'Configurações' para preenchê-las. O envio de receitas está desabilitado.</span>
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
            />
        </div>
    );
};
