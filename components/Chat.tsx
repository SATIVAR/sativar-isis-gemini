// FIX: Import useState and useEffect from React to resolve multiple hook-related errors.
import React, { useRef, useState, useEffect } from 'react';
import { PlusIcon, SendIcon, XCircleIcon } from './icons.tsx';
import { Loader } from './Loader.tsx';

interface ChatInputProps {
    text: string;
    onTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAttachClick: () => void;
    onSend: () => void;
    isLoading: boolean;
    disabled: boolean;
    disabledReason: string;
    loadingAction: 'file' | 'text' | null;
}


const ChatInput: React.FC<ChatInputProps> = ({ 
    text, onTextChange, onAttachClick, onSend, 
    isLoading, disabled, disabledReason, loadingAction 
}) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };
    
    const placeholder = isLoading
        ? (loadingAction === 'file' ? 'Analisando receita...' : 'Processando sua solicitação...')
        : disabled
            ? disabledReason
            : "Cole uma imagem ou digite uma mensagem...";

    return (
        <div className="mx-auto w-full max-w-4xl">
            <div className="flex items-center gap-2 rounded-xl bg-[#303134] p-2">
                <button
                    onClick={onAttachClick}
                    className="flex h-10 w-10 items-center justify-center rounded-full p-2 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading || disabled}
                    aria-label="Anexar arquivo"
                    title={disabled ? disabledReason : "Anexar arquivo"}
                >
                    {isLoading && loadingAction === 'file' ? (
                        <Loader />
                    ) : (
                        <PlusIcon className="h-6 w-6 text-gray-400" />
                    )}
                </button>
                <input
                    type="text"
                    value={text}
                    onChange={onTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-grow bg-transparent px-2 text-sm text-gray-200 placeholder-gray-400 focus:outline-none"
                    disabled={isLoading || disabled}
                />
                <button
                    onClick={onSend}
                    disabled={!text.trim() || isLoading || disabled}
                    className="rounded-full p-2 transition-colors bg-gray-700 hover:bg-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
                    aria-label="Enviar mensagem"
                >
                    <SendIcon className="h-5 w-5 text-white" />
                </button>
            </div>
        </div>
    );
};

// Keep original code below for context
import { jsPDF } from 'jspdf';
import { useSettings } from '../hooks/useSettings.ts';
import { useReminders } from '../hooks/useReminders.ts';
import type { ChatMessage, QuoteResult, MessageContent } from '../types.ts';
import { AlertTriangleIcon, ClipboardCheckIcon, ClipboardIcon, DownloadIcon, UserIcon, BellIcon, CalendarIcon } from './icons.tsx';
import { ReminderModal } from './Reminders.tsx';
import { TypingIndicator } from './TypingIndicator.tsx';
import { ProductSearch } from './ProductSearch.tsx';
import { UserSearch } from './UserSearch.tsx';
import { Modal } from './Modal.tsx';

const AIAvatar: React.FC = () => (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-fuchsia-900 self-end">
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
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-600 self-end">
        <UserIcon className="h-5 w-5 text-gray-300" />
    </div>
);

const ScheduleModal: React.FC<{
    quoteId: string;
    patientName: string;
    onClose: () => void;
}> = ({ quoteId, patientName, onClose }) => {
    const { addReminder } = useReminders();
    const [scheduleDate, setScheduleDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const offset = tomorrow.getTimezoneOffset();
        const localDate = new Date(tomorrow.getTime() - (offset * 60 * 1000));
        setScheduleDate(localDate.toISOString().slice(0, 16));
    }, []);

    const handleSchedule = async () => {
        if (!scheduleDate) {
            setError('Por favor, selecione uma data e hora.');
            return;
        }
        setError('');
        setIsSaving(true);

        try {
            await addReminder({
                quoteId,
                patientName: `Consulta Agendada: ${patientName}`,
                dueDate: new Date(scheduleDate).toISOString(),
                notes: `Agendamento de consulta de acompanhamento para ${patientName} com base na receita analisada.`,
                tasks: [{ id: crypto.randomUUID(), text: 'Realizar consulta de acompanhamento.', isCompleted: false, icon: 'patient' }],
                recurrence: 'none',
                priority: 'high',
            });
            onClose();
        } catch (err) {
            console.error("Failed to schedule appointment:", err);
            setError('Falha ao salvar o agendamento. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const minDateTime = now.toISOString().slice(0, 16);

    return (
        <Modal
            title="Agendar Consulta"
            onClose={onClose}
            icon={<CalendarIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors">Cancelar</button>
                    <button
                        type="button"
                        onClick={handleSchedule}
                        disabled={isSaving}
                        className="flex items-center justify-center min-w-[160px] px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isSaving ? <Loader /> : 'Salvar Agendamento'}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-400 -mt-2">Para: {patientName}</p>
                <div>
                    <label htmlFor="scheduleDate" className="block text-sm font-medium text-gray-300 mb-2">Data e Hora da Consulta</label>
                    <input
                        type="datetime-local"
                        id="scheduleDate"
                        value={scheduleDate}
                        min={minDateTime}
                        onChange={e => setScheduleDate(e.target.value)}
                        className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition"
                        required
                    />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
        </Modal>
    );
};


interface QuoteResultDisplayProps {
    result: QuoteResult;
}

const QuoteResultDisplay: React.FC<QuoteResultDisplayProps> = ({ result }) => {
    const [copied, setCopied] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const { settings } = useSettings();

    const lowerValidity = result.validity.toLowerCase();
    const isExpired = lowerValidity.includes('vencida');
    const isUndetermined = lowerValidity.includes('não determinada');

    let validityClassName = 'text-green-400';
    if (isExpired) validityClassName = 'text-red-300 font-bold';
    if (isUndetermined) validityClassName = 'text-yellow-300';

    let warningMessage = null;
    if (isExpired) {
        warningMessage = `Atenção: Esta receita venceu. O orçamento foi gerado para referência, mas a venda não pode ser concluída.`;
    } else if (isUndetermined) {
        warningMessage = 'Atenção: A data de emissão da receita não foi encontrada. A validade não pôde ser confirmada. Verifique manualmente antes de prosseguir.';
    }


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

        const patientName = result.patientName || 'Paciente';
        const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const fileName = `orcamento-${patientName.replace(/\s+/g, '_')}-${today}.pdf`;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        const title = `Orçamento - ${settings.associationName || 'Associação'}`;
        doc.text(title, pageWidth / 2, y, { align: 'center' });
        y += 15;

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
            if (y > 260) { doc.addPage(); y = 20; }
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
        y += 5;
        if (y > 280) { doc.addPage(); y = 20; }

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

    const ReadOnlyField: React.FC<{label: string, value: React.ReactNode, valueClassName?: string}> = ({ label, value, valueClassName }) => (
        <div>
            <p className="text-gray-400 text-xs font-semibold">{label}</p>
            <div className={`text-gray-200 mt-1 ${valueClassName}`}>{value}</div>
        </div>
    );


    return (
        <>
            {isReminderModalOpen && (
                <ReminderModal 
                    quoteId={result.id}
                    patientName={result.patientName}
                    onClose={() => setIsReminderModalOpen(false)}
                />
            )}
            {isScheduleModalOpen && (
                <ScheduleModal
                    quoteId={result.id}
                    patientName={result.patientName}
                    onClose={() => setIsScheduleModalOpen(false)}
                />
            )}
            <div className="mt-2 w-full space-y-4 text-sm">
                 {warningMessage && (
                    <div className="p-3 mb-2 bg-yellow-900/40 rounded-lg border border-yellow-700/50 flex items-start gap-3">
                        <AlertTriangleIcon className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-yellow-200">Atenção à Validade da Receita</p>
                            <p className="text-yellow-300 text-xs mt-1">{warningMessage}</p>
                        </div>
                    </div>
                )}
                <div>
                    <h3 className="font-semibold text-fuchsia-300 mb-2">Resumo Interno para a Equipe</h3>
                    <div className="p-4 bg-[#202124] rounded-lg border border-gray-700 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReadOnlyField label="Paciente" value={result.patientName} />
                            <ReadOnlyField label="Validade da Receita" value={result.validity} valueClassName={validityClassName}/>
                        </div>

                        <ReadOnlyField label="Resumo para Equipe" value={result.internalSummary} />
                       
                        {result.observations && (
                            <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-800/50">
                               <p className="text-yellow-300 font-semibold mb-1">⚠️ Observações da IA</p>
                               <p className="text-yellow-300 whitespace-pre-wrap">{result.observations}</p>
                           </div>
                        )}
                        {result.medicalHistory && <ReadOnlyField label="Histórico Médico Relevante" value={<p className="whitespace-pre-wrap">{result.medicalHistory}</p>} />}
                        {result.doctorNotes && <ReadOnlyField label="Notas do Médico" value={<p className="whitespace-pre-wrap">{result.doctorNotes}</p>} />}
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="font-semibold text-fuchsia-300">Mensagem Pronta para o Paciente</h3>
                        <button onClick={handleCopy} className="p-1.5 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors" aria-label="Copiar mensagem para o paciente">
                            {copied ? <ClipboardCheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                        </button>
                    </div>
                    <textarea readOnly value={result.patientMessage} rows={15} className="w-full bg-[#202124] rounded-lg border border-gray-700 p-3 whitespace-pre-wrap font-sans focus:outline-none focus:ring-1 focus:ring-fuchsia-500 transition-colors" />
                </div>
                 <div className="flex flex-col items-end gap-3 pt-2">
                     <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            disabled={isExpired}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-700/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Agendar uma consulta com base na receita"
                            title="Agendar Consulta"
                        >
                            <CalendarIcon className="w-4 h-4" />
                            Agendar
                        </button>
                         <button
                            onClick={() => setIsReminderModalOpen(true)}
                            disabled={isExpired}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-700/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Criar um lembrete para este orçamento"
                            title="Criar Lembrete"
                        >
                            <BellIcon className="w-4 h-4" />
                            Lembrete
                        </button>
                        <button 
                            onClick={handleDownloadPDF}
                            disabled={isExpired}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-sm text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Baixar orçamento como PDF"
                            title="Baixar PDF"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            PDF
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

interface MessageBubbleProps {
    message: ChatMessage;
    onAction: (messageId: string, payload: string) => void;
    processingAction: { messageId: string; payload: string; text?: string } | null;
    onOpenFilePreview: (file: { url: string; type: string; name: string }) => void;
}


const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onAction, processingAction, onOpenFilePreview }) => {
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
                return (
                    <p className="text-gray-300">
                      Arquivo enviado:{" "}
                      <button
                        onClick={() => onOpenFilePreview({ url: content.fileURL, type: content.fileType, name: content.fileName })}
                        className="font-medium text-fuchsia-300 hover:text-fuchsia-200 underline focus:outline-none focus:ring-2 focus:ring-fuchsia-400 rounded"
                        aria-label={`Visualizar arquivo ${content.fileName}`}
                      >
                        {content.fileName}
                      </button>
                    </p>
                );
            case 'loading': {
                return <TypingIndicator />;
            }
            case 'quote':
                return <QuoteResultDisplay 
                    result={content.result} 
                />;
            case 'user_search':
                return <UserSearch />;
            case 'product_search':
                return <ProductSearch />;
            case 'error':
                 return (
                    <div className="flex items-start gap-3 p-3 bg-red-900/20 rounded-lg border border-red-700/50">
                        <AlertTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-300">{content.message}</p>
                    </div>
                 );
            case 'actions':
                const isThisGroupProcessing = processingAction?.messageId === message.id;
                const thinkingText = isThisGroupProcessing ? processingAction.text : null;
                return (
                    <div>
                        {content.text && <p className="whitespace-pre-wrap mb-3">{content.text}</p>}
                        
                        {thinkingText && (
                            <div className="flex items-center gap-2 text-sm text-fuchsia-300 mb-3 transition-opacity duration-300 ease-in-out">
                                <TypingIndicator />
                                <span className="italic">{thinkingText}</span>
                            </div>
                        )}

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
                                                ? 'bg-fuchsia-900'
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

    const formattedTime = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className={`flex items-start gap-3 ${!isAI ? 'justify-end' : ''}`}>
            {isAI && <AIAvatar />}
            <div className={`flex flex-col gap-1 max-w-xl ${isAI ? 'items-start' : 'items-end'}`}>
                <div className={`group relative rounded-2xl px-4 py-3 shadow-md ${
                    isAI 
                    ? 'bg-[#303134] rounded-bl-none' 
                    : 'bg-brand-primary text-white rounded-br-none'
                }`}>
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
                         <p className="whitespace-pre-wrap pr-4">{renderContent(message.content)}</p>
                    ) : (
                        <div className={canBeCopied ? 'pr-8' : ''}>
                            {renderContent(message.content)}
                        </div>
                    )}
                </div>
                <time dateTime={message.timestamp} className="text-xs text-gray-500 px-2">
                    {formattedTime}
                </time>
            </div>
            {!isAI && <UserAvatar />}
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
    processingAction: { messageId: string; payload: string; text?: string } | null;
    onOpenFilePreview: (file: { url: string; type: string; name: string }) => void;
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
    onOpenFilePreview,
}) => {
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const [text, setText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
        return () => clearTimeout(timer);
    }, [messages]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            onSend({ text: '', file: selectedFile });
        }
        // Reset the input value to allow selecting the same file again
        if (e.target) e.target.value = '';
    };

    const handleSendInternal = () => {
        if (!text.trim() || isLoading || disabled) return;
        onSend({ text, file: null });
        setText('');
    };
    
    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (disabled || isLoading) return;

        const items = event.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
                const imageFile = items[i].getAsFile();
                if (imageFile) {
                    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
                    const fileExtension = imageFile.type.split('/')[1] || 'png';
                    const newFileName = `Pasted_Image_${timestamp}.${fileExtension}`;
                    const renamedFile = new File([imageFile], newFileName, { type: imageFile.type });

                    onSend({ text: '', file: renamedFile });
                    event.preventDefault();
                    return;
                }
            }
        }
    };
    
    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <div className="flex-grow space-y-6 overflow-y-auto p-4 md:p-6" onPaste={handlePaste}>
                 <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isLoading || disabled}
                />
                 {messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        onAction={onAction} 
                        processingAction={processingAction} 
                        onOpenFilePreview={onOpenFilePreview}
                    />
                ))}
                <div ref={chatEndRef} />
            </div>
            
            <div className="flex-shrink-0 border-t border-gray-700/50 bg-[#131314] p-4">
                <ChatInput 
                    text={text}
                    onTextChange={handleTextChange}
                    onAttachClick={handleAttachClick}
                    onSend={handleSendInternal}
                    isLoading={isLoading}
                    disabled={disabled} 
                    disabledReason={disabledReason}
                    loadingAction={loadingAction}
                />
            </div>
        </>
    );
};
