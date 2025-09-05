import React, { useState } from 'react';

interface AdminRegistrationProps {
  onRegistrationSuccess: () => void;
}

const ADMIN_STORAGE_KEY = 'sativar_isis_admin_credentials';

export const AdminRegistration: React.FC<AdminRegistrationProps> = ({ onRegistrationSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
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
        const adminCredentials = { username, password };
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminCredentials));
        setError('');
        alert('Administrador cadastrado com sucesso! Você será redirecionado para a tela de login.');
        onRegistrationSuccess();
    } catch (err) {
        setError('Não foi possível salvar as credenciais. Verifique as permissões do navegador.');
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-md bg-[#202124] rounded-xl border border-gray-700 shadow-2xl p-8">
        <h2 className="text-2xl font-bold text-center text-white mb-2">Cadastrar Superadministrador</h2>
        <p className="text-center text-gray-400 mb-6">Este é o primeiro acesso. Defina as credenciais do administrador.</p>
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Usuário
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#303134] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#303134] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition"
              required
            />
          </div>
           <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#303134] border border-gray-600/50 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none transition"
              required
            />
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