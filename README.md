# @chataigram/web

ChatAigram 前端主仓 —— 页面、组件、路由、样式、交互。

业务 SDK [`@chataigram/core`](https://github.com/qomoking/chataigram-core) 以 **git submodule** 形式挂在 `packages/core/`，通过 pnpm workspace 软链消费。

---

## 一行 clone（设计师 / 工程师都用这个）

```bash
git clone https://github.com/qomoking/chataigram-web.git --recursive
cd chataigram-web
pnpm install     # postinstall 会兜底 init submodule（万一 --recursive 忘了）
pnpm dev         # http://localhost:5173
```

如果忘了 `--recursive`：

```bash
git submodule update --init --recursive
```

或重新 `pnpm install`，postinstall 会自动补。

---

## 设计师工作流

1. 拉 `main`，建分支（`design/xxx` 或 `feat/xxx`）
2. 在 `src/` 下改视觉、路由、组件、交互
3. **数据从 `@chataigram/core` import**，不要自己写 fetch
4. 如果 core 没有你要的能力：
   - 用 `src/mocks/` 下的假数据顶住
   - 在 `docs/core-wishlist.md` 追加一条
5. `pnpm lint && pnpm typecheck && pnpm build && pnpm test` → PR
6. 需要跑端到端：`pnpm e2e`（首次需要 `pnpm e2e:install` 装浏览器）

### ⚠️ 禁区

- 不要在 `src/` 下写 `fetch` / `axios` / `ky` / `new WebSocket(...)`（ESLint 会拦）
- 不要修改 `packages/core/`（那是 submodule，归工程师；CODEOWNERS 也会拦 PR）

---

## 工程师工作流

### 改 core 的代码

```bash
cd packages/core
git checkout -b feat/foo
# 改代码
git push -u origin feat/foo
gh pr create
# 等 chataigram-core 仓的 CI + Downstream Gate 都绿，merge
```

### 把 core 的新 commit 拉进 web

```bash
pnpm core:bump            # 自动拉 origin/main 最新，stage submodule 指针
pnpm core:bump <sha>      # 拉到指定 SHA / branch / tag
git commit -m "chore: bump core to <sha>"
git push
# 在 web 仓走 PR review 流程
```

查看 core 当前 pin：

```bash
pnpm core:status
```

---

## 一次性设置清单

- [ ] Settings → Branches → 保护 `main`：require PR + require CODEOWNERS approval
- [ ] Settings → Actions → General → Workflow permissions → "Read and write permissions"
- [ ] 把 `@chataigram/core` 仓 clone 出来初始化 + push 第一个 commit（README 末尾有命令）
- [ ] 从本仓根目录跑：`git submodule add https://github.com/qomoking/chataigram-core.git packages/core`
- [ ] commit `.gitmodules` + `packages/core` 指针

---

## 目录结构

```
chataigram-web/
├── packages/
│   └── core/                ← submodule = chataigram-core 仓
│       ├── package.json     ("@chataigram/core")
│       └── src/
├── scripts/
│   ├── init-submodule.mjs   (postinstall 兜底)
│   └── bump-core.mjs        (推进 submodule 指针)
├── src/                     ← 设计师主场：页面 / 组件 / 路由
├── pnpm-workspace.yaml      (告诉 pnpm packages/* 是 workspace)
├── .gitmodules              (登记 submodule 来源)
└── package.json
```

`pnpm install` 会让 `node_modules/@chataigram/core` 软链到 `packages/core/`，import `@chataigram/core` 自动走源码 —— **改 core HMR 立刻刷到 web，没有 build 步骤**。
