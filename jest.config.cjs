/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/__tests__/**/*.e2e.test.ts',
    '**/__tests__/**/*.e2e.test.tsx',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        allowImportingTsExtensions: true,
        allowJs: true,
        esModuleInterop: true,
        isolatedModules: true,
        jsx: 'react-jsx',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleDetection: 'force',
        moduleResolution: 'bundler',
        noEmit: true,
        skipLibCheck: true,
        target: 'ES2022',
        types: ['node', 'jest'],
        useDefineForClassFields: false,
        experimentalDecorators: true,
      },
      diagnostics: {
        ignoreCodes: [151001],
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    '/node_modules/(?!uuid)/',
  ],
};