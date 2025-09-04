import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { processPrescription, pingAI } from '../services/geminiService';
import type { ChatMessage, QuoteResult, MessageContent } from '../types';
import { AlertTriangleIcon, ClipboardCheckIcon, ClipboardIcon, PlusIcon, SendIcon, UserIcon } from './icons';
import { Loader } from './Loader';

const AIAvatar: React.FC = () => (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-fuchsia-900">
        <span className="text-sm font-bold text-fuchsia-200">I</span>
    </div>
);

const UserAvatar: React.FC = () => (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-600">
        <UserIcon className="h-5 w-5 text-gray-300" />
    </div>
);

const QuoteResultDisplay: React.FC<{result: QuoteResult}> = ({ result }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(result.patientMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-2 w-full space-y-4 text-sm">
            <div>
                <h3 className="font-semibold text-fuchsia-300 mb-1">Resumo Interno para a Equipe</h3>
                <div className="p-3 bg-[#202124] rounded-lg border border-gray-700 whitespace-pre-wrap font-mono text-xs">
                    {result.internalSummary}
                </div>
            </div>
            <div>
                <h3 className="font-semibold text-fuchsia-300 mb-1">Mensagem Pronta para o Paciente</h3>
                <div className="relative p-3 bg-[#202124] rounded-lg border border-gray-700">
                    <button onClick={handleCopy} className="absolute top-2 right-2 p-1 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                        {copied ? <ClipboardCheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                    </button>
                    <pre className="whitespace-pre-wrap font-sans">{result.patientMessage}</pre>
                </div>
            </div>
        </div>
    );
};


const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (textToCopy: string) => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderContent = (content: MessageContent) => {
        switch (content.type) {
            case 'text':
                return <p className="whitespace-pre-wrap">{content.text}</p>;
            case 'file_request':
                return <p className="text-gray-300">Arquivo enviado: <span className="font-medium text-white">{content.fileName}</span></p>
            case 'loading':
                return <div className="flex items-center gap-2"><Loader /><span>Analisando...</span></div>;
            case 'quote':
                return <QuoteResultDisplay result={content.result} />;
            case 'error':
                 return <p className="text-red-400">{content.message}</p>;
            default:
                return null;
        }
    };

    const isAI = message.sender === 'ai';
    const canBeCopied = message.content.type === 'text';
    const copyButtonClass = isAI
        ? "bg-gray-700 hover:bg-gray-600"
        : "bg-green-900 hover:bg-green-800";

    return (
        <div className={`flex items-start gap-3 ${!isAI ? 'justify-end' : ''}`}>
            {isAI && <AIAvatar />}
            <div className={`group relative max-w-xl rounded-xl px-4 py-3 ${isAI ? 'bg-[#303134]' : 'bg-brand-primary text-white'}`}>
                {canBeCopied && (
                    <button 
                        onClick={() => handleCopy(message.content.type === 'text' ? message.content.text : '')} 
                        className={`absolute top-2 right-2 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 z-10 ${copyButtonClass}`}
                        aria-label="Copiar mensagem"
                    >
                        {copied ? <ClipboardCheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                    </button>
                )}
                <div className={canBeCopied ? 'pr-8' : ''}>
                    {renderContent(message.content)}
                </div>
            </div>
            {!isAI && <UserAvatar />}
        </div>
    );
};

const ChatInput: React.FC<{
    onSend: (data: { text: string; file: File | null }) => void;
    isLoading: boolean;
    fileAttachDisabled: boolean;
}> = ({ onSend, isLoading, fileAttachDisabled }) => {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            // Allow sending a file without text
            if (text.trim() === '') {
                setText(e.target.files[0].name);
            }
        }
    };

    const handleSend = () => {
        if (!file && !text.trim()) return;

        // If the text is just the filename, we only send the file.
        const textToSend = file && text === file.name ? '' : text;

        onSend({ text: textToSend, file });
        setText('');
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="mx-auto w-full max-w-4xl">
            <div className="flex items-center gap-2 rounded-xl bg-[#303134] p-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full p-2 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading || fileAttachDisabled}
                    aria-label="Attach file"
                    title={fileAttachDisabled ? "Complete as configurações para enviar receitas" : "Anexar arquivo"}
                >
                    <PlusIcon className="h-6 w-6 text-gray-400" />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isLoading || fileAttachDisabled}
                />
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={file ? file.name : "Digite uma mensagem ou anexe uma receita..."}
                    className="flex-grow bg-transparent px-2 text-sm text-gray-200 placeholder-gray-400 focus:outline-none"
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    disabled={(!file && !text.trim()) || isLoading}
                    className="rounded-full p-2 transition-colors bg-gray-700 hover:bg-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
                    aria-label="Send message"
                >
                    <SendIcon className="h-5 w-5 text-white" />
                </button>
            </div>
        </div>
    );
};

export const QuoteGenerator: React.FC = () => {
    const { settings, systemPrompt, isLoaded } = useSettings();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSettingsWarning, setShowSettingsWarning] = useState(false);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const initialMessageSent = useRef(false);

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
    
    // Scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = useCallback(async ({ text, file }: { text: string; file: File | null }) => {
        if (file) {
            await handleSendFile(file);
        } else if (text.trim()) {
            await handleSendText(text);
        }
    }, [systemPrompt, showSettingsWarning]);
    
    const handleSendFile = useCallback(async (file: File) => {
        if (!systemPrompt || showSettingsWarning) return;

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
        }
    }, [systemPrompt, showSettingsWarning]);

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
        }
    }, [showSettingsWarning]);


    return (
        <div className="flex h-full flex-col">
            {showSettingsWarning && (
                <div className="flex-shrink-0 p-2">
                    <div className="mx-auto max-w-4xl rounded-md bg-yellow-900/50 p-3 text-sm text-yellow-300 flex items-center gap-3 border border-yellow-700/50">
                        <AlertTriangleIcon className="h-5 w-5 flex-shrink-0" />
                        <span>As configurações da associação parecem incompletas. Visite a página de 'Configurações' para preenchê-las. O envio de receitas está desabilitado.</span>
                    </div>
                </div>
            )}
            
            <div className="flex-grow space-y-6 overflow-y-auto p-4 md:p-6">
                 {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={chatEndRef} />
            </div>
            
            <div className="flex-shrink-0 border-t border-gray-700/50 bg-[#131314] p-4">
                <ChatInput onSend={handleSend} isLoading={isLoading} fileAttachDisabled={showSettingsWarning} />
            </div>
        </div>
    );
};