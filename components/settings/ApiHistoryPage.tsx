

import React, { useState } from 'react';
import { useApiHistory } from '../../hooks/useApiHistory.ts';
import type { ApiCall } from '../../services/apiHistoryService.ts';
import { 
    ClockIcon, CheckCircleIcon, AlertCircleIcon, FileTextIcon, 
    SendIcon, Trash2Icon, DownloadIcon, GaugeCircleIcon,
    FileCodeIcon, ClipboardIcon, ClipboardCheckIcon, ChevronDownIcon
} from '../icons.tsx';
import { useModal } from '../../hooks/useModal.ts';
import { useTokenUsage } from '../../hooks/useTokenUsage.ts';
import { Modal } from '../Modal.tsx';
import { jsPDF } from 'jspdf';


const HistoryItem: React.FC<{ item: ApiCall }> = ({ item }) => {
    const isSuccess = item.status === 'success';
    const isFile = item.type === 'prescription_analysis';
    const timestamp = new Date(item.timestamp);
    const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(timestamp);

    return (
        <div className={`p-4 bg-[#303134]/50 border-l-4 rounded-r-lg transition-colors hover:bg-[#303134]
            ${isSuccess ? 'border-green-500' : 'border-red-500'}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                    {isSuccess 
                        ? <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                        : <AlertCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                    }
                    <div>
                        <div className="flex items-center gap-2">
                            {isFile 
                                ? <FileTextIcon className="w-4 h-4 text-gray-400" />
                                : <SendIcon className="w-4 h-4 text-gray-400" />
                            }
                            <p className="font-semibold text-white">
                                {isFile ? 'Análise de Receita' : 'Consulta de Texto'}
                            </p>
                        </div>
                        <p className="text-sm text-gray-300 mt-1 truncate" title={item.details}>
                            {item.details}
                        </p>
                        {!isSuccess && item.error && (
                            <div className="mt-2 p-2 bg-red-900/30 rounded text-xs text-red-300 border border-red-700/50">
                                <p className="font-mono">{item.error}</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-gray-500">{formattedDate}</p>
                    {item.tokenCount !== undefined && isSuccess && (
                         <p className="text-xs text-fuchsia-300 font-mono mt-1">{item.tokenCount} tokens</p>
                    )}
                </div>
            </div>
        </div>
    );
};

interface JsonPreviewModalProps {
    jsonContent: string;
    onClose: () => void;
}

const JsonPreviewModal: React.FC<JsonPreviewModalProps> = ({ jsonContent, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.setAttribute('download', `historico-api-sativar-${today}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Modal
            title="Exportar Histórico para JSON"
            onClose={onClose}
            size="lg"
            icon={<FileCodeIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={
                <>
                    <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-sm text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors">
                        {copied ? <ClipboardCheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                        <DownloadIcon className="w-4 h-4" />
                        Baixar Arquivo
                    </button>
                </>
            }
        >
            <p className="text-sm text-gray-400 mb-4">Abaixo está o conteúdo completo do histórico de chamadas em formato JSON.</p>
            <pre className="text-xs bg-[#131314] p-4 rounded-lg max-h-80 overflow-auto border border-gray-600">
                <code>
                    {jsonContent}
                </code>
            </pre>
        </Modal>
    );
};


export const ApiHistoryPage: React.FC = () => {
    const { history, clearHistory } = useApiHistory();
    const { totalTokensUsed, resetTokens } = useTokenUsage();
    const modal = useModal();
    const [showJsonPreview, setShowJsonPreview] = useState(false);
    const [jsonContent, setJsonContent] = useState('');

    const handleClearHistory = async () => {
        const confirmed = await modal.confirm({
            title: 'Limpar Histórico',
            message: 'Tem certeza de que deseja limpar todo o histórico de chamadas da API? Esta ação não pode ser desfeita.',
            confirmLabel: 'Limpar Tudo',
            danger: true
        });

        if (confirmed) {
            clearHistory();
        }
    };
    
    const handleExportCsv = () => {
        if (history.length === 0) return;

        const escapeCsvField = (field: string | undefined | null | number): string => {
            if (field === null || field === undefined) {
                return '';
            }
            const stringField = String(field);
            if (/[",\n\r]/.test(stringField)) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        const headers = ['ID', 'Timestamp', 'Tipo', 'Status', 'Detalhes', 'Tokens', 'Erro'];
        const csvRows = history.map(item =>
            [
                escapeCsvField(item.id),
                escapeCsvField(item.timestamp),
                escapeCsvField(item.type),
                escapeCsvField(item.status),
                escapeCsvField(item.details),
                escapeCsvField(item.tokenCount),
                escapeCsvField(item.error),
            ].join(',')
        );

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        
        link.href = url;
        link.setAttribute('download', `historico-api-sativar-${today}.csv`);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportJson = () => {
        if (history.length === 0) return;
        const jsonString = JSON.stringify(history, null, 2);
        setJsonContent(jsonString);
        setShowJsonPreview(true);
    };

    const handleExportPdf = () => {
        if (history.length === 0) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const maxLineWidth = pageWidth - margin * 2;
        let y = 20;

        const addText = (text: string | string[], x: number, yPos: number, options = {}) => {
            doc.text(text, x, yPos, options);
            if (Array.isArray(text)) {
                return yPos + (text.length * 4);
            }
            return yPos + 4;
        };
        
        const checkPageBreak = (yPos: number) => {
            if (yPos > 270) {
                doc.addPage();
                return 20;
            }
            return yPos;
        };
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('Histórico de Chamadas da API Gemini', pageWidth / 2, y, { align: 'center' });
        y += 15;

        history.forEach((item, index) => {
            y = checkPageBreak(y);
            doc.setDrawColor(50, 50, 50);
            doc.line(margin, y - 5, pageWidth - margin, y - 5);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(item.status === 'success' ? '#4ade80' : '#f87171');
            y = addText(`${item.status === 'success' ? 'SUCESSO' : 'ERRO'} - ${item.type === 'prescription_analysis' ? 'Análise de Receita' : 'Consulta de Texto'}`, margin, y);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            y = addText(new Date(item.timestamp).toLocaleString('pt-BR'), margin, y);
            y += 2;

            doc.setFontSize(10);
            doc.setTextColor(200, 200, 200);

            let detailLines = doc.splitTextToSize(`Detalhes: ${item.details}`, maxLineWidth);
            y = addText(detailLines, margin, y);
            
            if (item.tokenCount) {
                y = addText(`Tokens: ${item.tokenCount}`, margin, y);
            }

            if (item.error) {
                y += 2;
                doc.setFont('courier', 'normal');
                doc.setTextColor(239, 68, 68); // Red-500
                let errorLines = doc.splitTextToSize(`Erro: ${item.error}`, maxLineWidth);
                y = addText(errorLines, margin, y);
            }
            
            y += 8;
        });

        const today = new Date().toISOString().slice(0, 10);
        doc.save(`historico-api-sativar-${today}.pdf`);
    };

    return (
        <>
        {showJsonPreview && <JsonPreviewModal jsonContent={jsonContent} onClose={() => setShowJsonPreview(false)} />}
        <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <ClockIcon className="w-8 h-8 text-fuchsia-300" />
                        <h2 className="text-2xl font-bold text-white">Log de Chamadas da API Gemini</h2>
                    </div>
                    <p className="text-gray-400">
                        Histórico das últimas 100 chamadas feitas à API, útil para monitoramento e depuração.
                    </p>
                </div>
                {history.length > 0 && (
                     <div className="flex items-center gap-2 flex-shrink-0">
                         <div className="relative group">
                            <button
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Exportar
                                <ChevronDownIcon className="w-4 h-4" />
                            </button>
                             <div className="absolute top-full right-0 mt-2 w-48 bg-[#303134] border border-gray-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 p-1">
                                <button onClick={handleExportCsv} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded hover:bg-gray-700/50">
                                    <FileTextIcon className="w-4 h-4" /> Exportar CSV
                                </button>
                                <button onClick={handleExportJson} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded hover:bg-gray-700/50">
                                    <FileCodeIcon className="w-4 h-4" /> Exportar JSON
                                </button>
                                <button onClick={handleExportPdf} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-300 rounded hover:bg-gray-700/50">
                                    <FileTextIcon className="w-4 h-4" /> Exportar PDF
                                </button>
                            </div>
                        </div>
                         <button 
                            onClick={handleClearHistory}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-800 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors"
                        >
                            <Trash2Icon className="w-4 h-4" />
                            Limpar
                        </button>
                    </div>
                )}
            </div>
            
             <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <GaugeCircleIcon className="w-6 h-6 text-fuchsia-300"/>
                    <h3 className="text-lg font-semibold text-fuchsia-300">Uso de Tokens da API Gemini</h3>
                </div>
                <p className="text-sm text-gray-400 -mt-3">
                    Monitore o número de tokens consumidos pela API. O contador é salvo localmente e pode ser zerado para iniciar um novo ciclo de faturamento.
                </p>
                <div className="flex items-center justify-between p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                    <div>
                        <p className="text-sm text-gray-400">Tokens consumidos neste ciclo</p>
                        <p className="text-3xl font-bold text-white">{totalTokensUsed.toLocaleString('pt-BR')}</p>
                    </div>
                    <button 
                        type="button"
                        onClick={resetTokens}
                        className="px-4 py-2 bg-yellow-700/80 text-sm text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                        Zerar Contador
                    </button>
                </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {history.length > 0 ? (
                    history.map(item => <HistoryItem key={item.id} item={item} />)
                ) : (
                     <div className="flex flex-col items-center justify-center gap-4 text-gray-500 py-20 rounded-lg border-2 border-dashed border-gray-700">
                        <ClockIcon className="w-12 h-12" />
                        <p className="text-lg font-semibold text-gray-400">Nenhuma chamada à API registrada.</p>
                        <p className="text-sm">O histórico aparecerá aqui assim que você interagir com a Ísis.</p>
                    </div>
                )}
            </div>
        </div>
        </>
    );
};