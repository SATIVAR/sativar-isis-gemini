import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '../Modal.tsx';
import { useSettings } from '../../hooks/useSettings.ts';
import { useModal } from '../../hooks/useModal.ts';
import type { Associate } from '../../types.ts';
import { UsersIcon, UploadCloudIcon, FileTextIcon, AlertCircleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';
import { apiClient } from '../../services/database/apiClient.ts';

// Declare the image compression library which is loaded from a script tag in index.html
declare const imageCompression: any;

// A helper for file input UI
const FileInput: React.FC<{
    label: string;
    file: File | null;
    onFileChange: (file: File | null) => void;
    accept: string;
    maxSizeMB: number;
    autoCompress: boolean;
}> = ({ label, file, onFileChange, accept, maxSizeMB, autoCompress }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const modal = useModal();

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const validateAndSetFile = async (selectedFile: File | null) => {
        if (!selectedFile) {
            onFileChange(null);
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        const fileSizeMB = selectedFile.size / 1024 / 1024;

        if (fileSizeMB <= maxSizeMB) {
            onFileChange(selectedFile);
            return;
        }

        if (autoCompress && selectedFile.type.startsWith('image/')) {
            setIsCompressing(true);
            try {
                const options = { maxSizeMB: maxSizeMB, useWebWorker: true };
                const compressedFile = await imageCompression(selectedFile, options);
                const compressedSizeMB = compressedFile.size / 1024 / 1024;

                modal.alert({
                    title: 'Imagem Otimizada',
                    message: `A imagem "${selectedFile.name}" era muito grande (${fileSizeMB.toFixed(2)} MB) e foi otimizada com sucesso para ${compressedSizeMB.toFixed(2)} MB.`
                });
                onFileChange(compressedFile);
            } catch (error) {
                console.error('Erro na compressão da imagem:', error);
                modal.alert({
                    title: 'Falha na Otimização',
                    message: `Não foi possível otimizar a imagem "${selectedFile.name}". Por favor, tente comprimi-la manualmente ou use uma imagem menor.`
                });
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = '';
            } finally {
                setIsCompressing(false);
            }
            return;
        }
        
        modal.alert({
            title: 'Arquivo Muito Grande',
            message: `O arquivo "${selectedFile.name}" (${fileSizeMB.toFixed(2)} MB) excede o tamanho máximo permitido de ${maxSizeMB} MB.`
        });
        onFileChange(null);
        if (inputRef.current) inputRef.current.value = '';
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        validateAndSetFile(e.target.files?.[0] || null);
    };
    
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const droppedFile = e.dataTransfer.files?.[0] || null;
        if (droppedFile) {
            validateAndSetFile(droppedFile);
        }
    };

    const handleRemoveFile = () => {
        onFileChange(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const borderClass = isDraggingOver 
        ? 'border-fuchsia-500' 
        : file 
        ? 'border-green-500' 
        : 'border-gray-600/50 hover:border-fuchsia-500';

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <div 
                className={`relative flex items-center justify-center w-full h-24 px-4 py-2 bg-[#202124] border-2 border-dashed rounded-lg transition-colors ${borderClass}`}
                onClick={() => !isCompressing && inputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={handleFileSelect} disabled={isCompressing} />
                
                {isCompressing ? (
                    <div className="text-center text-fuchsia-300 cursor-wait">
                        <div className="flex justify-center mb-2"><Loader /></div>
                        <p className="text-xs italic">Otimizando imagem...</p>
                    </div>
                ) : !file ? (
                    <div className="text-center text-gray-400 cursor-pointer">
                        <UploadCloudIcon className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-xs font-semibold">Clique para selecionar ou arraste o arquivo</p>
                        <p className="text-xs text-gray-500 mt-1">Tam. máx: {maxSizeMB}MB</p>
                    </div>
                ) : (
                    <div className="text-center text-white">
                        <FileTextIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm font-medium truncate max-w-full px-2" title={file.name}>{file.name}</p>
                        <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                    </div>
                )}
            </div>
            {file && (
                <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="mt-2 text-xs text-red-400 hover:underline"
                >
                    Remover arquivo
                </button>
            )}
        </div>
    );
};


export const AssociateDocumentsModal: React.FC<{
    associate: Associate;
    onClose: () => void;
}> = ({ associate, onClose }) => {
    const { formState } = useSettings();
    const { allowedMimeTypes = [], pdfOnly = false, maxFileSizeMB = 5, autoCompressImages = true } = formState.documentSettings || {};
    const appModal = useModal();
    
    const [files, setFiles] = useState<Record<string, File | null>>({
        personalDocPatient: null,
        addressDoc: null,
        termDoc: null,
        personalDocGuardian: null,
    });
    const [isUploading, setIsUploading] = useState(false);
    const [globalError, setGlobalError] = useState('');

    const handleFileChange = (slotId: string, file: File | null) => {
        setFiles(prev => ({ ...prev, [slotId]: file }));
    };

    const handleUpload = async () => {
        setIsUploading(true);
        setGlobalError('');

        // FIX: Add a type predicate to the filter to ensure TypeScript correctly infers the type of `file` as `File`.
        const filesToUpload = Object.entries(files).filter(
            (entry): entry is [string, File] => entry[1] !== null,
        );

        if (filesToUpload.length === 0) {
            appModal.alert({ title: "Nenhum arquivo", message: "Nenhum arquivo foi selecionado para upload." });
            setIsUploading(false);
            return;
        }

        try {
            for (const [slotId, file] of filesToUpload) {
                const formData = new FormData();
                formData.append('file', file);
                // The `associate.id` type is `string | number`, but `formData.append` expects a `string` or `Blob`.
                // Converting it to a string resolves the type error.
                formData.append('associate_id', associate.id.toString());
                formData.append('document_type', slotId);
                await apiClient.post('/seishat/documents/upload', formData);
            }
            appModal.alert({ title: "Sucesso!", message: `${filesToUpload.length} documento(s) enviados com sucesso.`});
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
            setGlobalError(`Falha no upload: ${message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const acceptedMimeTypes = useMemo(() => {
        if (pdfOnly) return 'application/pdf';
        return allowedMimeTypes.join(',');
    }, [pdfOnly, allowedMimeTypes]);

    const showGuardianDoc = ['responsavel', 'tutor'].includes(associate.type);

    const documentSlots = [
        { id: 'personalDocPatient', label: 'Documento Pessoal do Paciente (RG/CNH)' },
        { id: 'addressDoc', label: 'Comprovante de Endereço' },
        { id: 'termDoc', label: 'Termo Associativo Assinado' },
    ];
    if (showGuardianDoc) {
        documentSlots.push({ id: 'personalDocGuardian', label: 'Documento Pessoal do Responsável (RG/CNH)' });
    }

    return (
        <Modal
            title={`Documentos de ${associate.full_name}`}
            onClose={onClose}
            size="lg"
            icon={<UsersIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={
                <>
                    <button onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Cancelar</button>
                    <button onClick={handleUpload} disabled={isUploading} className="flex items-center justify-center min-w-[180px] px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-70 disabled:cursor-wait">
                        {isUploading ? <Loader /> : 'Salvar Documentos'}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-400">
                    Anexe os documentos necessários para o associado. Os arquivos serão salvos de forma segura.
                </p>
                 {globalError && (
                    <div className="p-3 bg-red-900/40 rounded-lg border border-red-700/50 flex items-start gap-3">
                        <AlertCircleIcon className="w-6 h-6 text-red-300 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-300">{globalError}</p>
                    </div>
                )}
                {documentSlots.map(slot => (
                    <FileInput
                        key={slot.id}
                        label={slot.label}
                        file={files[slot.id]}
                        onFileChange={(file) => handleFileChange(slot.id, file)}
                        accept={acceptedMimeTypes}
                        maxSizeMB={maxFileSizeMB}
                        autoCompress={autoCompressImages}
                    />
                ))}
            </div>
        </Modal>
    );
};