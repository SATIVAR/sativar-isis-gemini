import React, { useMemo, useState, useEffect } from 'react';
import type { FormLayoutField, FormStep, VisibilityConditions, ConditionRule, AssociateType, ConditionOperator } from '../../../types.ts';
import { SettingsIcon, XCircleIcon, PlusCircleIcon, Trash2Icon } from '../../icons.tsx';

const associateTypes: { id: AssociateType; label: string }[] = [
    { id: 'paciente', label: 'Paciente' },
    { id: 'responsavel', label: 'Responsável' },
    { id: 'tutor', label: 'Tutor' },
    { id: 'colaborador', label: 'Colaborador' },
];

const conditionOperators: { id: ConditionOperator, label: string }[] = [
    { id: 'equals', label: 'é igual a' },
    { id: 'not_equals', label: 'é diferente de' },
    { id: 'is_empty', label: 'está vazio' },
    { id: 'is_not_empty', label: 'não está vazio' },
    { id: 'contains', label: 'contém' },
];

interface RuleEditorProps {
    rule: ConditionRule;
    index: number;
    otherFields: FormLayoutField[];
    onUpdate: (index: number, rule: ConditionRule) => void;
    onRemove: (index: number) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ rule, index, otherFields, onUpdate, onRemove }) => {
    const handleFieldChange = (key: keyof ConditionRule, value: string) => {
        onUpdate(index, { ...rule, [key]: value });
    };

    return (
        <div className="p-3 bg-gray-900/50 rounded-lg space-y-2 border border-gray-600">
            <div className="flex items-center gap-2">
                <select
                    value={rule.field}
                    onChange={(e) => handleFieldChange('field', e.target.value)}
                    className="flex-grow bg-[#202124] border border-gray-600/50 text-white text-xs rounded px-2 py-1 focus:ring-1 focus:ring-fuchsia-500"
                >
                    <option value="">Selecione um campo...</option>
                    {otherFields.map(f => (
                        <option key={f.id} value={f.field_name}>{f.label}</option>
                    ))}
                </select>
                <button type="button" onClick={() => onRemove(index)} className="p-1 text-gray-500 hover:text-red-400">
                    <Trash2Icon className="w-4 h-4" />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <select
                    value={rule.operator}
                    onChange={(e) => handleFieldChange('operator', e.target.value)}
                    className="w-1/2 bg-[#202124] border border-gray-600/50 text-white text-xs rounded px-2 py-1 focus:ring-1 focus:ring-fuchsia-500"
                >
                    {conditionOperators.map(op => (
                        <option key={op.id} value={op.id}>{op.label}</option>
                    ))}
                </select>
                {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                    <input
                        type="text"
                        value={rule.value || ''}
                        onChange={(e) => handleFieldChange('value', e.target.value)}
                        placeholder="Valor"
                        className="w-1/2 bg-[#202124] border border-gray-600/50 text-white text-xs rounded px-2 py-1 focus:ring-1 focus:ring-fuchsia-500"
                    />
                )}
            </div>
        </div>
    );
};

interface PropertiesPanelProps {
    field: FormLayoutField;
    layout: FormStep[];
    onUpdate: (updatedField: FormLayoutField) => void;
    onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ field, layout, onUpdate, onClose }) => {
    
    const [conditions, setConditions] = useState<VisibilityConditions>(
        field.visibility_conditions || { relation: 'AND', rules: [], roles: [] }
    );

    useEffect(() => {
        const initialConditions = field.visibility_conditions || { relation: 'AND', rules: [], roles: [] };
        if (JSON.stringify(initialConditions) !== JSON.stringify(conditions)) {
            setConditions(initialConditions);
        }
    }, [field]);
    
    const handleUpdate = (newConditions: VisibilityConditions) => {
        setConditions(newConditions);
        onUpdate({ ...field, visibility_conditions: newConditions });
    };

    const handleRequiredToggle = () => {
        onUpdate({ ...field, is_required: !field.is_required });
    };
    
    const otherFields = useMemo(() => {
        return layout
            .flatMap(step => step.fields)
            .filter(f => f.id !== field.id && f.field_type !== 'separator');
    }, [layout, field.id]);

    const handleRelationChange = (relation: 'AND' | 'OR') => handleUpdate({ ...conditions, relation });
    const handleAddRule = () => handleUpdate({ ...conditions, rules: [...(conditions.rules || []), { field: '', operator: 'equals', value: '' }] });
    const handleUpdateRule = (index: number, rule: ConditionRule) => handleUpdate({ ...conditions, rules: (conditions.rules || []).map((r, i) => i === index ? rule : r) });
    const handleRemoveRule = (index: number) => handleUpdate({ ...conditions, rules: (conditions.rules || []).filter((_, i) => i !== index) });
    
    const handleRoleToggle = (role: AssociateType) => {
        const roles = conditions.roles || [];
        const newRoles = roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role];
        handleUpdate({ ...conditions, roles: newRoles });
    };

    return (
        <div className="bg-[#202124] rounded-xl border border-gray-700 p-4 space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-fuchsia-300" />
                    <h3 className="text-lg font-semibold text-gray-300">Propriedades</h3>
                </div>
                <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Fechar painel">
                    <XCircleIcon className="w-5 h-5"/>
                </button>
            </div>
            
             <div className="pt-2">
                <p className="text-sm font-medium text-white">{field.label}</p>
                <p className="text-xs text-gray-400 font-mono">{field.field_name}</p>
            </div>

            <div className="pt-4 border-t border-gray-600/50">
                <div className="flex items-center justify-between">
                     <label htmlFor="is-required-toggle" className="text-sm font-medium text-gray-300 select-none">
                        Campo Obrigatório
                    </label>
                    <button
                        type="button"
                        id="is-required-toggle"
                        onClick={handleRequiredToggle}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#202124] ${
                            field.is_required ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={!!field.is_required}
                        disabled={!!field.is_base_field}
                    >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            field.is_required ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                </div>
                {!!field.is_base_field && <p className="text-xs text-gray-500 mt-2">Campos essenciais são sempre obrigatórios.</p>}
            </div>

            <div className="pt-4 border-t border-gray-600/50 space-y-4">
                <h4 className="text-md font-semibold text-gray-300">Visibilidade Condicional</h4>
                
                 <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">Visível para Tipos de Associado</p>
                    <div className="grid grid-cols-2 gap-2">
                        {associateTypes.map(type => (
                            <label key={type.id} className="flex items-center gap-2 text-xs text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={(conditions.roles || []).includes(type.id)}
                                    onChange={() => handleRoleToggle(type.id)}
                                    className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-fuchsia-600 focus:ring-fuchsia-500"
                                />
                                {type.label}
                            </label>
                        ))}
                    </div>
                     <p className="text-xs text-gray-500 mt-2">Se nenhum tipo for selecionado, o campo será visível para todos.</p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-gray-300">Regras de Visibilidade</p>
                        {(conditions.rules || []).length > 1 && (
                            <div className="flex items-center text-xs rounded-full bg-gray-900 border border-gray-600 p-0.5">
                                <button onClick={() => handleRelationChange('AND')} className={`px-2 py-0.5 rounded-full ${conditions.relation === 'AND' ? 'bg-fuchsia-700 text-white' : 'text-gray-400'}`}>E</button>
                                <button onClick={() => handleRelationChange('OR')} className={`px-2 py-0.5 rounded-full ${conditions.relation === 'OR' ? 'bg-fuchsia-700 text-white' : 'text-gray-400'}`}>OU</button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        {(conditions.rules || []).map((rule, index) => (
                             <RuleEditor
                                key={index}
                                rule={rule}
                                index={index}
                                otherFields={otherFields}
                                onUpdate={handleUpdateRule}
                                onRemove={handleRemoveRule}
                            />
                        ))}
                    </div>
                    <button onClick={handleAddRule} className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-fuchsia-300 hover:text-fuchsia-200 p-2 rounded-lg border-2 border-dashed border-gray-600 hover:border-fuchsia-500 transition-colors">
                        <PlusCircleIcon className="w-5 h-5" /> Adicionar Regra
                    </button>
                </div>
            </div>
        </div>
    );
};
