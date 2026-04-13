import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

async function bootstrap() {
  // `pnpm dev:mocks` 或 .env.local 里设 VITE_USE_MOCKS=true 时启动 MSW
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass', // 没拦截的请求放行（避免挡住 HMR、资源等）
    })
    console.info('[msw] mocks on —— 看不到 Network 里的真实 /api/* 请求是预期')
  }

  const rootEl = document.getElementById('root')
  if (!rootEl) throw new Error('root element not found')

  createRoot(rootEl).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
