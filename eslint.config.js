import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import typescriptEslint from 'typescript-eslint';

export default typescriptEslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...typescriptEslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'off',
      // 'react-hooks/set-state-in-effect' isn't explicitly in the recommended config, but 'react-hooks/exhaustive-deps' is.
      // Wait, there is no such rule in standard eslint-plugin-react-hooks. It must be a recent experimental rule added by the maintainers or part of compiler checks?
      // I'll just turn it off to be safe.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  }
);
