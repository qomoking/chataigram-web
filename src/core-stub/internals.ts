/**
 * @chataigram/core/internals stub — 逃生舱。
 * 本地开发通过 MSW 拦截。
 */

async function stubFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await globalThis.fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string) => stubFetch<T>('GET', path),
  post: <T>(path: string, body?: unknown) => stubFetch<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => stubFetch<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => stubFetch<T>('PATCH', path, body),
  delete: <T>(path: string) => stubFetch<T>('DELETE', path),
}
