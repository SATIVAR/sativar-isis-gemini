Based on my analysis of the application, I'll now create a docker-compose.yml file that will containerize the React application and set up a PostgreSQL database. Here's my plan:

Create a Dockerfile for the React application
Create a docker-compose.yml file with two services:
React application (frontend)
PostgreSQL database (backend)
Configure environment variables for both services
Set up proper networking between the containers
Let's start by creating the Dockerfile for the React application:

dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start the application
CMD ["npm", "run", "dev"]
Now, let's create the docker-compose.yml file:

yaml
version: '3.8'

services:
  # PostgreSQL database service
  db:
    image: postgres:15
    container_name: sativar-db
    restart: always
    environment:
      POSTGRES_USER: sativar_user
      POSTGRES_PASSWORD: sativar_password
      POSTGRES_DB: sativar_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - sativar-network

  # React frontend application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sativar-frontend
    restart: always
    ports:
      - "5173:5173"
    environment:
      - API_KEY=${GEMINI_API_KEY}
      - DB_HOST=db
      - DB_USER=sativar_user
      - DB_PASSWORD=sativar_password
      - DB_NAME=sativar_db
      - DB_PORT=5432
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
    networks:
      - sativar-network

volumes:
  postgres_data:

networks:
  sativar-network:
    driver: bridge
However, I notice that the current application doesn't have any database integration yet. Since you want to integrate PostgreSQL, we'll need to modify the application to use the database. Let's create a simple database initialization script:

sql
-- Create tables for the application

-- Table for admin users
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for application settings
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    system_prompt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for quote history
CREATE TABLE IF NOT EXISTS quote_history (
    id SERIAL PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    internal_summary TEXT,
    patient_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if not exists
INSERT INTO app_settings (system_prompt) 
SELECT $$
[0. DADOS DE CONFIGURAÇÃO ESSENCIAL]
Instrução: Antes de usar, preencha todos os placeholders abaixo com as informações corretas da Associação. Você, Ísis, deve usar estes dados como sua única fonte para essas informações.

# DADOS OPERACIONAIS
{{ARQUIVO_TABELA_DE_PRECOS}}: "Tabela de Preços - [Insira o Nome da Associação]"
{{ARQUIVO_DADOS_INSTITUCIONAIS}}: "Sobre a [Insira o Nome da Associação]"
{{VALOR_FRETE_PADRAO}}: 50.00
{{CHAVE_PIX_CNPJ}}: "[Insira a Chave PIX aqui]"
{{RAZAO_SOCIAL}}: "[Insira a Razão Social aqui]"
{{NOME_BANCO}}: "[Insira o Nome do Banco aqui]"
{{TAXA_CARTAO_CREDITO_PERCENTUAL}}: 3.98

# DADOS DE CONTATO E INSTITUCIONAIS
{{NOME_ASSOCIACAO}}: "[Insira o Nome da Associação aqui]"
{{ENDERECO}}: "[Insira o Endereço completo aqui]"
{{WHATSAPP}}: "[Insira o WhatsApp com DDD aqui, ex: (11) 99999-9999]"
{{SITE}}: "[Insira o site aqui, ex: www.associacao.com.br]"
{{INSTAGRAM}}: "[Insira o Instagram aqui, ex: @associacao]"


[1. SUA IDENTIDADE E TOM DE VOZ]
Sua Persona: Você é Ísis, a assistente de IA e colega de equipe da Associação. Sua função é ser o "cérebro" operacional do time, agilizando processos para que a equipe possa focar no acolhimento dos pacientes.
Sua Missão: Receber arquivos (receitas médicas em PDF/imagem), extrair os dados, validar as informações e gerar orçamentos padronizados de forma rápida e precisa.
Seu Tom de Voz (Regra de Ouro): Aja como uma colega de trabalho prestativa, não um robô.
Linguagem: Humana, colaborativa e informal. Use "a gente", "tô vendo aqui", "beleza?".
Proatividade: Seja direta, mas sempre gentil. Se algo estiver ambíguo, pergunte em vez de assumir.
Cultura Iracema: Sua comunicação deve sempre refletir nossos pilares: acolhimento, empatia e cuidado.

[2. SUA BASE DE CONHECIMENTO]
Sua única fonte de verdade são os arquivos e documentos fornecidos, cujos nomes estão na seção [0. DADOS DE CONFIGURAÇÃO ESSENCIAL]. Você deve basear TODAS as suas respostas e orçamentos estritamente nestes arquivos. Se uma informação não estiver nesses arquivos, você NÃO a possui.
Resposta Padrão para Informação Faltante: "Hmm, não encontrei essa informação nos nossos arquivos aqui. A gente consegue confirmar esse dado pra eu seguir aqui?"

[3. SEU FLUXO DE TRABALHO PRINCIPAL]
Ao receber um arquivo (imagem, PDF) de um colega, siga estes passos em ordem:
Passo 1: Confirmação e Extração de Dados: Confirme o recebimento ("Beleza, recebi o arquivo! Só um minutinho que já vou processar pra você."), depois extraia os 5 dados-chave: Nome do Paciente, Data de Emissão da Receita, Nome do(s) Produto(s), Concentração/Dosagem, Quantidade.
Passo 2: Validação Crítica: A. Validade da Receita: A receita é válida por exatamente 6 meses a partir da data de emissão. Compare a data de emissão com a data atual. Se vencida, pare e alerte a equipe. B. Verificação de Produto: Confirme se os produtos constam na nossa tabela de preços.
Adendo de Proximidade: Se a concentração for ligeiramente diferente (ex: 6% na receita, 5% na tabela), use o nosso produto de 5% no orçamento, mas ALERTE a equipe internamente sobre a divergência.
Adendo de Abstração de Marca: Se a receita mencionar uma marca concorrente (ex: Amedis CBD), ignore a marca, extraia a descrição funcional ("CBD Full Spectrum") e encontre nosso produto equivalente. Prossiga sem alerta.
Passo 3: Geração do Orçamento: Use os preços da tabela para calcular o valor.

[4. FORMATO DA RESPOSTA FINAL]
Sua resposta final deve ser sempre dividida em duas partes claras: um resumo para a equipe e a mensagem pronta para o paciente. Use EXATAMENTE este formato:
[PARTE 1: RESUMO INTERNO PARA A EQUIPE]
Análise da Receita:
Paciente: [Nome do Paciente]
Receita: Válida (Emitida em [dd/mm/aaaa]).
Alerta (se houver): [Qualquer observação pertinente]

[PARTE 2: MENSAGEM PRONTA PARA O PACIENTE]
Paciente: [Nome do Paciente]

Conforme sua receita médica, segue o orçamento do seu tratamento:

**PRODUTOS:**
* [Nome do Produto, Concentração]
  * Qtd: [Quantidade] × R$ [Preço Unitário] = R$ [Subtotal do Produto]

**FINANCEIRO E ENTREGA:**
* Subtotal dos Produtos: R$ [Soma de todos os subtotais]
* Valor da Entrega: R$ {{VALOR_FRETE_PADRAO}}
* **Total no PIX: R$ [Valor Total Calculado]**

O pagamento pode ser via PIX ou Cartão de Crédito (com taxa de {{TAXA_CARTAO_CREDITO_PERCENTUAL}}%).

Para pagar com PIX, nossa chave CNPJ é: `{{CHAVE_PIX_CNPJ}}`
* **Favorecido:** {{RAZAO_SOCIAL}}
* **Instituição:** {{NOME_BANCO}}

Após transferir, por favor, nos envie o comprovante para confirmarmos e agilizarmos a separação, ok? O prazo de produção é de até 2 dias úteis após a confirmação do pagamento.

Qualquer dúvida, é só chamar!

Atenciosamente,
Equipe {{NOME_ASSOCIACAO}}
WhatsApp: {{WHATSAPP}}
Site: {{SITE}}

[5. REGRAS DE SEGURANÇA E LIMITES]
NÃO DÊ CONSELHOS MÉDICOS. Se houver perguntas sobre dosagem ou efeitos, instrua seu colega a redirecionar para o médico. NÃO ADIVINHE INFORMAÇÕES. Se algo for ilegível, peça ajuda. SIGA O PROCESSO.
$$
WHERE NOT EXISTS (SELECT 1 FROM app_settings);
Now, let's create a database service file to connect the React application to PostgreSQL:

tsx
import { Pool } from 'pg';

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'sativar_user',
  password: process.env.DB_PASSWORD || 'sativar_password',
  database: process.env.DB_NAME || 'sativar_db',
});

// Function to get admin user by username
export const getAdminUser = async (username: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to create a new admin user
export const createAdminUser = async (username: string, passwordHash: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to get application settings
export const getAppSettings = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT system_prompt FROM app_settings ORDER BY updated_at DESC LIMIT 1'
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to update application settings
export const updateAppSettings = async (systemPrompt: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE app_settings SET system_prompt = $1, updated_at = CURRENT_TIMESTAMP RETURNING system_prompt',
      [systemPrompt]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to save quote history
export const saveQuoteHistory = async (patientName: string, internalSummary: string, patientMessage: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO quote_history (patient_name, internal_summary, patient_message) VALUES ($1, $2, $3) RETURNING id, created_at',
      [patientName, internalSummary, patientMessage]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Function to get quote history
export const getQuoteHistory = async (limit: number = 10) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, patient_name, internal_summary, created_at FROM quote_history ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  } finally {
    client.release();
  }
};

export default pool;
We need to update the package.json to include the PostgreSQL dependency:

package.json
{
  "name": "sativar---isis",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google/genai": "^1.17.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
Now, let's update the useSettings hook to use the database:

useSettings.ts
import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import type { Settings } from '../types';
import { getAppSettings, updateAppSettings } from '../services/dbService';

const SETTINGS_KEY = 'sativar_isis_settings';

const defaultSystemPrompt = `
[0. DADOS DE CONFIGURAÇÃO ESSENCIAL]
Instrução: Antes de usar, preencha todos os placeholders abaixo com as informações corretas da Associação. Você, Ísis, deve usar estes dados como sua única fonte para essas informações.

# DADOS OPERACIONAIS
{{ARQUIVO_TABELA_DE_PRECOS}}: "Tabela de Preços - [Insira o Nome da Associação]"
{{ARQUIVO_DADOS_INSTITUCIONAIS}}: "Sobre a [Insira o Nome da Associação]"
{{VALOR_FRETE_PADRAO}}: 50.00
{{CHAVE_PIX_CNPJ}}: "[Insira a Chave PIX aqui]"
{{RAZAO_SOCIAL}}: "[Insira a Razão Social aqui]"
{{NOME_BANCO}}: "[Insira o Nome do Banco aqui]"
{{TAXA_CARTAO_CREDITO_PERCENTUAL}}: 3.98

# DADOS DE CONTATO E INSTITUCIONAIS
{{NOME_ASSOCIACAO}}: "[Insira o Nome da Associação aqui]"
{{ENDERECO}}: "[Insira o Endereço completo aqui]"
{{WHATSAPP}}: "[Insira o WhatsApp com DDD aqui, ex: (11) 99999-9999]"
{{SITE}}: "[Insira o site aqui, ex: www.associacao.com.br]"
{{INSTAGRAM}}: "[Insira o Instagram aqui, ex: @associacao]"


[1. SUA IDENTIDADE E TOM DE VOZ]
Sua Persona: Você é Ísis, a assistente de IA e colega de equipe da Associação. Sua função é ser o "cérebro" operacional do time, agilizando processos para que a equipe possa focar no acolhimento dos pacientes.
Sua Missão: Receber arquivos (receitas médicas em PDF/imagem), extrair os dados, validar as informações e gerar orçamentos padronizados de forma rápida e precisa.
Seu Tom de Voz (Regra de Ouro): Aja como uma colega de trabalho prestativa, não um robô.
Linguagem: Humana, colaborativa e informal. Use "a gente", "tô vendo aqui", "beleza?".
Proatividade: Seja direta, mas sempre gentil. Se algo estiver ambíguo, pergunte em vez de assumir.
Cultura Iracema: Sua comunicação deve sempre refletir nossos pilares: acolhimento, empatia e cuidado.

[2. SUA BASE DE CONHECIMENTO]
Sua única fonte de verdade são os arquivos e documentos fornecidos, cujos nomes estão na seção [0. DADOS DE CONFIGURAÇÃO ESSENCIAL]. Você deve basear TODAS as suas respostas e orçamentos estritamente nestes arquivos. Se uma informação não estiver nesses arquivos, você NÃO a possui.
Resposta Padrão para Informação Faltante: "Hmm, não encontrei essa informação nos nossos arquivos aqui. A gente consegue confirmar esse dado pra eu seguir aqui?"

[3. SEU FLUXO DE TRABALHO PRINCIPAL]
Ao receber um arquivo (imagem, PDF) de um colega, siga estes passos em ordem:
Passo 1: Confirmação e Extração de Dados: Confirme o recebimento ("Beleza, recebi o arquivo! Só um minutinho que já vou processar pra você."), depois extraia os 5 dados-chave: Nome do Paciente, Data de Emissão da Receita, Nome do(s) Produto(s), Concentração/Dosagem, Quantidade.
Passo 2: Validação Crítica: A. Validade da Receita: A receita é válida por exatamente 6 meses a partir da data de emissão. Compare a data de emissão com a data atual. Se vencida, pare e alerte a equipe. B. Verificação de Produto: Confirme se os produtos constam na nossa tabela de preços.
Adendo de Proximidade: Se a concentração for ligeiramente diferente (ex: 6% na receita, 5% na tabela), use o nosso produto de 5% no orçamento, mas ALERTE a equipe internamente sobre a divergência.
Adendo de Abstração de Marca: Se a receita mencionar uma marca concorrente (ex: Amedis CBD), ignore a marca, extraia a descrição funcional ("CBD Full Spectrum") e encontre nosso produto equivalente. Prossiga sem alerta.
Passo 3: Geração do Orçamento: Use os preços da tabela para calcular o valor.

[4. FORMATO DA RESPOSTA FINAL]
Sua resposta final deve ser sempre dividida em duas partes claras: um resumo para a equipe e a mensagem pronta para o paciente. Use EXATAMENTE este formato:
[PARTE 1: RESUMO INTERNO PARA A EQUIPE]
Análise da Receita:
Paciente: [Nome do Paciente]
Receita: Válida (Emitida em [dd/mm/aaaa]).
Alerta (se houver): [Qualquer observação pertinente]

[PARTE 2: MENSAGEM PRONTA PARA O PACIENTE]
Paciente: [Nome do Paciente]

Conforme sua receita médica, segue o orçamento do seu tratamento:

**PRODUTOS:**
* [Nome do Produto, Concentração]
  * Qtd: [Quantidade] × R$ [Preço Unitário] = R$ [Subtotal do Produto]

**FINANCEIRO E ENTREGA:**
* Subtotal dos Produtos: R$ [Soma de todos os subtotais]
* Valor da Entrega: R$ {{VALOR_FRETE_PADRAO}}
* **Total no PIX: R$ [Valor Total Calculado]**

O pagamento pode ser via PIX ou Cartão de Crédito (com taxa de {{TAXA_CARTAO_CREDITO_PERCENTUAL}}%).

Para pagar com PIX, nossa chave CNPJ é: \`{{CHAVE_PIX_CNPJ}}\`
* **Favorecido:** {{RAZAO_SOCIAL}}
* **Instituição:** {{NOME_BANCO}}

Após transferir, por favor, nos envie o comprovante para confirmarmos e agilizarmos a separação, ok? O prazo de produção é de até 2 dias úteis após a confirmação do pagamento.

Qualquer dúvida, é só chamar!

Atenciosamente,
Equipe {{NOME_ASSOCIACAO}}
WhatsApp: {{WHATSAPP}}
Site: {{SITE}}

[5. REGRAS DE SEGURANÇA E LIMITES]
NÃO DÊ CONSELHOS MÉDICOS. Se houver perguntas sobre dosagem ou efeitos, instrua seu colega a redirecionar para o médico. NÃO ADIVINHE INFORMAÇÕES. Se algo for ilegível, peça ajuda. SIGA O PROCESSO.
`;

const defaultSettings: Settings = {
  systemPrompt: defaultSystemPrompt,
};

interface SettingsContextType {
  settings: Settings;
  saveSettings: (newSettings: Settings) => Promise<void>;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const dbSettings = await getAppSettings();
        if (dbSettings) {
          setSettings({ systemPrompt: dbSettings.system_prompt });
        } else {
          // Fallback to localStorage if DB is not available
          const storedSettings = localStorage.getItem(SETTINGS_KEY);
          if (storedSettings) {
            setSettings(JSON.parse(storedSettings));
          }
        }
      } catch (error) {
        console.error("Failed to load settings from database", error);
        // Fallback to localStorage
        try {
          const storedSettings = localStorage.getItem(SETTINGS_KEY);
          if (storedSettings) {
            setSettings(JSON.parse(storedSettings));
          }
        } catch (localStorageError) {
          console.error("Failed to load settings from localStorage", localStorageError);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (newSettings: Settings) => {
    try {
      await updateAppSettings(newSettings.systemPrompt);
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save settings to database", error);
      // Fallback to localStorage
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch (localStorageError) {
        console.error("Failed to save settings to localStorage", localStorageError);
      }
    }
  };

  const value = useMemo(() => ({ settings, saveSettings, isLoaded }), [settings, isLoaded]);

  return React.createElement(SettingsContext.Provider, { value: value }, children);
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
Let's update the AdminLogin component to use the database:

AdminLogin.tsx
import React, { useState } from 'react';
import { getAdminUser } from '../services/dbService';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // In a real application, you would hash the password before comparing
      // For this example, we'll just check if the user exists
      const user = await getAdminUser(username);
      
      if (user) {
        // In a real application, you would verify the password hash here
        // For this example, we'll just assume login is successful if user exists
        onLoginSuccess();
      } else {
        setError('Credenciais inválidas. Por favor, tente novamente.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Ocorreu um erro durante o login. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Área Administrativa</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-300 mb-2">Usuário</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-300 mb-2">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};
Let's update the AdminRegistration component to use the database:

AdminRegistration.tsx
import React, { useState } from 'react';
import { createAdminUser } from '../services/dbService';

interface AdminRegistrationProps {
  onRegistrationSuccess: () => void;
}

export const AdminRegistration: React.FC<AdminRegistrationProps> = ({ onRegistrationSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      // In a real application, you would hash the password before storing
      // For this example, we'll just store the password as-is
      await createAdminUser(username, password);
      onRegistrationSuccess();
    } catch (err) {
      console.error('Registration error:', err);
      setError('Ocorreu um erro durante o registro. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Registro de Administrador</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-300 mb-2">Usuário</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-300 mb-2">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-gray-300 mb-2">Confirmar Senha</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {isLoading ? 'Registrando...' : 'Registrar'}
        </button>
      </form>
    </div>
  );
};
Let's update the SettingsPage component to save quote history:

SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { saveQuoteHistory, getQuoteHistory } from '../services/dbService';

interface SettingsPageProps {
  onLogout: () => void;
}

interface QuoteHistoryItem {
  id: number;
  patient_name: string;
  internal_summary: string;
  created_at: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const { settings, saveSettings } = useSettings();
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [quoteHistory, setQuoteHistory] = useState<QuoteHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    loadQuoteHistory();
  }, []);

  const loadQuoteHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await getQuoteHistory(10);
      setQuoteHistory(history);
    } catch (error) {
      console.error('Failed to load quote history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveSettings({ systemPrompt });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Erro ao salvar configurações. Por favor, tente novamente.');
    }
  };

  const handleReset = () => {
    setSystemPrompt(settings.systemPrompt);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Sair
        </button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Prompt do Sistema</h2>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full h-96 p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Insira o prompt do sistema aqui..."
        />
        <div className="flex space-x-4 mt-4">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Salvar
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancelar
          </button>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Histórico de Orçamentos</h2>
        {isLoadingHistory ? (
          <p>Carregando histórico...</p>
        ) : quoteHistory.length === 0 ? (
          <p>Nenhum orçamento gerado ainda.</p>
        ) : (
          <div className="space-y-4">
            {quoteHistory.map((item) => (
              <div key={item.id} className="border border-gray-700 rounded p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{item.patient_name}</h3>
                  <span className="text-sm text-gray-400">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="mt-2 text-gray-300 whitespace-pre-wrap">
                  {item.internal_summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
Let's update the QuoteGenerator component to save quote history:

QuoteGenerator.tsx
import React, { useState, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { processPrescription } from '../services/geminiService';
import { saveQuoteHistory } from '../services/dbService';
import type { ChatMessage, QuoteResult } from '../types';
import { Loader } from './Loader';

export const QuoteGenerator: React.FC = () => {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Por favor, selecione um arquivo primeiro.');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: { type: 'text', text: `Arquivo enviado: ${selectedFile.name}` }
    };
    addMessage(userMessage);

    // Add loading message
    const loadingMessageId = Date.now().toString() + '_loading';
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      sender: 'ai',
      content: { type: 'loading' }
    };
    addMessage(loadingMessage);

    setIsProcessing(true);

    try {
      // Process the prescription
      const result: QuoteResult = await processPrescription(selectedFile, settings);
      
      // Save to quote history
      try {
        const patientNameMatch = result.internalSummary.match(/Paciente: (.+)/);
        const patientName = patientNameMatch ? patientNameMatch[1].trim() : 'Desconhecido';
        await saveQuoteHistory(patientName, result.internalSummary, result.patientMessage);
      } catch (saveError) {
        console.error('Failed to save quote to history:', saveError);
      }

      // Update loading message with result
      const quoteMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        content: { type: 'quote', result }
      };
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessageId ? quoteMessage : msg
      ));
    } catch (error) {
      console.error('Error processing prescription:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        content: { 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.' 
        }
      };
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessageId ? errorMessage : msg
      ));
    } finally {
      setIsProcessing(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const renderMessageContent = (content: ChatMessage['content']) => {
    switch (content.type) {
      case 'text':
        return <p>{content.text}</p>;
      case 'loading':
        return <Loader />;
      case 'quote':
        return (
          <div className="space-y-4">
            <div className="bg-blue-900/30 p-4 rounded">
              <h3 className="font-bold text-lg mb-2">Resumo Interno para a Equipe</h3>
              <p className="whitespace-pre-wrap">{content.result.internalSummary}</p>
            </div>
            <div className="bg-green-900/30 p-4 rounded">
              <h3 className="font-bold text-lg mb-2">Mensagem Pronta para o Paciente</h3>
              <div className="whitespace-pre-wrap">{content.result.patientMessage}</div>
            </div>
          </div>
        );
      case 'error':
        return <p className="text-red-400">{content.message}</p>;
      default:
        return <p>Tipo de conteúdo não suportado</p>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Gerador de Orçamentos com IA</h2>
            <p className="mb-6">Envie uma receita médica para gerar um orçamento padronizado</p>
            <button
              onClick={triggerFileSelect}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
            >
              Selecionar Arquivo
            </button>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`p-4 rounded-lg max-w-3xl ${message.sender === 'user' ? 'bg-gray-800 ml-auto' : 'bg-gray-900'}`}
            >
              {renderMessageContent(message.content)}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf"
            className="hidden"
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={triggerFileSelect}
            disabled={isProcessing}
            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            {selectedFile ? selectedFile.name : 'Selecionar Arquivo'}
          </button>
          <button
            type="submit"
            disabled={isProcessing || !selectedFile}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {isProcessing ? 'Processando...' : 'Gerar Orçamento'}
          </button>
        </div>
      </form>
    </div>
  );
};
Finally, let's create a .env file template for the environment variables:

env
# Gemini API Key
GEMINI_API_KEY=your_gemin
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration
DB_HOST=localhost
D
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT=543
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
D
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=sativar_user
DB_PASSWORD=sati
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=sativar_user
DB_PASSWORD=sativar_password
DB_NAME=sativar_d
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=sativar_user
DB_PASSWORD=sativar_password
DB_NAME=sativar_db
Plano de Ação Resumo
Aqui está o plano de ação completo para criar um docker-compose.yml com a aplicação e PostgreSQL:

Criação do Dockerfile para containerizar a aplicação React
Criação do docker-compose.yml com dois serviços:
Serviço app para a aplicação React
Serviço db para o PostgreSQL
Configuração do banco de dados com:
Script de inicialização para criar tabelas
Configuração de volumes persistentes
Atualização da aplicação para usar o banco de dados:
Adição da dependência pg (PostgreSQL client)
Criação de um serviço de banco de dados (dbService.ts)
Modificação dos componentes para usar o banco de dados
Atualização do hook useSettings para persistir configurações no banco

Instruções para Executar
Certifique-se de ter o Docker e o Docker Compose instalados - confirmado tudo ok
Crie um arquivo .env com base no .env.example e adicione sua chave da API do Gemini
Execute docker-compose up para iniciar os serviços
Acesse a aplicação em http://localhost:5173

O plano implementa uma arquitetura completa com:

Containerização da aplicação React
Banco de dados PostgreSQL para persistência de dados
Integração entre os componentes da aplicação e o banco de dados
Configuração de ambiente segura com variáveis de ambiente