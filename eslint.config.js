// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage', 'scripts/**/*.{js,mjs,cjs}'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ────────────────────────────────────────────────
      //  禁止绕过 @chataigram/core 自己访问后端
      // ────────────────────────────────────────────────
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: '用 @chataigram/core 的 hooks 访问后端' },
            { name: 'ky', message: '用 @chataigram/core 的 hooks 访问后端' },
            { name: 'superagent', message: '用 @chataigram/core 的 hooks 访问后端' },
          ],
        },
      ],
      // 禁止直接 fetch / XHR / WebSocket
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: '用 @chataigram/core 的 hooks 访问后端' },
        { name: 'XMLHttpRequest', message: '用 @chataigram/core 的 hooks 访问后端' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='WebSocket']",
          message: '用 @chataigram/core 暴露的 hook/client 访问 WebSocket',
        },
      ],

      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/mocks/**/*.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    rules: {
      // mock / 测试环境里允许原始请求
      'no-restricted-globals': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    // 基建级工具允许直接 fetch（非业务域数据）：
    //   - cdn.ts 拉 /api/cdn-config（基建 metadata）
    //   - animationCache.ts 预取 Lottie JSON（静态资源）
    // 业务域数据仍然只能通过 @chataigram/core 的 hooks。
    files: ['src/utils/cdn.ts', 'src/utils/animationCache.ts'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
)
