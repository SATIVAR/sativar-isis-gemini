import React from 'react';
import {
    CalendarIcon,
    TableIcon,
    BookIcon,
    FileTextIcon,
    CheckSquareIcon,
    DollarSignIcon,
    SunriseIcon,
    CoffeeIcon,
    BookOpenIcon,
    UtensilsIcon,
    PersonRunningIcon,
    SparklesIcon
} from '../icons.tsx';

// Mock data based on the image
const dailyTasks = [
    { icon: <SunriseIcon className="w-4 h-4 text-gray-400" />, activity: 'Acordar e fazer higiene', status: 'Concluído', statusColor: 'text-green-400' },
    { icon: <CoffeeIcon className="w-4 h-4 text-gray-400" />, activity: 'Tomar café da manhã', status: 'Em andamento', statusColor: 'text-yellow-400' },
    { icon: <BookOpenIcon className="w-4 h-4 text-gray-400" />, activity: 'Trabalhar ou estudar', status: 'Não iniciada', statusColor: 'text-gray-500' },
    { icon: <UtensilsIcon className="w-4 h-4 text-gray-400" />, activity: 'Almoçar', status: 'Não iniciada', statusColor: 'text-gray-500' },
    { icon: <PersonRunningIcon className="w-4 h-4 text-gray-400" />, activity: 'Treinar', status: 'Não iniciada', statusColor: 'text-gray-500' },
];

const templates = [
    { icon: <BookIcon className="w-6 h-6 text-gray-300" />, title: 'Wiki da vida', author: 'Pelo Notion' },
    { icon: <FileTextIcon className="w-6 h-6 text-gray-300" />, title: 'Diário', author: 'Pelo Notion' },
    { icon: <CheckSquareIcon className="w-6 h-6 text-gray-300" />, title: 'Lista de tarefas', author: 'Pelo Notion' },
    { icon: <DollarSignIcon className="w-6 h-6 text-gray-300" />, title: 'Orçamento', author: 'Pelo Notion' },
];


export const DashboardPage: React.FC = () => {
    return (
        <div className="p-2 space-y-8">
            {/* Upcoming Events Section */}
            <div className="bg-[#202124] rounded-xl border border-gray-700 p-6">
                <h2 className="flex items-center gap-3 text-lg font-semibold text-gray-200 mb-4">
                    <CalendarIcon className="w-5 h-5" />
                    Próximos eventos
                </h2>
                <div className="flex flex-col items-center justify-center text-center text-gray-400 py-12">
                    <div className="relative mb-4">
                        <CalendarIcon className="w-16 h-16 text-gray-600" />
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] text-lg font-bold text-gray-500">
                            {new Date().getDate()}
                        </span>
                    </div>
                    <p className="mb-4">Não há eventos nos próximos 3 dias</p>
                    <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        + Novo evento
                    </button>
                </div>
            </div>

            {/* Homepage Views Section */}
            <div className="bg-[#202124] rounded-xl border border-gray-700 p-6">
                <h2 className="flex items-center gap-3 text-lg font-semibold text-gray-200 mb-4">
                    <TableIcon className="w-5 h-5" />
                    Visualizações da página inicial
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col items-start justify-center text-gray-400">
                        <div className="p-3 border-2 border-dashed border-gray-600 rounded-lg mb-4">
                            <TableIcon className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="mb-4 text-sm">
                            Fixe uma visualização da base de dados para que você possa acessá-la rapidamente na página inicial.
                        </p>
                        <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            Selecionar base de dados
                        </button>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 font-medium pb-2 border-b border-gray-700">
                            <span>Atividade</span>
                            <span>Status</span>
                        </div>
                        <ul className="mt-2 space-y-2">
                            {dailyTasks.map((task, index) => (
                                <li key={index} className="flex justify-between items-center text-sm p-1 rounded hover:bg-gray-700/50">
                                    <div className="flex items-center gap-3 text-gray-300">
                                        {task.icon}
                                        <span>{task.activity}</span>
                                    </div>
                                    <span className={`${task.statusColor}`}>{task.status}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Featured Templates Section */}
            <div>
                 <h2 className="flex items-center gap-3 text-lg font-semibold text-gray-200 mb-4 ml-2">
                    <SparklesIcon className="w-5 h-5" />
                    Modelos em destaque
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {templates.map((template, index) => (
                        <div key={index} className="bg-[#202124] rounded-xl border border-gray-700 p-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3 mb-2">
                                {template.icon}
                                <div>
                                    <p className="font-semibold text-gray-200">{template.title}</p>
                                    <p className="text-xs text-gray-500">{template.author}</p>
                                </div>
                            </div>
                            <div className="w-full h-24 bg-[#303134] rounded-lg mt-3 flex items-center justify-center">
                                <span className="text-xs text-gray-600">Preview</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
