


import React from 'react';
import { useSettings } from '../../hooks/useSettings.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { UsersIcon, SparklesIcon } from '../icons.tsx';

// Renamed from SystemStatusPage to AssociationPage
export const AssociationPage: React.FC = () => {
  const { formState, setFormState, errors } = useSettings();
  const { user } = useAuth();
  
  // A simple handler that can be reused
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleChange = (name: string, value: boolean) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-2">
        <UsersIcon className="w-8 h-8 text-fuchsia-300" />
        <h2 className="text-2xl font-bold text-white">Configurações da Associação</h2>
      </div>
      <p className="mt-2 text-gray-400 mb-8">
        Essas informações serão usadas pela Ísis para gerar os orçamentos e se comunicar com os pacientes.
      </p>

      {/* Note: The form submission is handled globally by the context for now */}
      <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <h3 className="text-lg font-semibold text-fuchsia-300">Dados Institucionais e de Contato</h3>
             <div>
                <label htmlFor="associationName" className="block text-sm font-medium text-gray-300 mb-2">Nome da Associação</label>
                <input id="associationName" name="associationName" value={formState.associationName} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.associationName ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                {errors.associationName && <p className="text-red-400 text-xs mt-1">{errors.associationName}</p>}
            </div>
             <div>
                <label htmlFor="about" className="block text-sm font-medium text-gray-300 mb-2">Sobre a Associação</label>
                <textarea id="about" name="about" value={formState.about} onChange={handleInputChange} rows={3} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
            </div>
             <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">Endereço</label>
                <input id="address" name="address" value={formState.address} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300 mb-2">WhatsApp</label>
                    <input id="whatsapp" name="whatsapp" value={formState.whatsapp} onChange={handleInputChange} placeholder="(XX) 91234-5678" className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.whatsapp ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.whatsapp && <p className="text-red-400 text-xs mt-1">{errors.whatsapp}</p>}
                </div>
                <div>
                    <label htmlFor="site" className="block text-sm font-medium text-gray-300 mb-2">Site</label>
                    <input id="site" name="site" value={formState.site} onChange={handleInputChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
                </div>
                 <div>
                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-300 mb-2">Instagram</label>
                    <input id="instagram" name="instagram" value={formState.instagram} onChange={handleInputChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
                </div>
            </div>
          </div>
          
           <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
            <h3 className="text-lg font-semibold text-fuchsia-300">Dados Operacionais e Financeiros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="operatingHours" className="block text-sm font-medium text-gray-300 mb-2">Horário de Funcionamento</label>
                    <input id="operatingHours" name="operatingHours" value={formState.operatingHours} onChange={handleInputChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
                </div>
                <div>
                    <label htmlFor="productionTime" className="block text-sm font-medium text-gray-300 mb-2">Prazo de Produção/Entrega</label>
                    <input id="productionTime" name="productionTime" value={formState.productionTime} onChange={handleInputChange} className="w-full bg-[#303134] border border-gray-600/50 text-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition shadow-inner" />
                </div>
            </div>
            <div className="pt-4 border-t border-gray-700/50 space-y-4">
                <div>
                    <label htmlFor="shippingContext" className="block text-sm font-medium text-gray-300 mb-2">Texto para Frete</label>
                    <textarea id="shippingContext" name="shippingContext" value={formState.shippingContext} onChange={handleInputChange} rows={2} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.shippingContext ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.shippingContext && <p className="text-red-400 text-xs mt-1">{errors.shippingContext}</p>}
                </div>

                <div>
                    <label htmlFor="paymentContext" className="block text-sm font-medium text-gray-300 mb-2">Texto para Formas de Pagamento</label>
                    <textarea id="paymentContext" name="paymentContext" value={formState.paymentContext} onChange={handleInputChange} rows={3} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.paymentContext ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.paymentContext && <p className="text-red-400 text-xs mt-1">{errors.paymentContext}</p>}
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                    <label htmlFor="prescriptionValidityMonths" className="block text-sm font-medium text-gray-300 mb-2">Validade da Receita (meses)</label>
                    <input
                        type="number"
                        id="prescriptionValidityMonths"
                        name="prescriptionValidityMonths"
                        value={formState.prescriptionValidityMonths}
                        onChange={handleInputChange}
                        className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.prescriptionValidityMonths ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`}
                        min="1"
                    />
                    {errors.prescriptionValidityMonths && <p className="text-red-400 text-xs mt-1">{errors.prescriptionValidityMonths}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="pixKey" className="block text-sm font-medium text-gray-300 mb-2">Chave PIX (CNPJ)</label>
                    <input id="pixKey" name="pixKey" value={formState.pixKey} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.pixKey ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.pixKey && <p className="text-red-400 text-xs mt-1">{errors.pixKey}</p>}
                </div>
                <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">Razão Social</label>
                    <input id="companyName" name="companyName" value={formState.companyName} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.companyName ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.companyName && <p className="text-red-400 text-xs mt-1">{errors.companyName}</p>}
                </div>
                 <div>
                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-300 mb-2">Nome do Banco</label>
                    <input id="bankName" name="bankName" value={formState.bankName} onChange={handleInputChange} className={`w-full bg-[#303134] border text-gray-300 rounded-lg p-3 text-sm focus:ring-2 outline-none transition shadow-inner ${errors.bankName ? 'border-red-500 focus:ring-red-500' : 'border-gray-600/50 focus:ring-fuchsia-500 focus:border-fuchsia-500'}`} />
                    {errors.bankName && <p className="text-red-400 text-xs mt-1">{errors.bankName}</p>}
                </div>
            </div>
          </div>
          
          {user?.role === 'admin' && (
             <div className="space-y-6 p-6 bg-[#303134]/50 border border-gray-700/50 rounded-lg">
                <h3 className="text-lg font-semibold text-fuchsia-300">Controle de Módulos</h3>
                <div className="flex items-center justify-between p-4 bg-[#202124] rounded-lg border border-gray-600/50">
                    <label htmlFor="isis-toggle" className="flex-grow">
                        <div className="flex items-center gap-3">
                            <SparklesIcon className="w-6 h-6 text-fuchsia-300"/>
                            <div>
                                <p className="font-semibold text-white">Habilitar Modo Isis (IA)</p>
                                <p className="text-xs text-gray-400">Permite que os usuários acessem as funcionalidades de inteligência artificial.</p>
                            </div>
                        </div>
                    </label>
                    <button
                        type="button"
                        id="isis-toggle"
                        onClick={() => handleToggleChange('isIsisAiEnabled', !formState.isIsisAiEnabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 focus:ring-offset-[#202124] ${formState.isIsisAiEnabled ? 'bg-green-600' : 'bg-gray-600'}`}
                        role="switch"
                        aria-checked={formState.isIsisAiEnabled}
                    >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formState.isIsisAiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>
          )}
      </form>
    </div>
  );
};
