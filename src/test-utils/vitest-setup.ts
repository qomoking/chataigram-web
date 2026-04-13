/**
 * Vitest 全局 setup —— 在所有 test 文件执行前跑一次。
 *
 * 两件事：
 *   1. 启动 MSW server 拦截网络请求
 *   2. 每个测试跑完重置 handler 运行时状态
 */
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { server } from './msw-node'

// jsdom 缺的 DOM API polyfill
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {
    /* no-op */
  }
}

// i18n 的 t() 会读 navigator.language / localStorage 决定返 EN or ZH。
// jsdom 默认 en-US → 测试里所有中文断言都会失败。
// 这里 patch localStorage.clear() 让 omnient_lang 这个 key 不被 beforeEach 清掉。
beforeAll(() => {
  const proto = Object.getPrototypeOf(localStorage) as Storage
  const origClear = proto.clear.bind(localStorage)
  proto.clear = function () {
    const lang = localStorage.getItem('omnient_lang')
    origClear()
    if (lang) localStorage.setItem('omnient_lang', lang)
    else localStorage.setItem('omnient_lang', 'zh')
  }
  localStorage.setItem('omnient_lang', 'zh')
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  // 补一刀，应对 patched clear 失效的场景
  if (!localStorage.getItem('omnient_lang')) {
    localStorage.setItem('omnient_lang', 'zh')
  }
})

afterEach(() => server.resetHandlers())
afterAll(() => server.close())
