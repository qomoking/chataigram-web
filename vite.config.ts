import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const useMocks = process.env['VITE_USE_MOCKS'] === 'true'

export default defineConfig({
  plugins: [react()],
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
