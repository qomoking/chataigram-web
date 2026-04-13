# Cross-repo AI agent protocol

本文件在 `chataigram-web` 和 `chataigram-core` 两仓保持同步。**任何 AI（Claude Code / Cursor / Copilot）开工前先读这份 + 本仓 `CLAUDE.md`。**

---

## 两仓角色

| 仓 | 定位 | 谁是主力 | 里面是什么 |
|---|---|---|---|
| `chataigram-web` | App 外壳 | 设计师 + AI | 页面、组件、路由、样式、交互、mock |
| `chataigram-core` | 无头业务 SDK | 工程师 + AI | hooks、api client、领域类型、业务纯函数 |

`chataigram-core` 作为 git submodule 挂在 `chataigram-web/packages/core/`，通过 pnpm workspace 软链消费。**web 不会独立发布 core，source 即产物**。

---

## 边界铁律

### 在 web 仓（设计师主场）

✅ 允许：
- 改 `src/` 下所有视觉、路由、交互、动效、文案
- 用 `@chataigram/core` 的 hooks 拿数据
- 在 `src/mocks/` 写假数据
- 在 `docs/core-wishlist.md` 追加需求

❌ 禁止：
- 修改 `packages/core/` 的任何文件（CODEOWNERS 会拦 PR）
- 在 `src/` 下使用 `fetch` / `axios` / `ky` / `new WebSocket` / `new XMLHttpRequest`
- 读 `node_modules/@chataigram/core/`（那是 symlink，要查就看 `packages/core/src/`）

### 在 core 仓（工程师主场）

✅ 允许：
- 改任何 `.ts` 源码
- 在 `src/index.ts` 加新 export（默认稳定）
- 跑 `pnpm typecheck / test / lint`

❌ 禁止：
- 写 JSX / TSX / CSS
- 引 `react-dom` / `react-router` / `react-router-dom`
- 反向 import `@chataigram/web`
- 发包（submodule 模式下无需发版）

ESLint 会强制执行部分规则。不要想办法绕过。

---

## 协作场景协议

### 场景 1：web 需要 core 没有的能力

**web 的 AI 必须按顺序做**：

1. 在 `src/mocks/handlers.ts` 加一条 mock handler，让页面立即能跑
2. 在 `docs/core-wishlist.md` 追加条目（模板见那个文件）
3. 继续开发其他部分，不要偷偷自己写 `fetch`

**工程师 AI 看到 wishlist** → 在 core 仓实现 → merge → 在 web 仓 `pnpm core:bump` → wishlist 对应条目标记 done，删 mock。

### 场景 2：core 需要改 `src/index.ts` 的导出面

**core 的 AI 必须按顺序做**：

1. 先 grep 本地 `../chataigram-web/` 或 `../../../src/`（如果在 submodule 里），看谁在用这个 symbol
2. 尽量向后兼容：
   - 加可选参数 / 函数重载 / 默认值
   - 新 API + 老 API 同时保留
3. 如果真要 breaking：
   - 老 export 标 `@deprecated <reason> - use <new>`，保留至少 1 个 milestone
   - 新 API 标 `@stable @since <version>`
4. PR description 写清"影响 web 的哪些调用点"
5. 信任 **Downstream Gate** CI：用本 PR 的 core 把 web 全套跑一遍，**红灯 = merge 后会炸 web**

### 场景 3：core 修改领域类型字段

- 加字段（可选） → 安全，标 `@since`
- 改字段含义 → breaking，需要迁移说明
- 删字段 → 先 `@deprecated` 过渡，再删
- 让 Downstream Gate 把受影响的 web 调用点用 tsc 红灯报出来

### 场景 4：设计师的 AI 想了解 core 有什么

**优先级从上到下**：

1. 读 `packages/core/src/index.ts` —— 这是契约菜单，每个 export 带 JSDoc + 稳定性标注
2. 读本仓 `packages/core/CLAUDE.md`（如果在工作树里）
3. 读本仓 `docs/core-wishlist.md` 的"最近完成"区，了解最新加了什么
4. **不要** 翻 `node_modules/@chataigram/core/`（symlink）

---

## 稳定性三档

每个 `src/index.ts` 的 export 必须标：

| 标注 | 含义 | web 使用 |
|---|---|---|
| `@stable @since <ver>` | 不会在兼容窗口内破坏 | 放心用 |
| `@experimental` | 可能在任何时候变 | 加 `// @chataigram: experimental` 注释承担风险 |
| `@deprecated <reason> - use <new>` | 将被移除 | 迁到 `<new>` |

---

## 关键命令

### core 仓（或在 web 里 `cd packages/core`）
```bash
pnpm typecheck    # 只 tsc，不 emit
pnpm lint
pnpm test
```

### web 仓
```bash
pnpm dev              # Vite
pnpm dev:mocks        # 带 MSW 假数据（无需后端）
pnpm typecheck        # tsc -b，会一起 check packages/core
pnpm lint
pnpm test
pnpm build
pnpm core:status      # 看 packages/core pin 在哪个 SHA
pnpm core:bump        # 推进 core 到最新（工程师）
```

---

## 不做的事

- 不在代码里 @ 人或留对话
- 不在 PR description 里贴大段 AI 对话日志
- 不要为"兼容性"保留明显死代码 —— 用 `@deprecated` 过渡 + 真实删除
- 不要创建 `future-compat/` 或 `legacy/` 之类的"未来可能用"目录
