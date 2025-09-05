// Mock import.meta.env for testing
const mockEnv = {
  VITE_DB_HOST: 'localhost',
  VITE_DB_PORT: '5432',
  VITE_DB_USER: 'admin',
  VITE_DB_PASSWORD: 'sativarisisv25',
  VITE_DB_NAME: 'sativar_isis'
};

Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: mockEnv
    }
  },
  writable: true,
  configurable: true
});

// Mock TextEncoder for pg module
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

// Mock crypto for pg module
if (typeof crypto === 'undefined') {
  global.crypto = require('crypto').webcrypto;
}