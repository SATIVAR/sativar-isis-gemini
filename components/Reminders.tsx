import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useReminders } from '../hooks/useReminders.ts';
import type { Reminder, Task } from '../types.ts';
import { BellIcon, CalendarIcon, CheckIcon, EditIcon, RepeatIcon, Trash2Icon, XCircleIcon, UserIcon, PackageIcon, FileTextIcon, PlusCircleIcon, ChevronDownIcon } from './icons.tsx';
import { Loader } from './Loader.tsx';
import { useModal } from '../hooks/useModal.ts';
import { Modal } from './Modal.tsx';

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
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const minDateTime = now.toISOString().slice(0, 16);

    const priorityOptions: { id: Reminder['priority']; label: string; color: string; ringColor: string }[] = [
        { id: 'low', label: 'Baixa', color: 'bg-blue-600', ringColor: 'border-blue-500' },
        { id: 'medium', label: 'Média', color: 'bg-yellow-600', ringColor: 'border-yellow-500' },
        { id: 'high', label: 'Alta', color: 'bg-red-600', ringColor: 'border-red-500' },
    ];

    return (
        <Modal
            title={reminder ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
            onClose={handleCloseAttempt}
            size="lg"
            icon={<BellIcon className="w-6 h-6 text-fuchsia-400" />}
            footer={
                <>
                    <button type="button" onClick={handleCloseAttempt} className="px-5 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors">Cancelar</button>
                    <button 
                        type="submit" 
                        form="reminder-form"
                        disabled={isSaving}
                        className="flex items-center justify-center min-w-[160px] px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isSaving ? <Loader /> : (reminder ? 'Salvar Alterações' : 'Criar Tarefa')}
                    </button>
                </>
            }
        >
             <form id="reminder-form" onSubmit={handleSubmit} className="space-y-4">
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
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-max bg-gray-900 border border-gray-700 p-1 rounded-lg shadow-lg flex gap-1">
                                                {availableIcons.map(({ name, Component, title }) => (
                                                    <button
                                                        key={name}
                                                        type="button"
                                                        onClick={() => handleSetTaskIcon(task.id, name)}
                                                        className="p-2 rounded-md hover:bg-fuchsia-800/50"
                                                        title={title}
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
                                        className="flex-grow bg-transparent text-gray-300 outline-none focus:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2Icon className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                     <div className="flex items-center gap-2 mt-2">
                        <PlusCircleIcon className="w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                            onBlur={handleAddTask}
                            placeholder="Adicionar subtarefa e pressionar Enter"
                            className="flex-grow bg-transparent text-gray-400 placeholder-gray-500 outline-none focus:text-white text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">Notas</label>
                    <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition"></textarea>
                </div>
                 <div>
                    <label htmlFor="recurrence" className="block text-sm font-medium text-gray-300 mb-2">Repetir</label>
                    <select id="recurrence" value={recurrence} onChange={e => setRecurrence(e.target.value as Reminder['recurrence'])} className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition">
                        <option value="none">Nunca</option>
                        <option value="daily">Diariamente</option>
                        <option value="weekly">Semanalmente</option>
                        <option value="monthly">Mensalmente</option>
                    </select>
                </div>
            </form>
        </Modal>
    );
};


// Main Reminders List Component
interface RemindersListProps {
  onClose: () => void;
}

const getRelativeDueDate = (dueDate: string): { text: string; isOverdue: boolean } => {
    const now = new Date();
    const due = new Date(dueDate);
    
    // Reset time for date comparisons
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diffTime = dueDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isOverdue = due < now;

    const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(due);

    if (diffDays === 0) return { text: `Hoje às ${timeFormat}`, isOverdue };
    if (diffDays === 1) return { text: `Amanhã às ${timeFormat}`, isOverdue };
    if (diffDays === -1) return { text: `Ontem às ${timeFormat}`, isOverdue: true };
    if (isOverdue) return { text: `Venceu em ${due.toLocaleDateString('pt-BR')}`, isOverdue: true };
    
    return { text: `${due.toLocaleDateString('pt-BR')} às ${timeFormat}`, isOverdue: false };
};

export const RemindersList: React.FC<RemindersListProps> = ({ onClose }) => {
    const { reminders, toggleReminderCompletion, deleteReminder } = useReminders();
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [isCreatingReminder, setIsCreatingReminder] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const modal = useModal();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);
    
    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent card from being marked as complete
        const confirmed = await modal.confirm({
            title: "Confirmar Exclusão",
            message: "Tem certeza que deseja apagar esta tarefa? Lembretes recorrentes não serão recriados.",
            confirmLabel: "Apagar",
            danger: true,
        });
        if (confirmed) {
            deleteReminder(id);
        }
    };

    const handleEdit = (e: React.MouseEvent, reminder: Reminder) => {
        e.stopPropagation();
        setEditingReminder(reminder);
    };

    const sortedReminders = useMemo(() => {
        return [...reminders].sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
    }, [reminders]);

    const PriorityIndicator: React.FC<{ priority: Reminder['priority'] }> = ({ priority }) => {
        const priorityStyles: Record<Reminder['priority'], string> = {
            low: 'bg-blue-500',
            medium: 'bg-yellow-500',
            high: 'bg-red-500',
        };
        return <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${priorityStyles[priority]}`} title={`Prioridade: ${priority}`}></span>;
    };
    
    return (
        <>
            {editingReminder && <ReminderModal reminder={editingReminder} onClose={() => setEditingReminder(null)} />}
            {isCreatingReminder && <ReminderModal onClose={() => setIsCreatingReminder(false)} />}
            <div ref={modalRef} className="absolute top-14 right-4 w-80 max-h-[80vh] bg-[#202124] border border-gray-700 rounded-xl shadow-2xl flex flex-col z-20 overflow-hidden">
                <header className="flex-shrink-0 p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Tarefas e Lembretes</h2>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setIsCreatingReminder(true)} 
                            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
                            aria-label="Adicionar nova tarefa"
                            title="Adicionar nova tarefa"
                        >
                            <PlusCircleIcon className="w-6 h-6"/>
                        </button>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Fechar">
                            <XCircleIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </header>
                <div className="flex-grow overflow-y-auto p-2">
                    {sortedReminders.length === 0 ? (
                        <div className="text-center text-gray-500 py-10 px-4">
                            <BellIcon className="w-12 h-12 mx-auto mb-2" />
                            <p className="font-semibold">Nenhuma tarefa pendente</p>
                            <p className="text-sm">Você está em dia!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sortedReminders.map(reminder => {
                                const { text: dueDateText, isOverdue } = getRelativeDueDate(reminder.dueDate);
                                const priority = reminder.priority || 'medium';
                                return (
                                    <div key={reminder.id} className="group relative">
                                        <div 
                                            onClick={() => toggleReminderCompletion(reminder.id)}
                                            className={`w-full p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                                reminder.isCompleted ? 'bg-green-900/40 hover:bg-green-900/60 opacity-60' : 'bg-[#303134] hover:bg-gray-700/80'
                                            }`}
                                        >
                                            <PriorityIndicator priority={priority} />
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 flex-shrink-0">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                        reminder.isCompleted ? 'bg-green-500 border-green-400' : 'border-gray-500 group-hover:border-green-500'
                                                    }`}>
                                                        {reminder.isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className={`font-medium text-white ${reminder.isCompleted ? 'line-through' : ''}`}>
                                                        {reminder.patientName}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-1 text-xs">
                                                        <CalendarIcon className={`w-3 h-3 ${isOverdue && !reminder.isCompleted ? 'text-red-400' : 'text-gray-400'}`} />
                                                        <span className={isOverdue && !reminder.isCompleted ? 'text-red-400 font-semibold' : 'text-gray-400'}>
                                                            {dueDateText}
                                                        </span>
                                                        {reminder.recurrence !== 'none' && <RepeatIcon className="w-3 h-3 text-gray-400" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                         <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            {!reminder.isCompleted && (
                                                <button onClick={(e) => handleEdit(e, reminder)} className="p-1 text-gray-400 hover:text-fuchsia-400 rounded-full hover:bg-gray-800"><EditIcon className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={(e) => handleDelete(e, reminder.id)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-800"><Trash2Icon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};