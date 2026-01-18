import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...tseslint.configs.recommended,

  // Override default ignores
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'scripts/**',
  ]),

  // TypeScript rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Relax rules for test files
  {
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx', '__mocks__/**/*.js', 'jest.setup.js', 'jest.config.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);

export default eslintConfig;
