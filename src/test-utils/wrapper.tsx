import type { PropsWithChildren, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

/**
 * L3 组件测试的 wrapper。注入共享 QueryClient，这样 `queryClient.setQueryData`
 * 可以预埋缓存，或测后读缓存。
 */
export function wrapWithProviders(qc?: QueryClient) {
  const client = qc ?? createTestQueryClient()
  return function Wrapper({ children }: PropsWithChildren): ReactNode {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
