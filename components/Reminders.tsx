
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useReminders } from '../hooks/useReminders.ts';
import type { Reminder, Task } from '../types.ts';
import { BellIcon, CalendarIcon, CheckIcon, EditIcon, RepeatIcon, Trash2Icon, XCircleIcon, UserIcon, PackageIcon, FileTextIcon, PlusCircleIcon, ChevronDownIcon } from './icons.tsx';
import { Loader } from './Loader.tsx';
import { useModal } from '../hooks/useModal.ts';

interface ReminderModalProps {
    onClose: () => void;
    reminder?: Reminder | null;
    quoteId?: string;
    patientName?: string;
}

const availableIcons = [
    { name: 'patient', Component: UserIcon, title: 'Paciente' },
    { name: 'package', Component: PackageIcon, title: 'Produto/Entrega' },
    { name: 'file', Component: FileTextIcon, title: 'Documento' },
    { name: 'bell', Component: BellIcon, title: 'Lembrete Geral' },
];

const IconMap = availableIcons.reduce((acc, curr) => {
    acc[curr.name] = curr.Component;
    return acc;
}, {} as Record<string, React.FC<any>>);


export const ReminderModal: React.FC<ReminderModalProps> = ({ onClose, reminder, quoteId, patientName }) => {
    const { addReminder, updateReminder } = useReminders();
    const modal = useModal();
    
    const initialReminderState = useMemo(() => {
        if (reminder) {
            return {
                title: reminder.patientName,
                dueDate: new Date(reminder.dueDate).toISOString().substring(0, 16),
                notes: reminder.notes,
                recurrence: reminder.recurrence,
                priority: reminder.priority || 'medium',
                tasks: reminder.tasks || []
            };
        }
        return {
            title: patientName ? `Follow-up com ${patientName}` : 'Nova Tarefa',
            dueDate: '',
            notes: '',
            recurrence: 'none' as const,
            priority: 'medium' as const,
            tasks: [] as Task[]
        };
    }, [reminder, patientName]);

    const [title, setTitle] = useState(initialReminderState.title);
    const [dueDate, setDueDate] = useState(initialReminderState.dueDate);
    const [notes, setNotes] = useState(initialReminderState.notes);
    const [recurrence, setRecurrence] = useState<Reminder['recurrence']>(initialReminderState.recurrence);
    const [priority, setPriority] = useState<Reminder['priority']>(initialReminderState.priority);
    const [tasks, setTasks] = useState<Task[]>(initialReminderState.tasks);
    const [newTaskText, setNewTaskText] = useState('');
    const [activeIconPicker, setActiveIconPicker] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const hasUnsavedChanges = useMemo(() => {
        const currentState = { title, dueDate, notes, recurrence, priority, tasks };
        return JSON.stringify(initialReminderState) !== JSON.stringify(currentState);
    }, [initialReminderState, title, dueDate, notes, recurrence, priority, tasks]);

    const handleAddTask = () => {
        if (newTaskText.trim() === '') return;
        const newTask: Task = {
            id: crypto.randomUUID(),
            text: newTaskText.trim(),
            isCompleted: false,
            icon: 'bell'
        };
        setTasks(prev => [...prev, newTask]);
        setNewTaskText('');
    };

    const handleDeleteTask = (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const handleSetTaskIcon = (taskId: string, iconName: string) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, icon: iconName } : t));
        setActiveIconPicker(null);
    };

    const handleTaskTextChange = (taskId: string, newText: string) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, text: newText } : t));
    };

    const handleSubmit = useCallback(async (event?: React.FormEvent) => {
        if (event) event.preventDefault();
        
        if (!title || !dueDate) {
            modal.alert({ title: 'Campos Obrigatórios', message: 'Por favor, preencha o título e a data de vencimento.' });
            return;
        }

        setIsSaving(true);
        const reminderData = {
            quoteId: reminder?.quoteId || quoteId || '',
            patientName: title,
            dueDate: new Date(dueDate).toISOString(),
            notes,
            recurrence,
            priority,
            tasks,
        };

        try {
            if (reminder) {
                await updateReminder({ ...reminder, ...reminderData });
            } else {
                await addReminder(reminderData);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save reminder:", error);
            modal.alert({ title: 'Erro ao Salvar', message: 'Ocorreu um erro ao salvar a tarefa. Tente novamente.' });
        } finally {
            setIsSaving(false);
        }
    }, [addReminder, updateReminder, modal, title, dueDate, notes, recurrence, priority, tasks, quoteId, reminder, onClose]);

    const handleCloseAttempt = useCallback(async () => {
        if (hasUnsavedChanges) {
            const confirmed = await modal.confirm({
                title: 'Alterações não salvas',
                message: 'Você tem alterações não salvas. Deseja salvá-las antes de sair?',
                confirmLabel: 'Salvar e Sair',
                cancelLabel: 'Descartar',
            });

            if (confirmed) {
                await handleSubmit();
            } else {
                onClose();
            }
        } else {
            onClose();
        }
    }, [hasUnsavedChanges, modal, handleSubmit, onClose]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            handleCloseAttempt();
          }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCloseAttempt]);
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const minDateTime = now.toISOString().slice(0, 16);

    const priorityOptions: { id: Reminder['priority']; label: string; color: string; ringColor: string }[] = [
        { id: 'low', label: 'Baixa', color: 'bg-blue-600', ringColor: 'border-blue-500' },
        { id: 'medium', label: 'Média', color: 'bg-yellow-600', ringColor: 'border-yellow-500' },
        { id: 'high', label: 'Alta', color: 'bg-red-600', ringColor: 'border-red-500' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleCloseAttempt}>
            <div className="bg-[#303134] rounded-xl border border-gray-700 p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <h3 className="text-xl font-bold mb-6 text-white">{reminder ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Título</label>
                            <input id="title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" required />
                        </div>
                        <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-2">Data e Hora</label>
                            <input type="datetime-local" id="dueDate" value={dueDate} min={minDateTime} onChange={e => setDueDate(e.target.value)} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Prioridade</label>
                            <div className="flex gap-2">
                                {priorityOptions.map(opt => (
                                    <button
                                        type="button"
                                        key={opt.id}
                                        onClick={() => setPriority(opt.id)}
                                        className={`flex-1 text-center px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                                            priority === opt.id
                                                ? `${opt.color.replace('bg-', 'border-')} text-white`
                                                : 'border-transparent bg-[#202124] text-gray-400 hover:bg-gray-600'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                         <div>
                            <label htmlFor="tasks" className="block text-sm font-medium text-gray-300 mb-2">Subtarefas</label>
                            <div className="space-y-2">
                                {tasks.map((task) => {
                                    const CurrentIcon = task.icon ? IconMap[task.icon] : PlusCircleIcon;
                                    return (
                                        <div key={task.id} className="flex items-center gap-2 group">
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveIconPicker(activeIconPicker === task.id ? null : task.id)}
                                                    className="p-2 rounded-full hover:bg-gray-600 transition-colors"
                                                    aria-label="Alterar ícone da subtarefa"
                                                >
                                                    <CurrentIcon className="w-5 h-5 text-gray-400" />
                                                </button>
                                                {activeIconPicker === task.id && (
                                                    <div className="absolute z-10 bottom-full mb-2 w-max p-2 bg-[#202124] border border-gray-600 rounded-lg shadow-lg flex gap-2">
                                                        {availableIcons.map(({ name, Component, title: iconTitle }) => (
                                                            <button
                                                                key={name}
                                                                type="button"
                                                                onClick={() => handleSetTaskIcon(task.id, name)}
                                                                className="p-2 rounded-full hover:bg-fuchsia-800"
                                                                title={iconTitle}
                                                            >
                                                                <Component className="w-5 h-5 text-gray-300" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={task.text}
                                                onChange={(e) => handleTaskTextChange(task.id, e.target.value)}
                                                className="flex-grow bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-fuchsia-500 outline-none transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="p-1 rounded-full text-gray-500 hover:text-red-400 hover:bg-gray-600 opacity-50 group-hover:opacity-100 transition-all"
                                                aria-label="Excluir subtarefa"
                                            >
                                                <Trash2Icon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <input
                                    type="text"
                                    value={newTaskText}
                                    onChange={(e) => setNewTaskText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); }}}
                                    placeholder="Adicionar nova subtarefa..."
                                    className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none transition"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTask}
                                    className="px-4 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors flex-shrink-0"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">Notas Adicionais</label>
                            <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Recorrência</label>
                            <select value={recurrence} onChange={e => setRecurrence(e.target.value as Reminder['recurrence'])} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition">
                                <option value="none">Não repetir</option>
                                <option value="daily">Diariamente</option>
                                <option value="weekly">Semanalmente</option>
                                <option value="monthly">Mensalmente</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={handleCloseAttempt} className="px-5 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors">Cancelar</button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="flex items-center justify-center min-w-[160px] px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isSaving ? <Loader /> : (reminder ? 'Salvar Alterações' : 'Criar Tarefa')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const TaskItem: React.FC<{ task: Task; onToggle: (taskId: string) => void }> = ({ task, onToggle }) => {
    const [isJustCompleted, setIsJustCompleted] = useState(false);
    const prevIsCompleted = useRef(task.isCompleted);

    useEffect(() => {
        if (task.isCompleted && !prevIsCompleted.current) {
            setIsJustCompleted(true);
            const timer = setTimeout(() => setIsJustCompleted(false), 1500);
            return () => clearTimeout(timer);
        }
        prevIsCompleted.current = task.isCompleted;
    }, [task.isCompleted]);
    
    const IconComponent = task.icon ? IconMap[task.icon] : BellIcon;

    return (
        <li className={`flex items-start gap-2 text-xs pl-2 py-0.5 rounded ${isJustCompleted ? 'highlight-complete' : ''}`}>
            <button 
                onClick={() => onToggle(task.id)} 
                className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-sm border flex items-center justify-center transition-all ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-fuchsia-400'}`}
                aria-label={task.isCompleted ? "Marcar subtarefa como pendente" : "Marcar subtarefa como concluída"}
            >
                {task.isCompleted && <CheckIcon className={`w-2.5 h-2.5 text-white ${isJustCompleted ? 'checkmark-pop-in' : ''}`} />}
            </button>
            <IconComponent className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className={`flex-grow ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                {task.text}
            </span>
        </li>
    );
};

const ReminderItem: React.FC<{ reminder: Reminder; onEdit: (reminder: Reminder) => void; }> = ({ reminder, onEdit }) => {
    const { toggleReminderCompletion, deleteReminder, updateReminder } = useReminders();
    const modal = useModal();
    const [isExpanded, setIsExpanded] = useState(false);
    const isOverdue = !reminder.isCompleted && new Date(reminder.dueDate) < new Date();
    const dueDate = new Date(reminder.dueDate);
    const formattedDate = isNaN(dueDate.getTime()) ? 'Data inválida' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(dueDate);
    
    const [isJustCompleted, setIsJustCompleted] = useState(false);
    const prevIsCompleted = useRef(reminder.isCompleted);
    
    const hasDetails = !!reminder.notes || (reminder.tasks && reminder.tasks.length > 0);

    useEffect(() => {
        if (reminder.isCompleted && !prevIsCompleted.current) {
            setIsJustCompleted(true);
            const timer = setTimeout(() => {
                setIsJustCompleted(false);
            }, 1500); // Duration of the highlight effect
            
            return () => clearTimeout(timer);
        }
        prevIsCompleted.current = reminder.isCompleted;
    }, [reminder.isCompleted]);

    const handleToggleTask = (taskId: string) => {
        const updatedTasks = reminder.tasks.map(t => 
            t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
        );
        updateReminder({ ...reminder, tasks: updatedTasks });
    };

    const priority = reminder.priority || 'medium';
    const priorityInfo = {
        low: { color: 'bg-blue-500', label: 'Baixa' },
        medium: { color: 'bg-yellow-500', label: 'Média' },
        high: { color: 'bg-red-500', label: 'Alta' },
    };

    const detailSummary = () => {
        const parts = [];
        if (reminder.tasks && reminder.tasks.length > 0) {
            const taskText = reminder.tasks.length === 1 ? '1 subtarefa' : `${reminder.tasks.length} subtarefas`;
            parts.push(taskText);
        }
        if (reminder.notes) {
            parts.push('1 nota');
        }
        return parts.join(', ');
    };

    const handleDeleteClick = async () => {
        const confirmed = await modal.confirm({
            title: 'Confirmar Exclusão',
            message: 'Tem certeza que deseja excluir esta tarefa?',
            confirmLabel: 'Excluir',
            danger: true,
        });
        if (confirmed) {
            await deleteReminder(reminder.id);
        }
    };

    return (
        <div className={`rounded-lg flex items-start gap-0 transition-colors ${reminder.isCompleted ? 'bg-green-900/20' : isOverdue ? 'bg-red-900/30' : 'bg-gray-700/50'} ${isJustCompleted ? 'highlight-complete' : ''}`}>
            <div className={`w-1.5 self-stretch rounded-l-lg ${priorityInfo[priority].color}`} title={`Prioridade: ${priorityInfo[priority].label}`}></div>
            <div className="p-3 flex items-start gap-3 flex-grow">
                 <button
                    onClick={async () => await toggleReminderCompletion(reminder.id)}
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                        reminder.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-fuchsia-400'
                    }`}
                    aria-label={reminder.isCompleted ? "Marcar como pendente" : "Marcar como concluída"}
                >
                    {reminder.isCompleted && <CheckIcon className={`w-3 h-3 text-white ${isJustCompleted ? 'checkmark-pop-in' : ''}`} />}
                </button>
                <div className="flex-grow">
                    <p className={`text-sm font-medium ${reminder.isCompleted ? 'text-gray-400 line-through' : 'text-gray-200'}`}>{reminder.patientName}</p>
                    <div className={`flex items-center gap-1.5 text-xs mt-1 ${reminder.isCompleted ? 'text-gray-500' : isOverdue ? 'text-red-300' : 'text-gray-400'}`}>
                        <CalendarIcon className="w-3 h-3"/>
                        <span>{formattedDate}</span>
                        {reminder.recurrence !== 'none' && <RepeatIcon className="w-3 h-3 ml-1"><title>Repete {reminder.recurrence}</title></RepeatIcon>}
                    </div>

                    {hasDetails && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white mt-2 p-1 -ml-1 rounded focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                            aria-expanded={isExpanded}
                            aria-controls={`reminder-details-${reminder.id}`}
                        >
                            <span>{isExpanded ? 'Ocultar detalhes' : `Mostrar ${detailSummary()}`}</span>
                            <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}

                    {isExpanded && hasDetails && (
                         <div id={`reminder-details-${reminder.id}`} className="mt-2 space-y-2 animate-fade-in">
                            {reminder.notes && <p className="text-xs text-gray-400 italic mb-2">"{reminder.notes}"</p>}
                            {reminder.tasks && reminder.tasks.length > 0 && (
                               <ul className="space-y-1 pl-1 border-l-2 border-gray-600/50">
                                   {reminder.tasks.map(task => (
                                       <TaskItem key={task.id} task={task} onToggle={handleToggleTask} />
                                   ))}
                               </ul>
                           )}
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                     <button onClick={() => onEdit(reminder)} className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors" aria-label="Editar tarefa"><EditIcon className="w-4 h-4" /></button>
                     <button 
                        onClick={handleDeleteClick}
                        className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-red-400 transition-colors" 
                        aria-label="Excluir tarefa"
                     >
                        <Trash2Icon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const RemindersList: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { reminders } = useReminders();
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const pendingReminders = reminders.filter(r => !r.isCompleted).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const completedReminders = reminders.filter(r => r.isCompleted).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).slice(0, 5); // show last 5 completed

    return (
        <>
            <style>{`
                @keyframes highlight-green {
                    0% { background-color: rgba(74, 222, 128, 0.3); } /* green-400 with opacity */
                    100% { background-color: transparent; }
                }
                .highlight-complete {
                    animation: highlight-green 1.5s ease-out;
                }
                @keyframes checkmark-pop {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .checkmark-pop-in {
                    animation: checkmark-pop 0.5s ease-out;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
            {editingReminder && <ReminderModal reminder={editingReminder} onClose={() => setEditingReminder(null)} />}
            {isAddModalOpen && <ReminderModal onClose={() => setIsAddModalOpen(false)} />}
            <div className="absolute right-0 top-14 mt-2 w-80 max-h-[80vh] overflow-y-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl z-20" role="dialog">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-[#202124]/80 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-white">Tarefas e Lembretes</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
                            aria-label="Adicionar nova tarefa"
                        >
                            <PlusCircleIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Fechar lembretes"><XCircleIcon className="w-5 h-5"/></button>
                    </div>
                </div>
                <div className="p-4">
                    {reminders.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-sm">
                            <BellIcon className="w-8 h-8 mx-auto mb-2"/>
                            Nenhuma tarefa cadastrada.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Pending Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 mb-3">Pendentes</h4>
                                {pendingReminders.length > 0 ? (
                                    <div className="space-y-3">
                                        {pendingReminders.map(r => <ReminderItem key={r.id} reminder={r} onEdit={setEditingReminder} />)}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg">
                                        <CheckIcon className="w-8 h-8 mx-auto mb-2"/>
                                        Tudo em dia!
                                    </div>
                                )}
                            </div>

                            {/* Completed Section */}
                            {completedReminders.length > 0 && (
                                <div className="pt-4 border-t border-gray-700/50">
                                    <h4 className="text-sm font-semibold text-gray-400 mb-3">Concluídas Recentemente</h4>
                                    <div className="space-y-3">
                                        {completedReminders.map(r => <ReminderItem key={r.id} reminder={r} onEdit={setEditingReminder} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
