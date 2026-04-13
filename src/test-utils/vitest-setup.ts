/**
 * Vitest 全局 setup —— 在所有 test 文件执行前跑一次。
 *
 * 两件事：
 *   1. 启动 MSW server 拦截网络请求
 *   2. 每个测试跑完重置 handler 运行时状态
 */
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw-node'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
