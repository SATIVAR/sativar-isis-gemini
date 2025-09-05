import { DatabaseConfig } from './services/database/types';

// Define a function to get environment variables with fallbacks
const getEnvVar = (name: string, fallback: string): string => {
  // Use import.meta.env for Vite applications
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name] || fallback;
  }
  // Fallback to process.env for Node.js environment
  return process.env[name] || fallback;
};

const getEnvVarInt = (name: string, fallback: number): number => {
  const value = getEnvVar(name, fallback.toString());
  return parseInt(value, 10);
};

/**
 * Application configuration, loaded from environment variables.
 */
const config = {
  database: {
    host: getEnvVar('VITE_DB_HOST', 'localhost'),
    port: getEnvVarInt('VITE_DB_PORT', 5432),
    username: getEnvVar('VITE_DB_USER', 'postgres'),
    password: getEnvVar('VITE_DB_PASSWORD', 'password'),
    database: getEnvVar('VITE_DB_NAME', 'sativar_db'),
  } as DatabaseConfig,
  isDevelopment: (typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : import.meta.env?.DEV) || false,
  isProduction: (typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : import.meta.env?.PROD) || false,
};

export default config;