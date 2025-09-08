
import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useSettings } from '../hooks/useSettings.ts';
import type { ChatMessage, QuoteResult, MessageContent } from '../types.ts';
import { AlertTriangleIcon, ClipboardCheckIcon, ClipboardIcon, DownloadIcon, PlusIcon, SendIcon, UserIcon, BellIcon, RefreshCwIcon, CheckIcon } from './icons.tsx';
import { Loader } from './Loader.tsx';
import { ReminderModal } from './Reminders.tsx';
import { TypingIndicator } from './TypingIndicator.tsx';

const AIAvatar: React.FC = () => (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-fuchsia-900">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-fuchsia-200"
            aria-label="Ísis AI Avatar"
        >
            <path d="M12 6V2H8"></path>
            <path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z"></path>
            <path d="M2 12h2"></path>
            <path d="M9 11v2"></path>
            <path d="M15 11v2"></path>
            <path d="M20 12h2"></path>
        </svg>
    </div>
);

const UserAvatar: React.FC = () => (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-600">
        <UserIcon className="h-5 w-5 text-gray-300" />
    </div>
);

const QuoteResultDisplay: React.FC<{result: QuoteResult, onResetChat: () => void}> = ({ result, onResetChat }) => {
    const [copied, setCopied] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const { settings } = useSettings();
    const isExpired = result.validity.toLowerCase().includes('vencida');

    const handleCopy = () => {
        navigator.clipboard.writeText(result.patientMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const maxLineWidth = pageWidth - margin * 2;
        let y = 20;

        // Extract patient name
        const patientName = result.patientName || 'Paciente';
        const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const fileName = `orcamento-${patientName.replace(/\s+/g, '_')}-${today}.pdf`;

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        const title = `Orçamento - ${settings.associationName || 'Associação'}`;
        doc.text(title, pageWidth / 2, y, { align: 'center' });
        y += 15;

        // Internal Summary
        doc.setFontSize(14);
        doc.text('Resumo Interno para a Equipe', margin, y);
        y += 7;

        doc.setFont('courier', 'normal');
        doc.setFontSize(10);
        const internalLines = doc.splitTextToSize(result.internalSummary, maxLineWidth);
        doc.text(internalLines, margin, y);
        y += internalLines.length * 4.5 + 5;

        const addPdfSection = (title: string, content: string | undefined) => {
            if (!content) return;
            if (y > 260) {
                doc.addPage();
                y = 20;
            }
            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(title, margin, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const contentLines = doc.splitTextToSize(content, maxLineWidth);
            doc.text(contentLines, margin, y);
            y += contentLines.length * 4.5 + 5;
        };

        addPdfSection('Histórico Médico Relevante', result.medicalHistory);
        addPdfSection('Notas do Médico', result.doctorNotes);

        y += 5; // Extra space before patient message

        // Check for page break
        if (y > 280) { // a bit of margin from bottom
            doc.addPage();
            y = 20;
        }

        // Patient Message
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Mensagem para o Paciente', margin, y);
        y += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const patientLines = doc.splitTextToSize(result.patientMessage, maxLineWidth);
        doc.text(patientLines, margin, y);

        doc.save(fileName);
    };

    return (
        <>
            {isReminderModalOpen && (
                <ReminderModal 
                    quoteId={result.id}
                    patientName={result.patientName}
                    onClose={() => setIsReminderModalOpen(false)}
                />
            )}
            <div className="mt-2 w-full space-y-4 text-sm">
                <div>
                    <h3 className="font-semibold text-fuchsia-300 mb-2">Resumo Interno para a Equipe</h3>
                    <div className="p-4 bg-[#202124] rounded-lg border border-gray-700 space-y-4">
                        <div className="font-mono text-xs text-gray-300 space-y-2">
                             <p><span className="text-gray-400">Paciente:</span> {result.patientName}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-gray-400 shrink-0">Receita:</span>
                                {isExpired ? (
                                    <span className="flex items-center gap-1.5 font-bold text-red-300 bg-red-900/50 px-2 py-0.5 rounded text-xs">
                                        <AlertTriangleIcon className="w-3 h-3" />
                                        <span>{result.validity}</span>
                                    </span>
                                ) : (
                                    <span className="font-semibold text-green-400">{result.validity}</span>
                                )}
                             </div>
                             <p className="text-gray-400 pt-1">Produtos Solicitados:</p>
                             <ul className="pl-4 space-y-1">
                                {result.products.map((p, i) => (
                                    <li key={i} className={p.status.toLowerCase().includes('alerta') ? 'text-yellow-300' : ''}>
                                        <span className="font-semibold">{p.name}</span> ({p.concentration}) - {p.quantity}.
                                        {p.status.toLowerCase() !== 'ok' && <span className="block text-xs pl-2 font-normal opacity-80">↳ Status: {p.status}</span>}
                                    </li>
                                ))}
                             </ul>
                             <p className="pt-1"><span className="text-gray-400">Valor Total:</span> {result.totalValue}</p>
                        </div>
                        {result.observations && (
                            <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-700/50">
                                <div className="flex items-start gap-2">
                                    <AlertTriangleIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-yellow-300 text-sm">Observações da IA</h4>
                                        <div className="whitespace-pre-wrap font-sans text-sm text-yellow-300/90 mt-1">
                                            {result.observations}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {result.medicalHistory && (
                            <div className="pt-4 border-t border-gray-700/50">
                                <h4 className="font-semibold text-fuchsia-300/80 mb-1">Histórico Médico Relevante</h4>
                                <div className="whitespace-pre-wrap font-sans text-sm text-gray-300">
                                    {result.medicalHistory}
                                </div>
                            </div>
                        )}
                        {result.doctorNotes && (
                            <div className="pt-4 border-t border-gray-700/50">
                                <h4 className="font-semibold text-fuchsia-300/80 mb-1">Notas do Médico</h4>
                                <div className="whitespace-pre-wrap font-sans text-sm text-gray-300">
                                    {result.doctorNotes}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-fuchsia-300 mb-1">Mensagem Pronta para o Paciente</h3>
                    <div className="relative p-3 bg-[#202124] rounded-lg border border-gray-700">
                        <button onClick={handleCopy} className="absolute top-2 right-2 p-1 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors" aria-label="Copiar mensagem para o paciente">
                            {copied ? <ClipboardCheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                        </button>
                        <pre className="whitespace-pre-wrap font-sans">{result.patientMessage}</pre>
                    </div>
                </div>
                 <div className="flex items-center justify-between pt-2">
                    <button
                        onClick={() => setIsReminderModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-700/60 transition-colors"
                        aria-label="Criar um lembrete para este orçamento"
                    >
                        <BellIcon className="w-4 h-4" />
                        Criar Lembrete
                    </button>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-sm text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors"
                            aria-label="Baixar orçamento como PDF"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Baixar PDF
                        </button>
                        <button
                            onClick={onResetChat}
                            className="flex items-center gap-2 px-4 py-2 bg-fuchsia-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-fuchsia-600 transition-colors"
                            aria-label="Analisar nova receita"
                        >
                            <RefreshCwIcon className="w-4 h-4" />
                            Analisar Nova Receita
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

const MessageBubble: React.FC<{ 
    message: ChatMessage; 
    onAction: (messageId: string, payload: string) => void; 
    processingAction: { messageId: string; payload: string } | null;
    loadingAction: 'file' | 'text' | null;
    onResetChat: () => void;
}> = ({ message, onAction, processingAction, loadingAction, onResetChat }) => {
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
            case 'loading': {
                return <TypingIndicator />;
            }
            case 'quote':
                return <QuoteResultDisplay result={content.result} onResetChat={onResetChat} />;
            case 'error':
                 return (
                    <div className="flex items-start gap-3 p-3 bg-red-900/20 rounded-lg border border-red-700/50">
                        <AlertTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-300">{content.message}</p>
                    </div>
                 );
            case 'actions':
                const isThisGroupProcessing = processingAction?.messageId === message.id;
                return (
                    <div>
                        {content.text && <p className="whitespace-pre-wrap mb-3">{content.text}</p>}
                        <div className="flex flex-wrap gap-2">
                            {content.actions.map(action => {
                                const isThisButtonProcessing = isThisGroupProcessing && processingAction?.payload === action.payload;
                                return (
                                    <button
                                        key={action.payload}
                                        onClick={() => onAction(message.id, action.payload)}
                                        disabled={isThisGroupProcessing}
                                        className={`text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-fuchsia-500
                                            ${isThisButtonProcessing
                                                ? 'bg-fuchsia-900 animate-pulse'
                                                : 'bg-gray-700'
                                            }
                                            ${isThisGroupProcessing
                                                ? 'opacity-70 cursor-not-allowed'
                                                : 'hover:bg-fuchsia-800'
                                            }
                                        `}
                                    >
                                        {action.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const isAI = message.sender === 'ai';
    const canBeCopied = message.content.type === 'text';
    const copyButtonClass = isAI
        ? "bg-gray-700 hover:bg-gray-600"
        : "bg-green-900 hover:bg-green-800";
    
    const isUserActionCompleteText = message.sender === 'user' && message.content.type === 'text' && message.isActionComplete;

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
                {isUserActionCompleteText ? (
                    <div className="flex items-end gap-1.5">
                        <div className={canBeCopied ? 'pr-8' : ''}>
                           {renderContent(message.content)}
                        </div>
                        {/* FIX: The `title` prop is not valid for Icon components. Replaced with a child `<title>` element for accessibility. */}
                        <CheckIcon className="w-4 h-4 text-white/70 flex-shrink-0 mb-0.5"><title>Ação concluída</title></CheckIcon>
                    </div>
                ) : (
                    <div className={canBeCopied ? 'pr-8' : ''}>
                        {renderContent(message.content)}
                    </div>
                )}
            </div>
            {!isAI && <UserAvatar />}
        </div>
    );
};

const ChatInput: React.FC<{
    onSend: (data: { text: string; file: File | null }) => void;
    isLoading: boolean;
    disabled: boolean;
    disabledReason: string;
    loadingAction: 'file' | 'text' | null;
}> = ({ onSend, isLoading, disabled, disabledReason, loadingAction }) => {
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
        if (disabled || isLoading || (!file && !text.trim())) return;

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
    
    const placeholder = isLoading
        ? (loadingAction === 'file' ? 'Analisando receita...' : 'Processando sua solicitação...')
        : disabled
            ? disabledReason
            : (file ? file.name : "Digite uma mensagem ou anexe uma receita...");

    return (
        <div className="mx-auto w-full max-w-4xl">
            <div className="flex items-center gap-2 rounded-xl bg-[#303134] p-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-10 w-10 items-center justify-center rounded-full p-2 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading || disabled}
                    aria-label="Attach file"
                    title={disabled ? disabledReason : "Anexar arquivo"}
                >
                    {isLoading && loadingAction === 'file' ? (
                        <Loader />
                    ) : (
                        <PlusIcon className="h-6 w-6 text-gray-400" />
                    )}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isLoading || disabled}
                />
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-grow bg-transparent px-2 text-sm text-gray-200 placeholder-gray-400 focus:outline-none"
                    disabled={isLoading || disabled}
                />
                <button
                    onClick={handleSend}
                    disabled={(!file && !text.trim()) || isLoading || disabled}
                    className="rounded-full p-2 transition-colors bg-gray-700 hover:bg-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
                    aria-label="Send message"
                >
                    <SendIcon className="h-5 w-5 text-white" />
                </button>
            </div>
        </div>
    );
};

interface ChatProps {
    messages: ChatMessage[];
    onSend: (data: { text: string; file: File | null }) => void;
    isLoading: boolean;
    disabled: boolean;
    disabledReason: string;
    loadingAction: 'file' | 'text' | null;
    onAction: (messageId: string, payload: string) => void;
    processingAction: { messageId: string; payload: string } | null;
    onResetChat: () => void;
}

export const Chat: React.FC<ChatProps> = ({
    messages,
    onSend,
    isLoading,
    disabled,
    disabledReason,
    loadingAction,
    onAction,
    processingAction,
    onResetChat,
}) => {
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <>
            <div className="flex-grow space-y-6 overflow-y-auto p-4 md:p-6">
                 {messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        onAction={onAction} 
                        processingAction={processingAction} 
                        loadingAction={loadingAction}
                        onResetChat={onResetChat}
                    />
                ))}
                <div ref={chatEndRef} />
            </div>
            
            <div className="flex-shrink-0 border-t border-gray-700/50 bg-[#131314] p-4">
                <ChatInput 
                    onSend={onSend} 
                    isLoading={isLoading} 
                    disabled={disabled} 
                    disabledReason={disabledReason}
                    loadingAction={loadingAction}
                />
            </div>
        </>
    );
};