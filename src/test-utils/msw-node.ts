import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'

/** Vitest L3 用的 MSW node server —— 复用 src/mocks/handlers.ts 同一套 handlers。 */
export const server = setupServer(...handlers)
