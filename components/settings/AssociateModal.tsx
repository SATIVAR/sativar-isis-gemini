import React, { useState, useEffect, useCallback } from 'react';
import type { Associate, AssociateType, FormStep, FormLayoutField, UserRole } from '../../types.ts';
import { apiClient } from '../../services/database/apiClient.ts';
import { EyeIcon, EyeOffIcon, UsersIcon } from '../icons.tsx';
import { Modal } from '../Modal.tsx';
import { Loader } from '../Loader.tsx';
import { useModal } from '../../hooks/useModal.ts';
import { useAuth } from '../../hooks/useAuth.ts';

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

const checkFieldVisibility = (
    field: FormLayoutField,
    formData: Record<string, any>
): boolean => {
    const conditions = field.visibility_conditions;
    if (!conditions) return true;

    // Visibility based on Associate Type
    if (conditions.roles && conditions.roles.length > 0) {
        const associateTypeInForm = formData.type as AssociateType;
        if (!associateTypeInForm || !conditions.roles.includes(associateTypeInForm)) {
            return false;
        }
    }

    // Field-based rule check
    if (!conditions.rules || conditions.rules.length === 0) {
        return true; // No rules, but role check might have passed.
    }

    const ruleResults = conditions.rules.map(rule => {
        const targetValue = formData[rule.field] || '';
        switch (rule.operator) {
            case 'equals': return targetValue === rule.value;
            case 'not_equals': return targetValue !== rule.value;
            case 'is_empty': return targetValue === '';
            case 'is_not_empty': return targetValue !== '';
            case 'contains': return String(targetValue).includes(rule.value || '');
            default: return false;
        }
    });

    if (conditions.relation === 'AND') {
        return ruleResults.every(res => res);
    } else { // OR
        return ruleResults.some(res => res);
    }
};

const RenderField: React.FC<{
    field: FormLayoutField;
    value: any;
    error?: string;
    onChange: (fieldName: string, value: string) => void;
    disabled?: boolean;
}> = ({ field, value, error, onChange, disabled = false }) => {
    const commonProps = {
        id: field.field_name,
        name: field.field_name,
        value: value || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(field.field_name, e.target.value),
        className: `w-full bg-[#202124] border text-white rounded-lg px-3 py-2 focus:ring-2 outline-none transition ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'}`,
        required: !!field.is_required,
        disabled,
    };

    const renderInput = (type: string) => <input type={type} {...commonProps} />;
    
    // Special handling for WhatsApp with formatting
    if (field.field_name === 'whatsapp') {
        return (
            <input
                type="text"
                {...commonProps}
                value={formatWhatsapp(value || '')}
                placeholder="(XX) XXXXX-XXXX"
                maxLength={15}
            />
        );
    }
    
    switch (field.field_type) {
        case 'textarea': return <textarea rows={3} {...commonProps} />;
        case 'email': return renderInput('email');
        case 'password': return <PasswordInput {...commonProps} />;
        case 'select':
            const options = field.options ? JSON.parse(field.options) : [];
            const selectOptions = field.field_name === 'type' ? associateTypesList : options.map((opt: string) => ({ id: opt, label: opt }));
            return (
                <select {...commonProps}>
                    {selectOptions.map((opt: {id: string, label: string}) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
            );
        default: return renderInput('text');
    }
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

interface AssociateModalProps {
    associate: Associate | null;
    onClose: () => void;
    onSaveSuccess: () => void;
}

export const AssociateModal: React.FC<AssociateModalProps> = ({ associate, onClose, onSaveSuccess }) => {
    const [steps, setSteps] = useState<FormStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [globalError, setGlobalError] = useState('');
    
    const isEditing = !!associate;
    const modal = useModal();
    const { user } = useAuth();

    const fetchLayout = useCallback(async (type: AssociateType) => {
        setIsLoading(true);
        setGlobalError('');
        try {
            const layoutData = await apiClient.get<FormStep[]>(`/admin/layouts/${type}`);
            if (layoutData.length === 0) throw new Error('Nenhum layout de formulário configurado para este tipo de associado.');
            setSteps(layoutData);
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Falha ao carregar o layout do formulário.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialType = associate?.type || 'paciente';
        setFormData(isEditing ? { ...associate } : { type: initialType });
        fetchLayout(initialType);
    }, [associate, isEditing, fetchLayout]);

    // Effect to clear data from fields that become hidden
    useEffect(() => {
        if (isLoading || steps.length === 0 || !user) return;
    
        const allFields = steps.flatMap(s => s.fields);
        const newFormData = { ...formData };
        let changed = false;
    
        allFields.forEach(field => {
            const isVisible = checkFieldVisibility(field, formData);
            if (!isVisible && newFormData[field.field_name] != null && newFormData[field.field_name] !== '') {
                newFormData[field.field_name] = ''; // Clear the value
                changed = true;
            }
        });
    
        if (changed) {
            setFormData(newFormData);
        }
    }, [formData, steps, user, isLoading]);
    
    const handleFieldChange = (fieldName: string, value: string) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        if (formErrors[fieldName]) {
            setFormErrors(prev => ({ ...prev, [fieldName]: '' }));
        }
        if (globalError) setGlobalError('');
    };
    
     const handleTypeChange = async (fieldName: string, value: string) => {
        if (isEditing) return; // Type cannot be changed when editing
        
        const newType = value as AssociateType;
        const currentData = { ...formData };
        
        const hasData = Object.keys(currentData).some(key => key !== 'type' && currentData[key]);
        if(hasData) {
             const confirmed = await modal.confirm({
                title: "Mudar Tipo de Associado?",
                message: "Alterar o tipo de associado irá recarregar o formulário e limpar os dados já preenchidos. Deseja continuar?",
                confirmLabel: "Continuar",
                danger: true
            });
            if (!confirmed) {
                setFormData(prev => ({ ...prev }));
                return;
            }
        }
       
        setFormData({ type: newType }); // Reset form data but keep new type
        setCurrentStepIndex(0);
        await fetchLayout(newType);
    };

    const validateStep = (stepIndex: number): boolean => {
        if (!user) return false;
        const errors: Record<string, string> = {};
        const step = steps[stepIndex];
        if (!step) return false;

        for (const field of step.fields) {
            const isVisible = checkFieldVisibility(field, formData);
            if (!isVisible) continue; // Don't validate hidden fields

            const value = formData[field.field_name];
            if (!!field.is_required && (!value || String(value).trim() === '')) {
                errors[field.field_name] = 'Este campo é obrigatório.';
            } else if (field.field_name === 'cpf' && value && !validateCPF(value)) {
                errors.cpf = 'CPF inválido.';
            } else if (field.field_name === 'password' && isEditing && value && value.length < 6) {
                errors.password = 'A senha deve ter pelo menos 6 caracteres.';
            } else if (field.field_name === 'password' && !isEditing && (!value || value.length < 6)) {
                errors.password = 'A senha é obrigatória e deve ter pelo menos 6 caracteres.';
            } else if (field.field_name === 'password' && value && value !== formData.confirmPassword) {
                 errors.confirmPassword = 'As senhas não coincidem.';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    
    const handleNext = () => {
        if (validateStep(currentStepIndex)) {
            setCurrentStepIndex(prev => prev + 1);
        }
    };
    
    const handleBack = () => {
        setFormErrors({});
        setCurrentStepIndex(prev => prev - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        for (let i = 0; i < steps.length; i++) {
            if (!validateStep(i)) {
                setCurrentStepIndex(i);
                return;
            }
        }
        
        setIsSaving(true);
        setGlobalError('');

        const coreFields = ['full_name', 'cpf', 'whatsapp', 'password', 'type'];
        const payload: Record<string, any> = {};
        for(const key of coreFields) {
            if (formData[key] !== undefined) {
                payload[key] = formData[key];
            }
        }
        if (isEditing && !payload.password) {
            delete payload.password;
        }

        try {
            if (isEditing) {
                await apiClient.put(`/seishat/associates/${associate.id}`, payload);
            } else {
                await apiClient.post('/seishat/associates', payload);
            }
            onSaveSuccess();
            onClose();
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Falha ao salvar. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const currentStep = steps[currentStepIndex];
    const isLastStep = currentStepIndex === steps.length - 1;

    const renderBody = () => {
        if (isLoading) return <div className="flex justify-center items-center h-48"><Loader /></div>;
        if (globalError && steps.length === 0) return <p className="text-red-400 text-center">{globalError}</p>;
        if (!currentStep || !user) return <p className="text-gray-400 text-center">Formulário não encontrado.</p>;

        const visibleFields = currentStep.fields.filter(field => checkFieldVisibility(field, formData));
        
        return (
            <div className="space-y-4">
                 {steps.length > 1 && (
                    <div className="flex items-center gap-2 mb-4">
                        {steps.map((step, index) => (
                             <div key={step.id} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: index <= currentStepIndex ? '#a855f7' : '#4a4a4f' }}></div>
                        ))}
                    </div>
                )}
                <h3 className="text-lg font-semibold text-fuchsia-300">{currentStep.title}</h3>
                {visibleFields.map(field => {
                    const onChangeHandler = field.field_name === 'type' ? handleTypeChange : handleFieldChange;
                    const isDisabled = isEditing && field.field_name === 'type';
                    return (
                        <div key={field.id} style={{animation: 'fadeIn 0.5s ease-out'}}>
                            <label htmlFor={field.field_name} className="block text-sm font-medium text-gray-300 mb-2">
                                {field.label} {!!field.is_required && <span className="text-red-400">*</span>}
                            </label>
                            <RenderField
                                field={field}
                                value={formData[field.field_name]}
                                error={formErrors[field.field_name]}
                                onChange={onChangeHandler}
                                disabled={isDisabled}
                            />
                            {formErrors[field.field_name] && <p className="text-red-400 text-xs mt-1">{formErrors[field.field_name]}</p>}
                        </div>
                    );
                })}
                 {visibleFields.some(f => f.field_name === 'password') && (
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha</label>
                        <PasswordInput
                             id="confirmPassword"
                             name="confirmPassword"
                             value={formData.confirmPassword || ''}
                             onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange('confirmPassword', e.target.value)}
                             className={`w-full bg-[#202124] border text-white rounded-lg px-3 py-2 pr-10 focus:ring-2 outline-none transition ${formErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500'}`}
                         />
                         {formErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>}
                    </div>
                 )}
                 {visibleFields.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Nenhum campo visível nesta etapa.</p>}
            </div>
        );
    };

    return (
        <Modal
            title={isEditing ? `Editar Associado: ${associate.full_name}` : 'Adicionar Novo Associado'}
            onClose={onClose}
            size="lg"
            icon={<UsersIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={
                <div className="flex justify-between w-full items-center">
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Cancelar</button>
                    <div className="flex items-center gap-3">
                         {currentStepIndex > 0 && (
                            <button type="button" onClick={handleBack} className="px-5 py-2 bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-600">Voltar</button>
                        )}
                        {isLastStep ? (
                             <button type="submit" form="associate-form" disabled={isSaving || isLoading} className="px-5 py-2 min-w-[100px] text-center bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                                {isSaving ? <Loader /> : 'Salvar'}
                             </button>
                        ) : (
                             <button type="button" onClick={handleNext} disabled={isLoading || steps.length === 0} className="px-5 py-2 bg-fuchsia-600 text-white font-semibold rounded-lg hover:bg-fuchsia-700 disabled:opacity-50">
                                Próximo
                             </button>
                        )}
                    </div>
                </div>
            }
        >
            <style>
                {`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}
            </style>
            <form id="associate-form" onSubmit={handleSubmit}>
                {renderBody()}
                {globalError && !isLoading && <p className="text-sm text-red-400 text-center mt-4">{globalError}</p>}
            </form>
        </Modal>
    );
};