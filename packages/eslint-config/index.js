import antfu from '@antfu/eslint-config'

export default function wordsConfig(options = {}) {
  return antfu(
    {
      typescript: true,
      react: true,
      formatters: true,
      stylistic: {
        quotes: 'single',
        semi: false,
      },
      ...options,
    },
    // Architectural boundary: apps/web cannot import @words/db
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['@words/db', '@words/db/*'],
              message: 'Web app must not import from @words/db directly. Use @words/shared for shared types.',
            },
          ],
        }],
      },
    },
    // Architectural boundary: packages/shared cannot import from apps or db
    {
      files: ['packages/shared/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['@words/web', '@words/web/*', '@words/api', '@words/api/*', '@words/db', '@words/db/*'],
              message: 'Shared package must not import from apps or db package.',
            },
          ],
        }],
      },
    },
    // Architectural boundary: packages/db cannot import from apps
    {
      files: ['packages/db/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['@words/web', '@words/web/*', '@words/api', '@words/api/*'],
              message: 'DB package must not import from app packages.',
            },
          ],
        }],
      },
    },
    // Allow console in API server code
    {
      files: ['apps/api/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  )
}
