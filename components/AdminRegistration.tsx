
import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons.tsx';
import { useModal } from '../hooks/useModal.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { Logo } from './Logo.tsx';

interface AdminRegistrationProps {
  onRegistrationSuccess: () => void;
}

export const AdminRegistration: React.FC<AdminRegistrationProps> = ({ onRegistrationSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const modal = useModal();
  const auth = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    try {
        await auth.registerAdmin(username, password);
        setError('');
        modal.alert({
            title: 'Sucesso!',
            message: 'Administrador cadastrado com sucesso! Você será redirecionado para a tela de login.'
        });
        onRegistrationSuccess();
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
        setError(`Não foi possível salvar as credenciais: ${errorMessage}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full text-gray-300 font-sans p-4">
      <Logo className="h-24 w-24 mb-6" />
      <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo(a) ao SATIVAR</h1>
      <p className="text-lg text-gray-400 mb-8">Vamos começar configurando sua conta de superadministrador.</p>

      <div className="w-full max-w-md bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-8">
        <h2 className="text-2xl font-bold text-center text-white mb-2">Cadastrar Superadministrador</h2>
        <p className="text-center text-gray-400 mb-6">Este é o primeiro acesso. Defina as credenciais do administrador.</p>
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Usuário (Nome de Login)
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#303134] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <div className="relative">
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#303134] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition pr-10"
                  required
                  autoComplete="new-password"
                />
                <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                    aria-label={isPasswordVisible ? "Esconder senha" : "Mostrar senha"}
                >
                    {isPasswordVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
            </div>
          </div>
           <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Senha
            </label>
            <div className="relative">
                <input
                  type={isConfirmVisible ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#303134] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition pr-10"
                  required
                  autoComplete="new-password"
                />
                <button
                    type="button"
                    onClick={() => setIsConfirmVisible(!isConfirmVisible)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                    aria-label={isConfirmVisible ? "Esconder senha" : "Mostrar senha"}
                >
                    {isConfirmVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
            </div>
          </div>
          
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div>
            <button type="submit" className="w-full mt-2 px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500">
              Cadastrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
