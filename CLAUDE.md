# Claude instructions — chataigram-web

You are in **chataigram-web** — the frontend app. **设计师主场**。

本仓**不包含** `@chataigram/core` 源码。core 的 API 文档在 `docs/core-api.md`，类型 stub 在 `src/core-stub/`。

---

## 这里装什么

```
src/
  pages/         路由页面
  components/    可复用组件（视觉 + 交互）
  core-stub/     @chataigram/core 的类型 + stub 实现（设计师模式）
  layouts/       布局（可选）
  hooks/         纯 UI hook（useMediaQuery / useHover 等）
  mocks/         MSW 假数据（给本地 dev）
  styles/        全局样式 / tokens（可选）
  main.tsx       入口
  App.tsx        根组件 + 路由

public/          静态资源
docs/
  core-api.md        core 的完整 API 文档（自动生成，从 core 仓同步）
  core-wishlist.md   让 core 加东西用
```

## 绝对禁止

- 在页面 / 组件里直接写 `fetch(` / `axios.*` / `ky(` / `new WebSocket(`
  → 全部用 `@chataigram/core` 的 hooks（映射到 `src/core-stub/`）
- 在 `src/` 下硬编码 API 地址 / 后端域名
- 引入新的 HTTP 客户端

ESLint 会拦住大部分。**不要绕过**，有需求就走 wishlist。

---

## 拿数据的标准动作

第一步：读 `docs/core-api.md`，看 core 有没有对应 hook。

**有**：

```tsx
import { useFeed } from '@chataigram/core'

export function FeedPage() {
  const { data, isLoading, error } = useFeed()
  if (isLoading) return <Spinner />
  if (error) return <ErrorState error={error} />
  return <FeedList items={data?.posts ?? []} />
}
```

`@chataigram/core` 通过 tsconfig paths + vite alias 映射到 `src/core-stub/index.ts`。
stub 里的 hook 通过 fetch 发请求 → MSW 拦截返回 mock 数据。

**没有**：

1. 在 `src/mocks/handlers.ts` 加 MSW handler
2. 在 `docs/core-wishlist.md` 追加条目（模板见那个文件）
3. 在 `src/core-stub/index.ts` 加对应的 stub hook
4. 继续写页面，用 mock 的数据形状

---

## core-stub 的维护

`src/core-stub/` 是 `@chataigram/core` 在设计师模式下的替身：

- `types.ts` — 所有领域类型定义（从 core-api.md 同步）
- `index.ts` — hook 的 stub 实现（fetch → MSW）
- `internals.ts` — `@chataigram/core/internals` 的 stub（逃生舱）

**更新时机**：当 `docs/core-api.md` 更新（core 仓 CI 同步过来），同步更新 `types.ts` 的类型定义。

**注意**：stub 的 hook 实现只是 placeholder，真正的业务逻辑在 core 仓。
真集成联调请在 `chataigram-app` 组装项目中进行。

---

## mock 的写法

`src/mocks/handlers.ts`（MSW v2 语法）：

```ts
import { http, HttpResponse } from 'msw'
import type { Paginated, Post } from '@chataigram/core'

export const handlers = [
  http.get('/api/feed', () => {
    const payload: { posts: Post[]; nextOffset: null } = {
      posts: [
        { id: 1, parentId: 0, authorId: 1, photoUrl: null, content: 'hello',
          type: 2, likeCount: 0, relayCount: 0, commentCount: 0, shareCount: 0,
          optional: null, hasRemixes: false },
      ],
      nextOffset: null,
    }
    return HttpResponse.json(payload)
  }),
]
```

**关键**：`import type from '@chataigram/core'` —— 用 core-stub 的类型，保证 mock 形状和真实契约对齐。类型对不上 tsc 会报错。

---

## 路由与页面

- 所有页面在 `src/pages/`
- 路由集中在 `App.tsx` 或 `src/routes.tsx`
- 页面之间共享的视觉归 `src/components/`
- 页面专用的小组件可以放同目录下（colocated）：
  ```
  src/pages/FeedPage/
    FeedPage.tsx
    FeedCard.tsx
    FeedEmpty.tsx
    FeedPage.module.css
  ```

---

## 样式

- 任何范围合理：CSS Modules / 原生 CSS / 全局 CSS / 甚至内联 —— 项目不强求
- 但**不要引入新的 CSS 框架 / UI 库**（tailwind、mui、antd 等），除非 PR 里明确讨论
- 全局 tokens 放 `src/styles/tokens.css`（颜色、间距、字号）

---

## 命令

```bash
pnpm dev              # Vite dev server + MSW mock（默认 mock 模式）
pnpm dev:mocks        # 同上（显式 mock 模式）
pnpm typecheck        # tsc -b
pnpm lint
pnpm test             # Vitest：L2 hook 测试 + L3 组件测试
pnpm e2e              # Playwright L4：真浏览器端到端
pnpm e2e:ui           # Playwright UI mode（调试用）
pnpm build
```

**提交前**：`pnpm lint && pnpm typecheck && pnpm build` 全绿。

---

## GitHub 协作规则（设计师严格遵守）

设计师**只能修改 web 仓**（本仓 `chataigram-web`）。下面规则**不可绕过**：

**1. 一切改动走 PR，禁止直推 main**

- 从 `main` 切新分支开发：`git checkout main && git pull && git checkout -b feat/xxx`
- 改完推到远端，开 PR，等评审合并
- 不在本地 main 上直接 commit，不 `git push origin main`

**2. 一个 PR = 一件事，保持小**

- 一个页面改动 / 一次设计迭代 / 一个 bug 修复 —— 单一主题
- 不夹带无关的 refactor、清理、格式化
- 觉得改动偏大就拆成多个 PR，串行提交
- commit message 写"做了什么"，不写"怎么做"

**3. PR 合并后，下一项工作前必须同步 main**

```bash
git checkout main
git pull origin main           # 拿到自己刚合并的 PR + 别人合并的改动
git checkout -b feat/next-xxx  # 基于最新 main 切新分支
```

- 绝不在旧分支上接着做下一件事
- 绝不基于没合并的 PR 分支切新分支（除非明确依赖）

**4. 提 PR 前本地三连全绿**

```bash
pnpm lint && pnpm typecheck && pnpm build
```

失败就修，不绕过 hook、不 `--no-verify`。

---

## 常见踩坑

| 症状 | 原因 | 解法 |
|---|---|---|
| `import '@chataigram/core'` 红线 | IDE 没识别 paths alias | 重启 TS server，或检查 tsconfig.app.json 的 paths |
| `fetch` 被 ESLint 拦 | 规则有效 | 用 core-stub 的 hook，或走 wishlist |
| tsc 报 core-stub 类型不对 | core-api.md 更新了但 stub 没同步 | 按 docs/core-api.md 更新 src/core-stub/types.ts |
| MSW 没拦截到请求 | handler 路径不匹配 | 检查 src/mocks/handlers.ts 的路径 |
