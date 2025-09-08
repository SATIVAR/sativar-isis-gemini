

import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useSettings } from '../hooks/useSettings.ts';
import type { ChatMessage, QuoteResult, MessageContent, SativarUser, QuotedProduct } from '../types.ts';
import { AlertTriangleIcon, ClipboardCheckIcon, ClipboardIcon, DownloadIcon, PlusIcon, SendIcon, UserIcon, BellIcon, RefreshCwIcon, CheckIcon, Trash2Icon } from './icons.tsx';
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

const UserResultDisplay: React.FC<{ users: SativarUser[], searchTerm: string }> = ({ users, searchTerm }) => {
    if (users.length === 0) {
        return (
            <div className="mt-2 w-full text-sm text-gray-300">
                <p>Nenhum associado encontrado para "<strong>{searchTerm}</strong>".</p>
            </div>
        );
    }

    return (
        <div className="mt-2 w-full space-y-3 text-sm">
            <p className="text-gray-300">
                {users.length === 1 
                    ? <>Encontrei 1 resultado para "<strong>{searchTerm}</strong>":</>
                    : <>Encontrei {users.length} resultados para "<strong>{searchTerm}</strong>":</>
                }
            </p>
            {users.map(user => (
                <div key={user.id} className="p-4 bg-[#202124] rounded-lg border border-gray-700 space-y-2">
                    <p className="font-semibold text-white">{user.display_name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-gray-300">
                        <p className="truncate"><span className="text-gray-400">EMAIL:</span> {user.email || 'N/A'}</p>
                        <p><span className="text-gray-400">CPF:</span> {user.acf_fields?.cpf || 'N/A'}</p>
                        <p><span className="text-gray-400">TEL:</span> {user.acf_fields?.telefone || 'N/A'}</p>
                         {user.acf_fields?.nome_completo_responc && (
                            <p className="truncate"><span className="text-gray-400">RESP:</span> {user.acf_fields.nome_completo_responc} ({user.acf_fields.cpf_responsavel || 'CPF N/A'})</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

interface QuoteResultDisplayProps {
    result: QuoteResult;
    onResetChat: () => void;
    onUpdate: (updatedResult: QuoteResult) => void;
}

const QuoteResultDisplay: React.FC<QuoteResultDisplayProps> = ({ result, onResetChat, onUpdate }) => {
    const [copied, setCopied] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const { settings } = useSettings();

    const [editedResult, setEditedResult] = useState<QuoteResult>(result);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setEditedResult(result);
    }, [result]);

    const isExpired = editedResult.validity.toLowerCase().includes('vencida');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedResult(prev => ({ ...prev, [name]: value }));
    };

    const handleProductChange = (index: number, field: keyof QuotedProduct, value: string) => {
        const newProducts = [...editedResult.products];
        (newProducts[index] as any)[field] = value;
        setEditedResult(prev => ({ ...prev, products: newProducts }));
    };
    
    const handleAddProduct = () => {
        const newProduct: QuotedProduct = {
            name: 'Novo Produto',
            quantity: '1',
            concentration: '',
            status: 'OK',
            suggestionNotes: ''
        };
        setEditedResult(prev => ({
            ...prev,
            products: [...prev.products, newProduct]
        }));
    };

    const handleRemoveProduct = (index: number) => {
        if (confirm('Tem certeza que deseja remover este produto?')) {
            setEditedResult(prev => ({
                ...prev,
                products: prev.products.filter((_, i) => i !== index)
            }));
        }
    };

    const handleSave = () => {
        setIsSaving(true);
        onUpdate(editedResult);
        setTimeout(() => {
            setIsSaving(false);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        }, 300);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(editedResult.patientMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const maxLineWidth = pageWidth - margin * 2;
        let y = 20;

        const patientName = editedResult.patientName || 'Paciente';
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
        const internalLines = doc.splitTextToSize(editedResult.internalSummary, maxLineWidth);
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

        addPdfSection('Histórico Médico Relevante', editedResult.medicalHistory);
        addPdfSection('Notas do Médico', editedResult.doctorNotes);
        y += 5;
        if (y > 280) { doc.addPage(); y = 20; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Mensagem para o Paciente', margin, y);
        y += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const patientLines = doc.splitTextToSize(editedResult.patientMessage, maxLineWidth);
        doc.text(patientLines, margin, y);

        doc.save(fileName);
    };

    const inputClass = "bg-[#202124] w-full text-gray-200 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 rounded px-2 py-1 border border-transparent focus:border-fuchsia-500 transition-colors";
    const textareaClass = `${inputClass} resize-y min-h-[60px]`;
    const labelClass = "text-gray-400 shrink-0 text-xs font-semibold";
    const fieldWrapperClass = "flex flex-col gap-1";

    return (
        <>
            {isReminderModalOpen && (
                <ReminderModal 
                    quoteId={editedResult.id}
                    patientName={editedResult.patientName}
                    onClose={() => setIsReminderModalOpen(false)}
                />
            )}
            <div className="mt-2 w-full space-y-4 text-sm">
                <div>
                    <h3 className="font-semibold text-fuchsia-300 mb-2">Resumo Interno (Editável)</h3>
                    <div className="p-4 bg-[#202124] rounded-lg border border-gray-700 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className={fieldWrapperClass}>
                               <label htmlFor="patientName" className={labelClass}>Paciente:</label>
                               <input id="patientName" name="patientName" type="text" value={editedResult.patientName} onChange={handleInputChange} className={inputClass} />
                           </div>
                           <div className={fieldWrapperClass}>
                               <label htmlFor="validity" className={labelClass}>Validade da Receita:</label>
                               <input id="validity" name="validity" type="text" value={editedResult.validity} onChange={handleInputChange} className={`${inputClass} ${isExpired ? 'text-red-300' : 'text-green-400'}`} />
                           </div>
                        </div>

                        <div className="pt-2">
                             <h4 className="text-sm font-semibold text-gray-400 mb-2">Produtos Solicitados</h4>
                             <div className="space-y-3">
                                {editedResult.products.map((p, i) => (
                                    <div key={i} className="p-3 bg-[#303134]/50 rounded-lg border border-gray-600/50 relative group">
                                         <button onClick={() => handleRemoveProduct(i)} className="absolute top-2 right-2 p-1 rounded-full text-gray-500 hover:text-red-400 hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-all" aria-label="Remover produto"><Trash2Icon className="w-4 h-4" /></button>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className={`${fieldWrapperClass} col-span-2`}>
                                                <label htmlFor={`p_name_${i}`} className={labelClass}>Nome</label>
                                                <input id={`p_name_${i}`} value={p.name} onChange={(e) => handleProductChange(i, 'name', e.target.value)} className={inputClass} />
                                            </div>
                                            <div className={fieldWrapperClass}>
                                                <label htmlFor={`p_qty_${i}`} className={labelClass}>Qtd.</label>
                                                <input id={`p_qty_${i}`} value={p.quantity} onChange={(e) => handleProductChange(i, 'quantity', e.target.value)} className={inputClass} />
                                            </div>
                                            <div className={fieldWrapperClass}>
                                                <label htmlFor={`p_conc_${i}`} className={labelClass}>Concentração</label>
                                                <input id={`p_conc_${i}`} value={p.concentration} onChange={(e) => handleProductChange(i, 'concentration', e.target.value)} className={inputClass} />
                                            </div>
                                            <div className={`${fieldWrapperClass} col-span-2`}>
                                                <label htmlFor={`p_status_${i}`} className={labelClass}>Status</label>
                                                <select id={`p_status_${i}`} value={p.status} onChange={(e) => handleProductChange(i, 'status', e.target.value)} className={`${inputClass} ${p.status.toLowerCase().includes('alerta') ? 'text-yellow-300' : ''}`}>
                                                    <option value="OK">OK</option>
                                                    <option value="Alerta: Sugestão de alternativa">Alerta: Sugestão de alternativa</option>
                                                    <option value="Alerta: Produto não encontrado no catálogo">Alerta: Produto não encontrado no catálogo</option>
                                                </select>
                                            </div>
                                             <div className={`${fieldWrapperClass} col-span-2`}>
                                                <label htmlFor={`p_notes_${i}`} className={labelClass}>Nota de Sugestão (Interna)</label>
                                                <input id={`p_notes_${i}`} value={p.suggestionNotes || ''} onChange={(e) => handleProductChange(i, 'suggestionNotes', e.target.value)} className={inputClass} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                             <button onClick={handleAddProduct} className="mt-3 flex items-center gap-2 text-xs text-fuchsia-300 hover:text-fuchsia-200 font-semibold"><PlusIcon className="w-4 h-4"/> Adicionar Produto</button>
                        </div>
                        
                         <div className={fieldWrapperClass}>
                           <label htmlFor="totalValue" className={labelClass}>Subtotal (R$)</label>
                           <input id="totalValue" name="totalValue" type="text" value={editedResult.totalValue} onChange={handleInputChange} className={`${inputClass} font-semibold`} />
                       </div>

                       <div className={fieldWrapperClass}>
                           <label htmlFor="internalSummary" className={labelClass}>Resumo para Equipe</label>
                           <textarea id="internalSummary" name="internalSummary" value={editedResult.internalSummary} onChange={handleInputChange} className={textareaClass} />
                       </div>
                       
                        {editedResult.observations && (
                            <div className={fieldWrapperClass}>
                               <label htmlFor="observations" className={labelClass}>Observações da IA</label>
                               <textarea id="observations" name="observations" value={editedResult.observations} onChange={handleInputChange} className={`${textareaClass} text-yellow-300 bg-yellow-900/20`} />
                           </div>
                        )}
                        <div className={fieldWrapperClass}>
                           <label htmlFor="medicalHistory" className={labelClass}>Histórico Médico Relevante</label>
                           <textarea id="medicalHistory" name="medicalHistory" value={editedResult.medicalHistory || ''} onChange={handleInputChange} className={textareaClass} />
                       </div>
                       <div className={fieldWrapperClass}>
                           <label htmlFor="doctorNotes" className={labelClass}>Notas do Médico</label>
                           <textarea id="doctorNotes" name="doctorNotes" value={editedResult.doctorNotes || ''} onChange={handleInputChange} className={textareaClass} />
                       </div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="font-semibold text-fuchsia-300">Mensagem Pronta para o Paciente</h3>
                        <button onClick={handleCopy} className="p-1.5 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors" aria-label="Copiar mensagem para o paciente">
                            {copied ? <ClipboardCheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-400" />}
                        </button>
                    </div>
                    <textarea name="patientMessage" value={editedResult.patientMessage} onChange={handleInputChange} rows={12} className="w-full bg-[#202124] rounded-lg border border-gray-700 p-3 whitespace-pre-wrap font-sans focus:outline-none focus:ring-1 focus:ring-fuchsia-500 transition-colors" />
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
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition-colors w-40
                                ${isSaved ? 'bg-green-600 text-white' : 'bg-fuchsia-700 text-white hover:bg-fuchsia-600 disabled:opacity-70'}`}
                        >
                            {isSaving ? <Loader /> : isSaved ? <><CheckIcon className="w-4 h-4" /> Salvo!</> : 'Salvar Ajustes'}
                        </button>
                        <button 
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-sm text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors"
                            aria-label="Baixar orçamento como PDF"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Baixar PDF
                        </button>
                    </div>
                </div>
                 <div className="flex justify-end pt-2">
                     <button
                        onClick={onResetChat}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors"
                        aria-label="Analisar nova receita"
                    >
                        <RefreshCwIcon className="w-4 h-4" />
                        Analisar Nova Receita
                    </button>
                </div>
            </div>
        </>
    );
};

interface MessageBubbleProps {
    message: ChatMessage;
    onAction: (messageId: string, payload: string) => void;
    processingAction: { messageId: string; payload: string } | null;
    loadingAction: 'file' | 'text' | null;
    onResetChat: () => void;
    onUpdateQuote: (messageId: string, updatedQuote: QuoteResult) => void;
}


const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onAction, processingAction, loadingAction, onResetChat, onUpdateQuote }) => {
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
                return <QuoteResultDisplay 
                    result={content.result} 
                    onResetChat={onResetChat} 
                    onUpdate={(updatedResult) => onUpdateQuote(message.id, updatedResult)} 
                />;
            case 'user_result':
                return <UserResultDisplay users={content.users} searchTerm={content.searchTerm} />;
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
    onUpdateQuote: (messageId: string, updatedQuote: QuoteResult) => void;
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
    onUpdateQuote,
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
                        onUpdateQuote={onUpdateQuote}
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
