import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist/**',
      '**/out-tsc/**',
      '**/test-output/**',
      '**/vitest.config.*.timestamp*',
      '.agents/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:foundation',
              onlyDependOnLibsWithTags: ['scope:foundation'],
            },
            { sourceTag: 'type:core', onlyDependOnLibsWithTags: ['type:core'] },
          ],
        },
      ],
    },
  },
  // Adapted from Archimatrix's accepted runtime boundary; tests/config may use tooling.
  {
    files: ['packages/modeling-core/src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    ignores: ['**/*.spec.*', '**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.{1,2}/|tslib$).+',
              message:
                'Core runtime may import relative modules and compiler helpers only; metamodel and hosts depend on core.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message: 'Core runtime uses static, reviewable imports only.',
        },
        {
          selector: "CallExpression[callee.name='require']",
          message: 'Core runtime uses static ESM imports only.',
        },
        {
          selector: 'TSImportEqualsDeclaration',
          message: 'Core runtime uses static ESM imports only.',
        },
        {
          selector: 'TSImportType',
          message: 'Use static type imports so core boundaries remain checked.',
        },
      ],
    },
  },
];
