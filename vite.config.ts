import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const useMocks = process.env['VITE_USE_MOCKS'] === 'true'

/**
 * Core 源码路径解析：
 *   - 默认（设计师模式）：指向 src/core-stub/ —— hook 走 fetch + MSW
 *   - 设 VITE_CORE_PATH：指向真实 core 源码 —— app 组装项目生产构建用
 *
 * VITE_CORE_PATH 应指向 core 包的根目录（含 src/index.ts 和 src/internals.ts）
 * 例：在 app 仓构建时设 VITE_CORE_PATH=../core
 */
const coreRoot = process.env['VITE_CORE_PATH']
  ? resolve(__dirname, process.env['VITE_CORE_PATH'])
  : resolve(__dirname, 'src/core-stub')

const coreIndex = process.env['VITE_CORE_PATH']
  ? `${coreRoot}/src/index.ts`
  : `${coreRoot}/index.ts`

const coreInternals = process.env['VITE_CORE_PATH']
  ? `${coreRoot}/src/internals.ts`
  : `${coreRoot}/internals.ts`

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@chataigram/core/internals': coreInternals,
      '@chataigram/core': coreIndex,
    },
  },
  server: {
    port: 5173,
    // When MSW mocks are active (dev:mocks / E2E), don't proxy to the real
    // backend — MSW intercepts at the browser level and the backend isn't
    // running in those environments.
    proxy: useMocks ? {} : {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  build: {
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        // lottie-web uses eval internally — third-party, nothing we can fix
        if (warning.code === 'EVAL' && warning.id?.includes('lottie')) return
        defaultHandler(warning)
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-lottie': ['lottie-react'],
        },
      },
    },
  },
})
