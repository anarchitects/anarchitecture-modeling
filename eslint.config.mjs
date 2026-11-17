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
            {
              sourceTag: 'type:metamodel',
              onlyDependOnLibsWithTags: ['type:core', 'type:metamodel'],
            },
          ],
        },
      ],
    },
  },
  // Adapted from Archimatrix's accepted runtime boundary; tests/config may use tooling.
  {
    files: [
      'packages/modeling-{core,metamodel}/src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
    ],
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
          message: 'Foundation runtime uses static, reviewable imports only.',
        },
        {
          selector: "CallExpression[callee.name='require']",
          message: 'Foundation runtime uses static ESM imports only.',
        },
        {
          selector: 'TSImportEqualsDeclaration',
          message: 'Foundation runtime uses static ESM imports only.',
        },
        {
          selector: 'TSImportType',
          message:
            'Use static type imports so Foundation boundaries remain checked.',
        },
      ],
    },
  },
  {
    files: [
      'packages/modeling-metamodel/src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
    ],
    ignores: ['**/*.spec.*', '**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.{1,2}/|tslib$|@anarchitects/modeling-core$).+',
              message:
                'Metamodel runtime may import relative modules, compiler helpers and the public core entry only.',
            },
          ],
        },
      ],
    },
  },
];
