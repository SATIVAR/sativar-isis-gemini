
import React, { useState, useEffect } from 'react';
import { useSimpleReminders, getTodayDateString } from '../hooks/useSimpleReminders';
import type { Reminder, Task } from '../types';
import { BellIcon, CalendarIcon, CheckIcon, Trash2Icon, PackageIcon, AlertTriangleIcon, RepeatIcon, SearchIcon, XCircleIcon, PlusIcon, EditIcon } from './icons';

interface ReminderModalProps {
    onClose: () => void;
    quoteId?: string;
    patientName?: string;
    reminderToEdit?: Reminder | null;
}

const getNextHourTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    return now.toTimeString().slice(0, 5); // HH:MM format
};

export const ReminderModal: React.FC<ReminderModalProps> = ({ onClose, quoteId, patientName, reminderToEdit }) => {
    const { addReminder, updateReminder } = useSimpleReminders();
    
    const [title, setTitle] = useState(reminderToEdit?.title || (patientName ? `Acompanhamento ${patientName}`: ''));
    const [tasks, setTasks] = useState<Partial<Task>[]>(reminderToEdit?.tasks || [{ text: '' }]);
    const [newTaskText, setNewTaskText] = useState('');
    const [dueDate, setDueDate] = useState(reminderToEdit?.dueDate || getTodayDateString());
    const [dueTime, setDueTime] = useState(reminderToEdit?.dueTime || getNextHourTime());

    const handleAddTask = () => {
        if (newTaskText.trim()) {
            setTasks([...tasks, { text: newTaskText.trim() }]);
            setNewTaskText('');
        }
    };

    const handleRemoveTask = (index: number) => {
        setTasks(tasks.filter((_, i) => i !== index));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            alert('Por favor, preencha o título da tarefa.');
            return;
        }
        const finalTasks = tasks.filter(t => t.text && t.text.trim() !== '');
        if (finalTasks.length === 0) {
             alert('Adicione pelo menos uma subtarefa.');
            return;
        }

        const reminderData = {
            title,
            dueDate,
            dueTime,
            quoteId,
            patientName,
            // These properties are not yet editable in the modal, keeping them for future.
            recurrence: reminderToEdit?.recurrence || 'none',
            endDate: reminderToEdit?.endDate,
            parentId: reminderToEdit?.parentId,
        };

        if (reminderToEdit) {
            updateReminder({
                ...reminderToEdit,
                ...reminderData,
                tasks: finalTasks as Task[],
            });
        } else {
            addReminder({
                ...reminderData,
                tasks: finalTasks.map(t => ({ text: t.text! }))
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#303134] rounded-xl border border-gray-700 p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <h3 className="text-xl font-bold mb-1 text-white">{reminderToEdit ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</h3>
                    {patientName && <p className="text-sm text-gray-400 mb-6">Relacionado a: <span className="font-semibold text-fuchsia-300">{patientName}</span></p>}
                    
                    <div className="space-y-4">
                        <div>
                          <label htmlFor="reminderTitle" className="block text-sm font-medium text-gray-300 mb-2">Título</label>
                          <input 
                            id="reminderTitle" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" 
                            placeholder="Ex: Fazer acompanhamento com paciente"
                            required 
                           />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Subtarefas</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {tasks.map((task, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={task.text}
                                            onChange={(e) => {
                                                const newTasks = [...tasks];
                                                newTasks[index].text = e.target.value;
                                                setTasks(newTasks);
                                            }}
                                            className="w-full bg-[#202124] border border-gray-700/80 text-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-fuchsia-500 outline-none"
                                            placeholder="Descreva a subtarefa"
                                        />
                                        <button type="button" onClick={() => handleRemoveTask(index)} className="p-1 text-gray-500 hover:text-red-400">
                                            <Trash2Icon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                             <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="text"
                                    value={newTaskText}
                                    onChange={(e) => setNewTaskText(e.target.value)}
                                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddTask(); }}}
                                    className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-fuchsia-500 outline-none"
                                    placeholder="Adicionar nova subtarefa..."
                                />
                                <button type="button" onClick={handleAddTask} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600">
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-2">Data de Vencimento</label>
                              <input 
                                type="date"
                                id="dueDate" 
                                value={dueDate} 
                                onChange={e => setDueDate(e.target.value)} 
                                className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" 
                                required 
                              />
                            </div>
                            <div>
                              <label htmlFor="dueTime" className="block text-sm font-medium text-gray-300 mb-2">Hora (Opcional)</label>
                              <input 
                                type="time"
                                id="dueTime" 
                                value={dueTime} 
                                onChange={e => setDueTime(e.target.value)} 
                                className="w-full bg-[#202124] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" 
                              />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors">Cancelar</button>
                        <button type="submit" className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const NotificationManager: React.FC = () => {
    const { notificationPermission, requestNotificationPermission } = useSimpleReminders();
    
    if (notificationPermission === 'granted') {
        return (
            <div className="flex items-center justify-center gap-2 text-xs text-green-400 p-2 bg-green-900/30 rounded-md">
                <CheckIcon className="w-4 h-4 flex-shrink-0" />
                <span>Notificações de lembretes estão ativas.</span>
            </div>
        );
    }

    if (notificationPermission === 'denied') {
        return (
            <div className="flex items-start gap-2 text-xs text-yellow-400 p-2 bg-yellow-900/30 rounded-md">
                <AlertTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                    Notificações bloqueadas. Habilite nas configurações do seu navegador para receber alertas.
                </span>
            </div>
        );
    }
    
    return (
        <button 
            onClick={requestNotificationPermission}
            className="w-full text-center px-3 py-2 bg-fuchsia-700 text-sm text-white font-semibold rounded-lg shadow-md hover:bg-fuchsia-800 transition-colors"
        >
            Ativar Notificações de Lembretes
        </button>
    );
};


interface RemindersListProps {
    onClose: () => void;
}

const ReminderItem: React.FC<{reminder: Reminder; onEdit: (reminder: Reminder) => void;}> = ({ reminder, onEdit }) => {
    const { toggleTask, deleteReminder } = useSimpleReminders();
    
    const now = new Date();
    const reminderDateTime = new Date(`${reminder.dueDate}T${reminder.dueTime || '23:59:59.999'}`);
    const isOverdue = !reminder.isCompleted && now > reminderDateTime;

    const completedTasks = reminder.tasks.filter(t => t.isCompleted).length;
    const totalTasks = reminder.tasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <div 
            onClick={() => onEdit(reminder)}
            className={`p-3 rounded-lg transition-colors border border-transparent cursor-pointer ${isOverdue ? 'bg-red-900/20 border-red-800/30' : 'hover:bg-gray-700/50'}`}
        >
            <div className="flex items-start gap-3">
                <div className="flex-grow">
                    <p className={`font-semibold text-sm ${reminder.isCompleted ? 'line-through text-gray-500' : isOverdue ? 'text-red-300' : 'text-gray-200'}`}>
                        {reminder.title}
                    </p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
                        {reminder.patientName && (
                            <div className="flex items-center gap-1.5" title="Associado ao orçamento de">
                                <PackageIcon className="w-3 h-3"/>
                                <span className={reminder.isCompleted ? 'text-gray-500' : 'text-gray-400'}>{reminder.patientName}</span>
                            </div>
                        )}
                        <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-400 font-semibold' : ''}`} title="Data de conclusão">
                            <CalendarIcon className="w-3 h-3" />
                            <span>{isOverdue ? 'Vencido' : ''} {reminder.dueDate}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center flex-shrink-0">
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteReminder(reminder.id); }} 
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors" 
                        aria-label="Excluir tarefa"
                    >
                        <Trash2Icon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            {totalTasks > 0 && (
                <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{completedTasks}/{totalTasks}</span>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div className="bg-fuchsia-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                    <div className="space-y-1.5 pl-2 max-h-28 overflow-y-auto">
                        {reminder.tasks.map(task => (
                            <div key={task.id} className="flex items-center gap-2 text-sm">
                                <input 
                                    type="checkbox"
                                    id={`task-${task.id}`}
                                    checked={task.isCompleted}
                                    onChange={() => toggleTask(reminder.id, task.id)}
                                    className="w-4 h-4 bg-gray-600 border-gray-500 rounded text-fuchsia-500 focus:ring-fuchsia-600 focus:ring-2"
                                />
                                <label htmlFor={`task-${task.id}`} className={`flex-grow cursor-pointer ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                                    {task.text}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const FilterButton: React.FC<{
    label: string;
    value: 'all' | 'pending' | 'completed';
    current: string;
    onClick: (value: 'all' | 'pending' | 'completed') => void;
}> = ({ label, value, current, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
            current === value 
                ? 'bg-fuchsia-600 text-white' 
                : 'bg-gray-700/60 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
);

const ConfirmationDialog: React.FC<{ 
    title: string; message: string; confirmText: string; cancelText: string; 
    onConfirm: () => void; onCancel: () => void; confirmButtonClass?: string;
}> = ({ title, message, confirmText, cancelText, onConfirm, onCancel, confirmButtonClass = "bg-red-600 hover:bg-red-700" }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div className="bg-[#303134] rounded-xl border border-gray-700 p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
                <p className="text-gray-400 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2 bg-gray-700 text-sm text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors">{cancelText}</button>
                    <button onClick={onConfirm} className={`px-5 py-2 text-white font-semibold rounded-lg shadow-md transition-colors ${confirmButtonClass}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

export const RemindersList: React.FC<RemindersListProps> = ({ onClose }) => {
    const { reminders, clearCompletedReminders } = useSimpleReminders();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

    const filteredReminders = reminders.filter(r => {
        const query = searchQuery.toLowerCase();
        const contentMatch = r.title.toLowerCase().includes(query) || 
                             (r.patientName && r.patientName.toLowerCase().includes(query)) ||
                             r.tasks.some(t => t.text.toLowerCase().includes(query));

        const statusMatch = statusFilter === 'all' || 
                            (statusFilter === 'pending' && !r.isCompleted) || 
                            (statusFilter === 'completed' && r.isCompleted);

        return contentMatch && statusMatch;
    });

    const pending = filteredReminders.filter(r => !r.isCompleted).sort((a, b) => new Date(`${a.dueDate}T${a.dueTime || '00:00'}`).getTime() - new Date(`${b.dueDate}T${b.dueTime || '00:00'}`).getTime());
    const completed = filteredReminders.filter(r => r.isCompleted).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    const handleConfirmClear = () => {
        clearCompletedReminders();
        setIsClearConfirmOpen(false);
    }

    return (
        <>
            {isClearConfirmOpen && (
                <ConfirmationDialog
                    title="Limpar Tarefas Concluídas"
                    message={`Tem certeza que deseja excluir permanentemente as ${completed.length} tarefas concluídas? Esta ação não pode ser desfeita.`}
                    confirmText="Excluir Todas"
                    cancelText="Cancelar"
                    onConfirm={handleConfirmClear}
                    onCancel={() => setIsClearConfirmOpen(false)}
                />
            )}
            {editingReminder && <ReminderModal reminderToEdit={editingReminder} onClose={() => setEditingReminder(null)} />}
            <div className="absolute top-full right-0 mt-2 w-80 md:w-96 max-h-[70vh] bg-[#303134] rounded-xl border border-gray-700 shadow-2xl z-20 flex flex-col">
                <div className="p-4 border-b border-gray-700 flex-shrink-0">
                    <h3 className="font-bold text-white text-lg">Tarefas e Lembretes</h3>
                </div>
                <div className="p-3 border-b border-gray-700 flex-shrink-0 space-y-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por título, paciente, tarefa..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[#202124] border border-gray-600/50 text-gray-300 rounded-lg py-1.5 pl-9 pr-3 text-sm focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner"
                            aria-label="Buscar tarefas"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">Status</span>
                        <div className="flex items-center gap-2">
                            <FilterButton label="Todos" value="all" current={statusFilter} onClick={setStatusFilter} />
                            <FilterButton label="Pendentes" value="pending" current={statusFilter} onClick={setStatusFilter} />
                            <FilterButton label="Concluídos" value="completed" current={statusFilter} onClick={setStatusFilter} />
                        </div>
                    </div>
                </div>
                <div className="p-3 border-b border-gray-700 flex-shrink-0">
                    <NotificationManager />
                </div>
                <div className="p-2 space-y-2 overflow-y-auto">
                    {reminders.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <BellIcon className="w-10 h-10 mx-auto text-gray-600"/>
                            <p className="mt-2 text-sm font-semibold text-gray-400">Nenhuma tarefa</p>
                            <p className="text-xs text-gray-500">Crie tarefas pelo botão '+' no topo ou a partir de orçamentos.</p>
                        </div>
                    ) : filteredReminders.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <SearchIcon className="w-10 h-10 mx-auto text-gray-600"/>
                            <p className="mt-2 text-sm font-semibold text-gray-400">Nenhum resultado</p>
                            <p className="text-xs text-gray-500">Nenhuma tarefa encontrada com os filtros aplicados.</p>
                        </div>
                    ) : (
                        <>
                            {(statusFilter === 'all' || statusFilter === 'pending') && pending.length > 0 && (
                                <div>
                                    <h4 className="px-2 text-xs font-bold uppercase text-gray-500 tracking-wider">
                                        A Fazer ({pending.length})
                                    </h4>
                                    <div className="mt-1 space-y-1">
                                        {pending.map(r => <ReminderItem key={r.id} reminder={r} onEdit={setEditingReminder} />)}
                                    </div>
                                </div>
                            )}
                            {(statusFilter === 'all' || statusFilter === 'completed') && completed.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center px-2 pt-2">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                                            Concluídos ({completed.length})
                                        </h4>
                                        <button 
                                            onClick={() => setIsClearConfirmOpen(true)}
                                            className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 rounded-md hover:bg-red-900/40 hover:text-red-400 transition-colors"
                                            aria-label="Limpar todas as tarefas concluídas"
                                        >
                                            <Trash2Icon className="w-3 h-3" />
                                            Limpar
                                        </button>
                                    </div>
                                    <div className="mt-1 space-y-1">
                                        {completed.map(r => <ReminderItem key={r.id} reminder={r} onEdit={setEditingReminder} />)}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
