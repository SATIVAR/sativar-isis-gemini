import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Associate, AssociateType, FormStep, FormLayoutField, ConditionOperator } from '../../types.ts';
import { apiClient } from '../../services/database/apiClient.ts';
import { EyeIcon, EyeOffIcon, UsersIcon, EditIcon } from '../icons.tsx';
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
        className: `w-full bg-[#202124] border text-white rounded-lg px-3 py-2 focus:ring-2 outline-none transition ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'} disabled:bg-gray-800/50 disabled:cursor-not-allowed`,
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
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#202124] ${value ? 'bg-green-600' : 'bg-gray-600'} disabled:cursor-not-allowed`}
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

export const AssociateModal: React.FC<AssociateModalProps> = ({ associate, onClose, onSaveSuccess }) => {
    const [layouts, setLayouts] = useState<{ main: FormStep[]; extra: FormStep[] } | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
    const [globalError, setGlobalError] = useState('');
    const isEditing = !!associate;
    const [isEditMode, setIsEditMode] = useState(!isEditing);

    const allSteps = useMemo(() => {
        if (!layouts) return [];
        return isEditing ? [...layouts.main, ...layouts.extra] : layouts.main;
    }, [isEditing, layouts]);

    const fetchLayoutAndInitialize = useCallback(async (type: AssociateType) => {
        setIsLoading(true); setGlobalError(''); setLayouts(null);
        try {
            const { main, extra } = await apiClient.get<{ main: FormStep[], extra: FormStep[] }>(`/admin/layouts/${type}`);
            if (main.length === 0 && !isEditing) throw new Error('Nenhum formulário de cadastro configurado para este tipo de associado.');
            setLayouts({ main, extra });
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Falha ao carregar o layout do formulário.');
        } finally { setIsLoading(false); }
    }, [isEditing]);

    useEffect(() => {
        if (isEditing) {
            setFormData({ ...associate });
            fetchLayoutAndInitialize(associate.type);
        } else {
            const initialType = 'paciente';
            setFormData({ type: initialType });
            fetchLayoutAndInitialize(initialType);
        }
    }, [associate, isEditing, fetchLayoutAndInitialize]);

    const handleFieldChange = (fieldName: string, value: any) => {
        const newFormData = { ...formData, [fieldName]: value };
        setFormData(newFormData);
        if (formErrors[fieldName]) setFormErrors(prev => ({ ...prev, [fieldName]: '' }));
        if (globalError) setGlobalError('');

        if (fieldName === 'type' && !isEditing) {
            fetchLayoutAndInitialize(value);
        }
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
    
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        for (const step of allSteps) {
            for (const field of step.fields) {
                if (!checkFieldVisibility(field, formData)) continue;
                const value = formData[field.field_name];
                if (!!field.is_required && (!value || String(value).trim() === '')) errors[field.field_name] = 'Este campo é obrigatório.';
                else if (field.field_name === 'cpf' && value && !validateCPF(value)) errors.cpf = 'CPF inválido.';
                else if (field.field_name === 'password' && isEditing && value && value.length < 6) errors.password = 'A senha deve ter pelo menos 6 caracteres.';
                else if (field.field_name === 'password' && !isEditing && (!value || value.length < 6)) errors.password = 'A senha é obrigatória e deve ter pelo menos 6 caracteres.';
            }
        }
        if (formData.password && formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'As senhas não coincidem.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        const { isValid } = await checkDuplicates(formData);
        if (!isValid) return;

        setIsSaving(true); setGlobalError('');
        const payload = { ...formData };
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

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setFormData({ ...associate });
        setFormErrors({});
    };

    const renderFormBody = () => {
        const disabledState = isEditing && !isEditMode;

        return (
            <div className="space-y-6">
                {!isEditing && (
                    <div>
                        <h3 className="text-lg font-semibold text-fuchsia-300 mb-4">Primeiro Passo</h3>
                        <label htmlFor="associateType" className="block text-sm font-medium text-gray-300 mb-2">Qual o tipo de associado que você deseja cadastrar?</label>
                        <select id="associateType" value={formData.type || 'paciente'} onChange={(e) => handleFieldChange('type', e.target.value)}
                            className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500">
                            {associateTypesList.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                        </select>
                    </div>
                )}
                
                {isLoading && <div className="flex justify-center items-center h-48"><Loader /></div>}
                
                {!isLoading && globalError && <p className="text-red-400 text-center py-4">{globalError}</p>}

                {!isLoading && !globalError && layouts && allSteps.map((step, index) => {
                     const visibleFields = step.fields.filter(field => checkFieldVisibility(field, formData));
                     if (visibleFields.length === 0) return null;
                     
                     return (
                        <div key={step.id} className={`${index > 0 || isEditing ? 'pt-6 border-t border-gray-700' : ''}`}>
                            <h3 className="text-lg font-semibold text-fuchsia-300">{step.title}</h3>
                            <div className="space-y-4 mt-4">
                                {visibleFields.map(field => {
                                    if (field.field_type === 'checkbox') return (
                                        <div key={field.id} className="flex items-center justify-between pt-2">
                                            <label htmlFor={field.field_name} className="text-sm font-medium text-gray-300 select-none">{field.label} {!!field.is_required && <span className="text-red-400">*</span>}</label>
                                            <RenderField field={field} value={formData[field.field_name]} error={formErrors[field.field_name]} onChange={handleFieldChange} disabled={disabledState} />
                                        </div>
                                    );
                                    return (
                                        <div key={field.id}>
                                            <label htmlFor={field.field_name} className="block text-sm font-medium text-gray-300 mb-2">{field.label} {!!field.is_required && <span className="text-red-400">*</span>}</label>
                                            <RenderField field={field} value={formData[field.field_name]} error={formErrors[field.field_name]} onChange={handleFieldChange} disabled={disabledState} />
                                            {formErrors[field.field_name] && <p className="text-red-400 text-xs mt-1">{formErrors[field.field_name]}</p>}
                                        </div>
                                    );
                                })}
                                {visibleFields.some(f => f.field_name === 'password') && (
                                     <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha</label>
                                        <PasswordInput id="confirmPassword" name="confirmPassword" value={formData.confirmPassword || ''}
                                             onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('confirmPassword', e.target.value)}
                                             className={`w-full bg-[#202124] border text-white rounded-lg px-3 py-2 pr-10 focus:ring-2 outline-none transition ${formErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'}`}
                                             disabled={disabledState} />
                                         {formErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>}
                                    </div>
                                 )}
                            </div>
                        </div>
                     )
                })}
            </div>
        );
    };

    const isLoadingState = isLoading || isCheckingDuplicates;

    const renderFooter = () => {
        if (isEditing) {
            return isEditMode ? (
                <div className="flex justify-between w-full items-center">
                    <button type="button" onClick={handleCancelEdit} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Cancelar</button>
                    <button type="submit" form="associate-form" disabled={isSaving || isLoadingState} className="px-5 py-2 min-w-[100px] flex justify-center items-center text-center bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {isSaving || isLoadingState ? <Loader /> : 'Salvar Alterações'}
                    </button>
                </div>
            ) : (
                <div className="flex justify-end w-full gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Fechar</button>
                    <button type="button" onClick={() => setIsEditMode(true)} className="flex items-center gap-2 px-5 py-2 bg-fuchsia-600 text-white font-semibold rounded-lg hover:bg-fuchsia-700">
                        <EditIcon className="w-5 h-5" /> Editar
                    </button>
                </div>
            );
        }

        // Create mode footer
        return (
            <div className="flex justify-between w-full items-center">
                <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Cancelar</button>
                <button type="submit" form="associate-form" disabled={isSaving || isLoadingState || !layouts} className="px-5 py-2 min-w-[100px] flex justify-center items-center text-center bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {isSaving || isLoadingState ? <Loader /> : 'Salvar'}
                </button>
            </div>
        );
    };
    
    return (
        <Modal title={isEditing ? `Associado: ${associate.full_name}` : 'Adicionar Novo Associado'}
            onClose={onClose} size="lg" icon={<UsersIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={renderFooter()}>
            <div className="min-h-[350px]">
                 <form id="associate-form" onSubmit={handleSubmit}>
                    {renderFormBody()}
                    {globalError && !isLoading && !isEditing && <p className="text-sm text-red-400 text-center mt-4">{globalError}</p>}
                </form>
            </div>
        </Modal>
    );
};