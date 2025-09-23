import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '../Modal.tsx';
import { useSettings } from '../../hooks/useSettings.ts';
import { useModal } from '../../hooks/useModal.ts';
import type { Associate } from '../../types.ts';
import { UsersIcon, UploadCloudIcon, FileTextIcon, AlertCircleIcon } from '../icons.tsx';
import { Loader } from '../Loader.tsx';

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
    const modal = useModal();

    const validateAndSetFile = async (selectedFile: File | null) => {
        if (!selectedFile) {
            onFileChange(null);
            return;
        }

        const fileSizeMB = selectedFile.size / 1024 / 1024;

        // If file is within limits, just set it
        if (fileSizeMB <= maxSizeMB) {
            onFileChange(selectedFile);
            return;
        }

        // If file is an image and auto-compression is on, try to compress it
        if (autoCompress && selectedFile.type.startsWith('image/')) {
            setIsCompressing(true);
            try {
                const options = {
                    maxSizeMB: maxSizeMB,
                    useWebWorker: true,
                };
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
                    message: `Não foi possível otimizar a imagem "${selectedFile.name}". Por favor, tente comprimi-la manualmente.`
                });
                if (inputRef.current) inputRef.current.value = '';
            } finally {
                setIsCompressing(false);
            }
            return;
        }
        
        // If file is too large and cannot be compressed, reject it
        modal.alert({
            title: 'Arquivo Muito Grande',
            message: `O arquivo "${selectedFile.name}" (${fileSizeMB.toFixed(2)} MB) excede o tamanho máximo permitido de ${maxSizeMB} MB.`
        });
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        validateAndSetFile(e.target.files?.[0] || null);
    };
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files?.[0] || null;
        if(droppedFile) {
            validateAndSetFile(droppedFile);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <div 
                className={`relative flex items-center justify-center w-full h-24 px-4 py-2 bg-[#202124] border-2 border-dashed border-gray-600/50 rounded-lg transition-colors hover:border-fuchsia-500 ${file ? 'border-green-500' : ''}`}
                onClick={() => !isCompressing && inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={handleFileSelect} disabled={isCompressing} />
                {isCompressing ? (
                    <div className="flex flex-col items-center gap-2 text-fuchsia-300">
                        <Loader />
                        <span className="text-xs italic">Otimizando imagem...</span>
                    </div>
                ) : !file ? (
                    <div className="text-center text-gray-400 cursor-pointer">
                        <UploadCloudIcon className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-xs">Clique para selecionar ou arraste o arquivo</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-white">
                        <FileTextIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                    </div>
                )}
            </div>
            {file && (
                <button
                    type="button"
                    onClick={() => onFileChange(null)}
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
    
    const [files, setFiles] = useState<Record<string, File | null>>({
        personalDocPatient: null,
        addressDoc: null,
        termDoc: null,
        personalDocGuardian: null,
    });

    const handleFileChange = (slotId: string, file: File | null) => {
        setFiles(prev => ({ ...prev, [slotId]: file }));
    };

    const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const handleUpload = () => {
        const firstName = associate.full_name.split(' ')[0] || 'associado';
        const folderName = `#${associate.id}_${slugify(firstName)}`;
        
        console.log(`--- SIMULANDO UPLOAD DE DOCUMENTOS ---`);
        console.log(`Associado: ${associate.full_name} (ID: ${associate.id})`);
        console.log(`Pasta de destino conceitual: /documentos/${folderName}`);
        
        Object.entries(files).forEach(([slot, file]) => {
            if (file) {
                console.log(`- Slot '${slot}':`, file);
            }
        });
        console.log(`------------------------------------`);
        onClose();
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
                    <button onClick={handleUpload} className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Salvar Documentos</button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-400">
                    Anexe os documentos necessários para o associado. Os arquivos serão salvos de forma segura.
                </p>
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