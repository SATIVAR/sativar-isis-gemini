import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Associate, AssociateType, FormStep, FormLayoutField, ConditionOperator } from '../../types.ts';
import { apiClient } from '../../services/database/apiClient.ts';
import { EyeIcon, EyeOffIcon, UsersIcon, FileTextIcon, CheckSquareIcon, BriefcaseIcon, PlusCircleIcon, EditIcon } from '../icons.tsx';
import { Modal } from '../Modal.tsx';
import { Loader } from '../Loader.tsx';

// --- Helper Functions ---

const validateCPF = (cpf: string): boolean => {
    if (!cpf) return true;
    const cpfClean = cpf.replace(/[^\d]/g, '');
    if (cpfClean.length !== 11 || /^(\d)\1+$/.test(cpfClean)) return false;
    let sum = 0, remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpfClean.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpfClean.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpfClean.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpfClean.substring(10, 11))) return false;
    return true;
};

const formatCPF = (value: string): string => {
    if (!value) return '';
    const cpf = value.replace(/\D/g, '').slice(0, 11);
    if (cpf.length > 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
    if (cpf.length > 6) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
    if (cpf.length > 3) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
    return cpf;
};

const formatWhatsapp = (value: string): string => {
    if (!value) return '';
    value = value.replace(/\D/g, '').slice(0, 11);
    if (value.length > 7) return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    if (value.length > 2) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 0) return `(${value.slice(0, 2)}`;
    return value;
};

const associateTypesList: { id: AssociateType; label: string }[] = [
    { id: 'paciente', label: 'Paciente' },
    { id: 'responsavel', label: 'Responsável por Paciente' },
    { id: 'tutor', label: 'Tutor de Animal' },
    { id: 'colaborador', label: 'Colaborador' },
];

const checkFieldVisibility = (field: FormLayoutField, formData: Record<string, any>): boolean => {
    const conditions = field.visibility_conditions;
    if (!conditions || (!conditions.rules && !conditions.roles)) return true;
    const checkRules = () => {
        if (!conditions.rules || conditions.rules.length === 0) return true;
        const ruleResults = conditions.rules.map(rule => {
            const targetValue = formData[rule.field] || '';
            switch (rule.operator as ConditionOperator) {
                case 'equals': return targetValue === rule.value;
                case 'not_equals': return targetValue !== rule.value;
                case 'is_empty': return !targetValue;
                case 'is_not_empty': return !!targetValue;
                case 'contains': return String(targetValue).includes(rule.value || '');
                default: return true;
            }
        });
        return conditions.relation === 'AND' ? ruleResults.every(res => res) : ruleResults.some(res => res);
    };
    const checkRoles = () => {
        if (!conditions.roles || conditions.roles.length === 0) return true;
        const currentType = formData.type as AssociateType;
        return conditions.roles.includes(currentType);
    };
    return checkRules() && checkRoles();
};

const PasswordInput: React.FC<any> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <div className="relative">
            <input {...props} type={isVisible ? 'text' : 'password'} className={`${props.className} pr-10`} />
            <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white">
                {isVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
        </div>
    );
};

const RenderField: React.FC<{
    field: FormLayoutField;
    value: any;
    error?: string;
    onChange: (fieldName: string, value: any) => void;
    disabled?: boolean;
}> = ({ field, value, error, onChange, disabled = false }) => {
    const commonProps = {
        id: field.field_name, name: field.field_name, value: value || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(field.field_name, e.target.value),
        className: `w-full bg-[#202124] border text-white rounded-lg px-3 py-2 focus:ring-2 outline-none transition ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'}`,
        required: !!field.is_required, disabled,
    };
    if (field.field_name === 'whatsapp') return <input type="text" {...commonProps} value={formatWhatsapp(value || '')} placeholder="(XX) XXXXX-XXXX" maxLength={15} />;
    if (field.field_name === 'cpf') return <input type="text" {...commonProps} value={formatCPF(value || '')} placeholder="000.000.000-00" maxLength={14} />;
    switch (field.field_type) {
        case 'textarea': return <textarea rows={3} {...commonProps} />;
        case 'email': return <input type="email" {...commonProps} />;
        case 'password': return <PasswordInput {...commonProps} />;
        case 'checkbox': return (
            <button type="button" id={field.field_name} onClick={() => !disabled && onChange(field.field_name, !value)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#202124] ${value ? 'bg-green-600' : 'bg-gray-600'}`}
                role="switch" aria-checked={!!value} disabled={disabled}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        );
        case 'select': case 'brazilian_states_select':
            const options = field.options ? JSON.parse(field.options) : [];
            return (
                <select {...commonProps}>
                    <option value="">Selecione...</option>
                    {options.map((opt: string) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
            );
        default: return <input type="text" {...commonProps} />;
    }
};

interface AssociateModalProps { associate: Associate | null; onClose: () => void; onSaveSuccess: () => void; }

const AssociateInfoView: React.FC<{ associate: Associate; steps: FormStep[] }> = ({ associate, steps }) => {
    const allFields = useMemo(() => steps.flatMap(s => s.fields), [steps]);
    const getFieldLabel = (fieldName: string) => {
        const field = allFields.find(f => f.field_name === fieldName);
        return field?.label || fieldName;
    };
    const baseFields = ['full_name', 'cpf', 'whatsapp', 'type'];
    const displayData = Object.entries(associate)
        .filter(([key]) => key !== 'id' && key !== 'password' && associate[key])
        .map(([key, value]) => ({
            key, label: getFieldLabel(key),
            value: key === 'type' ? associateTypesList.find(t => t.id === value)?.label || value : value,
            isBase: baseFields.includes(key)
        }))
        .sort((a, b) => {
            if (a.isBase && !b.isBase) return -1;
            if (!a.isBase && b.isBase) return 1;
            if (a.isBase && b.isBase) return baseFields.indexOf(a.key) - baseFields.indexOf(b.key);
            return a.label.localeCompare(b.label);
        });
    const getIcon = (key: string) => {
        switch(key) {
            case 'full_name': return <UsersIcon className="w-5 h-5 text-gray-400" />;
            case 'cpf': return <FileTextIcon className="w-5 h-5 text-gray-400" />;
            case 'whatsapp': return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
            case 'type': return <BriefcaseIcon className="w-5 h-5 text-gray-400" />;
            default: return <CheckSquareIcon className="w-5 h-5 text-gray-400" />;
        }
    };
    return (
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {displayData.map(({ key, label, value }) => (
                <div key={key} className="relative">
                    <dt className="flex items-center gap-3 text-sm font-medium text-gray-400">{getIcon(key)}<span>{label}</span></dt>
                    <dd className="mt-1 pl-8 text-white text-sm">{String(value) || <span className="italic text-gray-500">Não informado</span>}</dd>
                </div>
            ))}
        </dl>
    );
};

export const AssociateModal: React.FC<AssociateModalProps> = ({ associate, onClose, onSaveSuccess }) => {
    const [steps, setSteps] = useState<FormStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
    const [globalError, setGlobalError] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'extra' | 'edit'>('info');
    const isEditing = !!associate;

    const fetchLayoutAndInitialize = useCallback(async (type: AssociateType) => {
        setIsLoading(true); setGlobalError('');
        try {
            const layoutData = await apiClient.get<FormStep[]>(`/admin/layouts/${type}`);
            if (layoutData.length === 0) throw new Error('Nenhum layout de formulário configurado para este tipo de associado.');
            setSteps(layoutData); setCurrentStepIndex(0);
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Falha ao carregar o layout do formulário.');
            setCurrentStepIndex(-1);
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => {
        if (isEditing) {
            setFormData({ ...associate });
            fetchLayoutAndInitialize(associate.type);
        } else {
            setFormData({ type: 'paciente' });
            setCurrentStepIndex(-1); setIsLoading(false);
        }
    }, [associate, isEditing, fetchLayoutAndInitialize]);

    const handleFieldChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        if (formErrors[fieldName]) setFormErrors(prev => ({ ...prev, [fieldName]: '' }));
        if (globalError) setGlobalError('');
    };
    
    const checkDuplicates = useCallback(async (data: Record<string, any>) => {
        const { cpf, whatsapp } = data;
        if (!cpf && !whatsapp) return { isValid: true };
        setIsCheckingDuplicates(true);
        try {
            const response = await apiClient.post<{ isDuplicate: boolean; field?: string; message?: string }>('/seishat/associates/check-duplicates', { cpf, whatsapp, excludeId: associate?.id });
            if (response.isDuplicate && response.field) {
                setFormErrors(prev => ({ ...prev, [response.field!]: response.message }));
                return { isValid: false };
            }
            return { isValid: true };
        } catch (error) {
            setGlobalError(error instanceof Error ? error.message : "Erro ao verificar duplicidade.");
            return { isValid: false };
        } finally { setIsCheckingDuplicates(false); }
    }, [associate?.id]);
    
    const validateStep = (stepIndex: number): boolean => {
        const errors: Record<string, string> = {};
        const step = steps[stepIndex];
        if (!step) return false;
        for (const field of step.fields) {
            if (!checkFieldVisibility(field, formData)) continue;
            const value = formData[field.field_name];
            if (!!field.is_required && (!value || String(value).trim() === '')) errors[field.field_name] = 'Este campo é obrigatório.';
            else if (field.field_name === 'cpf' && value && !validateCPF(value)) errors.cpf = 'CPF inválido.';
            else if (field.field_name === 'password' && isEditing && value && value.length < 6) errors.password = 'A senha deve ter pelo menos 6 caracteres.';
            else if (field.field_name === 'password' && !isEditing && (!value || value.length < 6)) errors.password = 'A senha é obrigatória e deve ter pelo menos 6 caracteres.';
        }
        if (formData.password && formData.password !== formData.confirmPassword) {
            if (step.fields.some(f => f.field_name === 'confirmPassword' || f.field_name === 'password')) errors.confirmPassword = 'As senhas não coincidem.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    
    const handleNext = async () => {
        if (currentStepIndex === -1) fetchLayoutAndInitialize(formData.type);
        else if (validateStep(currentStepIndex)) {
            const currentFields = steps[currentStepIndex].fields.map(f => f.field_name);
            if (currentFields.includes('cpf') || currentFields.includes('whatsapp')) {
                const { isValid } = await checkDuplicates(formData);
                if (!isValid) return;
            }
            setCurrentStepIndex(prev => prev + 1);
        }
    };
    
    const handleBack = () => { setFormErrors({}); setCurrentStepIndex(prev => prev - 1); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        for (let i = 0; i < steps.length; i++) { if (!validateStep(i)) { setCurrentStepIndex(i); return; } }
        const { isValid } = await checkDuplicates(formData);
        if (!isValid) {
            const errorField = Object.keys(formErrors).find(key => formErrors[key]);
            if (errorField) {
                 const errorStepIndex = steps.findIndex(step => step.fields.some(f => f.field_name === errorField));
                 if (errorStepIndex !== -1 && errorStepIndex !== currentStepIndex) setCurrentStepIndex(errorStepIndex);
            }
            return;
        }
        setIsSaving(true); setGlobalError('');
        const payload: Record<string, any> = { ...formData };
        if (payload.cpf) payload.cpf = payload.cpf.replace(/[^\d]/g, '');
        delete payload.confirmPassword;
        if (isEditing && !payload.password) delete payload.password;
        try {
            if (isEditing) await apiClient.put(`/seishat/associates/${associate.id}`, payload);
            else await apiClient.post('/seishat/associates', payload);
            onSaveSuccess(); onClose();
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Falha ao salvar. Tente novamente.');
        } finally { setIsSaving(false); }
    };

    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
    const isLastStep = currentStepIndex === steps.length - 1 && steps.length > 0;
    const isLoadingState = isLoading || isCheckingDuplicates;

    const renderFormBody = () => {
        if (isLoading) return <div className="flex justify-center items-center h-48"><Loader /></div>;
        if (globalError && !currentStep) return <p className="text-red-400 text-center">{globalError}</p>;
        if (currentStepIndex === -1 && !isEditing) return (
            <div>
                <h3 className="text-lg font-semibold text-fuchsia-300 mb-4">Primeiro Passo</h3>
                <label htmlFor="associateType" className="block text-sm font-medium text-gray-300 mb-2">Qual o tipo de associado que você deseja cadastrar?</label>
                <select id="associateType" value={formData.type || 'paciente'} onChange={(e) => handleFieldChange('type', e.target.value)}
                    className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500">
                    {associateTypesList.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
            </div>
        );
        if (!currentStep) return <p className="text-gray-400 text-center">Formulário não encontrado.</p>;
        const visibleFields = currentStep.fields.filter(field => checkFieldVisibility(field, formData));
        return (
            <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-fuchsia-300">{currentStep.title}</h3>
                {visibleFields.map(field => {
                    if (field.field_type === 'checkbox') return (
                        <div key={field.id} className="flex items-center justify-between pt-2">
                            <label htmlFor={field.field_name} className="text-sm font-medium text-gray-300 select-none">{field.label} {!!field.is_required && <span className="text-red-400">*</span>}</label>
                            <RenderField field={field} value={formData[field.field_name]} error={formErrors[field.field_name]} onChange={handleFieldChange} />
                        </div>
                    );
                    return (
                        <div key={field.id}>
                            <label htmlFor={field.field_name} className="block text-sm font-medium text-gray-300 mb-2">{field.label} {!!field.is_required && <span className="text-red-400">*</span>}</label>
                            <RenderField field={field} value={formData[field.field_name]} error={formErrors[field.field_name]} onChange={handleFieldChange} />
                            {formErrors[field.field_name] && <p className="text-red-400 text-xs mt-1">{formErrors[field.field_name]}</p>}
                        </div>
                    );
                })}
                 {visibleFields.some(f => f.field_name === 'password') && (
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha</label>
                        <PasswordInput id="confirmPassword" name="confirmPassword" value={formData.confirmPassword || ''}
                             onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('confirmPassword', e.target.value)}
                             className={`w-full bg-[#202124] border text-white rounded-lg px-3 py-2 pr-10 focus:ring-2 outline-none transition ${formErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'}`} />
                         {formErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>}
                    </div>
                 )}
            </div>
        );
    };

    const ProgressBar = () => {
        if (currentStepIndex < 0 || steps.length <= 1) return null;
        return (
            <div className="flex items-center gap-2 mb-4">
                {steps.map((_, index) => (<div key={index} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: index <= currentStepIndex ? '#a855f7' : '#4a4a4f' }}></div>))}
            </div>
        )
    };

    const TabButton: React.FC<{ label: string, isActive: boolean, onClick: () => void, icon: React.ReactNode }> = ({ label, isActive, onClick, icon }) => (
        <button type="button" onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${isActive ? 'border-fuchsia-500 text-fuchsia-300' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'}`}>
            {icon} {label}
        </button>
    );

    const renderFooter = () => {
        if (isEditing) {
            if (activeTab !== 'edit') return <div className="flex justify-end w-full"><button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Fechar</button></div>;
        }
        return (
            <div className="flex justify-between w-full items-center">
                <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Cancelar</button>
                <div className="flex items-center gap-3">
                    {currentStepIndex > (isEditing ? 0 : -1) && <button type="button" onClick={handleBack} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Voltar</button>}
                    {isLastStep ? (
                        <button type="submit" form="associate-form" disabled={isSaving || isLoadingState} className="px-5 py-2 min-w-[100px] flex justify-center items-center text-center bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                            {isSaving || isCheckingDuplicates ? <Loader /> : 'Salvar'}
                        </button>
                    ) : (
                        <button type="button" onClick={handleNext} disabled={isLoadingState} className="px-5 py-2 min-w-[100px] flex justify-center items-center bg-fuchsia-600 text-white font-semibold rounded-lg hover:bg-fuchsia-700 disabled:opacity-50">
                            {isCheckingDuplicates ? <Loader /> : 'Próximo'}
                        </button>
                    )}
                </div>
            </div>
        );
    };
    
    return (
        <Modal title={isEditing ? `Editar Associado: ${associate.full_name}` : 'Adicionar Novo Associado'}
            onClose={onClose} size="lg" icon={<UsersIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={renderFooter()}>
            {isEditing && (
                <div className="flex border-b border-gray-700 mb-6 -mt-2">
                    <TabButton label="Informações" isActive={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={<UsersIcon className="w-5 h-5"/>} />
                    <TabButton label="Extras" isActive={activeTab === 'extra'} onClick={() => setActiveTab('extra')} icon={<PlusCircleIcon className="w-5 h-5"/>} />
                    <TabButton label="Editar" isActive={activeTab === 'edit'} onClick={() => setActiveTab('edit')} icon={<EditIcon className="w-5 h-5"/>} />
                </div>
            )}
            <div className="min-h-[350px]">
                 <form id="associate-form" onSubmit={handleSubmit} className={!isEditing || activeTab === 'edit' ? 'block' : 'hidden'}>
                    <ProgressBar />
                    {renderFormBody()}
                    {globalError && !isLoading && <p className="text-sm text-red-400 text-center mt-4">{globalError}</p>}
                </form>
                {isEditing && activeTab === 'info' && (isLoading ? <div className="flex justify-center items-center h-48"><Loader /></div> : <AssociateInfoView associate={associate} steps={steps} />)}
                {isEditing && activeTab === 'extra' && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 pt-16">
                        <BriefcaseIcon className="w-12 h-12 mb-4" />
                        <p className="font-semibold text-lg text-gray-400">Em Breve</p>
                        <p>Funcionalidades adicionais para o associado aparecerão aqui.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};
