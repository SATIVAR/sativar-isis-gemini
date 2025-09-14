import React, { useState } from 'react';
import { Logo } from './Logo.tsx';
import { SparklesIcon, BriefcaseIcon, SettingsIcon, CheckCircleIcon } from './icons.tsx';

interface OnboardingGuideProps {
  onComplete: () => void;
}

interface StepContent {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  buttonText: string;
}

const steps: StepContent[] = [
  {
    icon: <Logo className="h-20 w-20 mb-4" />,
    title: 'Bem-vindo(a) ao SATIVAR - Isis!',
    description: (
      <p>
        Seu assistente de IA para otimizar o atendimento da sua associação.
        <br />
        Vamos configurar o sistema em poucos passos para que você possa começar a gerar orçamentos.
      </p>
    ),
    buttonText: 'Vamos começar!',
  },
  {
    icon: <SparklesIcon className="h-16 w-16 mb-4 text-fuchsia-300" />,
    title: 'Modo Isis: O Cérebro da Operação',
    description: (
      <ul className="list-disc list-inside space-y-2 text-left mx-auto max-w-sm">
        <li><b>Analisar Receitas:</b> Envie uma imagem ou PDF e a IA gera um orçamento completo.</li>
        <li><b>Consultar Informações:</b> Busque produtos e associados do seu sistema.</li>
        <li><b>Agilizar a Comunicação:</b> Use mensagens prontas e agende lembretes com um clique.</li>
      </ul>
    ),
    buttonText: 'Próximo',
  },
  {
    icon: <BriefcaseIcon className="h-16 w-16 mb-4 text-blue-300" />,
    title: 'Modo Seishat: Seu CRM Integrado',
    description: (
      <p>
        O Modo Seishat é o seu centro de gerenciamento (atualmente em desenvolvimento), onde você poderá gerenciar pacientes, prescritores, pedidos e relatórios.
      </p>
    ),
    buttonText: 'Próximo',
  },
  {
    icon: <SettingsIcon className="h-16 w-16 mb-4 text-gray-300" />,
    title: 'Configuração Inicial Essencial',
    description: (
      <p>
        Para que a mágica aconteça, precisamos configurar duas coisas:
        <br /><br />
        <b>1. Dados da Associação:</b> Informações como nome, PIX e horários.
        <br />
        <b>2. Conexões de API:</b> Para habilitar a IA e a busca de produtos.
      </p>
    ),
    buttonText: 'Entendido, vamos lá!',
  },
  {
    icon: <CheckCircleIcon className="h-16 w-16 mb-4 text-green-400" />,
    title: 'Tudo Pronto!',
    description: (
      <p>
        A configuração guiada terminou. Agora, você será direcionado(a) para a página de <b>Configurações</b>. Preencha os dados para ativar todas as funcionalidades do sistema.
      </p>
    ),
    buttonText: 'Finalizar e ir para Configurações',
  },
];

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-fade-in">
        <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
        `}</style>
      <div className="bg-[#202124] rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl text-center p-8 animate-slide-up">
        {step.icon}
        <h2 className="text-2xl font-bold text-white mt-2 mb-4">{step.title}</h2>
        <div className="text-gray-300 mb-8">{step.description}</div>
        
        <div className="flex justify-center items-center gap-4 mb-4">
            {steps.map((_, index) => (
                <div 
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${index === currentStep ? 'w-6 bg-fuchsia-500' : 'w-2 bg-gray-600'}`}
                />
            ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full max-w-xs px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500"
        >
          {step.buttonText}
        </button>
      </div>
    </div>
  );
};