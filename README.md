# @chataigram/web

ChatAigram 前端 —— 页面、组件、路由、样式、交互。**设计师主场**。

业务 SDK [`@chataigram/core`](https://github.com/qomoking/chataigram-core) **不在本仓**。
本仓通过 `src/core-stub/` 模拟 `@chataigram/core` 的契约，配合 MSW 假数据离线开发。
真正的集成构建在 [`chataigram-app`](https://github.com/qomoking/chataigram-app) 组装项目中完成。

---

## 一行 clone

```bash
git clone https://github.com/qomoking/chataigram-web.git
cd chataigram-web
pnpm install
pnpm dev         # http://localhost:5173（自动启用 MSW mock）
```

没有 submodule，`pnpm install` 秒完。

---

## 设计师工作流

1. 拉 `main`，建分支（`design/xxx` 或 `feat/xxx`）
2. 在 `src/` 下改视觉、路由、组件、交互
3. **数据 `import from '@chataigram/core'`**（通过 tsconfig paths 解析到 `src/core-stub/`，运行时走 MSW）
4. 如果 core 没有你要的能力：
   - 先查 `docs/core-api.md`（core 的完整 API 参考，自动从 core 仓同步）
   - 真没有：在 `src/mocks/handlers.ts` 加 mock + 在 `docs/core-wishlist.md` 追加一条
5. `pnpm lint && pnpm typecheck && pnpm build && pnpm test` → PR
6. 端到端：`pnpm e2e`（首次需 `pnpm e2e:install` 装浏览器）

### ⚠️ 禁区

- 不要在 `src/` 下写 `fetch` / `axios` / `ky` / `new WebSocket(...)`（ESLint 拦）
- 不要手改 `src/core-stub/`（那是 core 的本地替身，契约变化由 core 仓驱动，同步过来）
- 不要改 `docs/core-api.md`（自动从 core 仓同步）

---

## 数据怎么拿

```tsx
import { useFeed } from '@chataigram/core'

export function FeedPage() {
  const { data, isLoading, error } = useFeed()
  if (isLoading) return <Spinner />
  if (error) return <ErrorState error={error} />
  return <FeedList items={data?.posts ?? []} />
}
```

`@chataigram/core` 通过 vite alias + tsconfig paths 解析到 `src/core-stub/index.ts`。
stub 的 hook 内部调 `fetch` → MSW handler 拦截 → 返回 `src/mocks/handlers.ts` 里的假数据。
设计师看到的是和真实 core 完全一致的 API 形状和类型。

写 mock 时 `import type from '@chataigram/core'` 保证形状与真实契约对齐：

```ts
import { http, HttpResponse } from 'msw'
import type { FeedPage, Post } from '@chataigram/core'

export const handlers = [
  http.get('/api/feed', () => {
    const payload: FeedPage = { posts: [/* ... */], nextOffset: null }
    return HttpResponse.json(payload)
  }),
]
```

---

## 目录结构

```
chataigram-web/
├── src/
│   ├── pages/         路由页面
│   ├── components/    可复用组件
│   ├── hooks/         纯 UI hook
│   ├── mocks/         MSW handler（假数据）
│   ├── core-stub/     @chataigram/core 的本地替身（类型 + fetch stub）
│   └── App.tsx
├── docs/
│   ├── core-api.md          ← 从 core 仓同步的完整 API 参考
│   └── core-wishlist.md     ← 给 core 提需求
├── public/
└── package.json
```

---

## 常用命令

```bash
pnpm dev              # Vite dev + MSW（默认 mock 模式）
pnpm dev:mocks        # 同上（显式）
pnpm build            # tsc + vite build（用 core-stub 产物，不能部署）
pnpm typecheck
pnpm lint
pnpm test             # Vitest
pnpm e2e              # Playwright
```

**提交前三连**：`pnpm lint && pnpm typecheck && pnpm build` 全绿。

---

## 和其他仓的关系

```
chataigram-web          ← 本仓：设计师纯 UI，用 core-stub + MSW
chataigram-core         ← core SDK：独立仓，工程师维护
chataigram-app          ← 组装项目：submodule 引用 web + core，生产构建在这里
```

设计师**只在本仓开 PR**。工程师在 app 仓做真实集成联调和部署。
core 的 API 变更 → core 仓 CI 自动生成 `core-api.md` → 同步到本仓 `docs/core-api.md`。
