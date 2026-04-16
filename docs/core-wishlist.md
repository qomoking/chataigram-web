# Core Wishlist

当 web 需要 `@chataigram/core` 还没提供的能力时，在这里追加一条。工程师会定期过这个列表。

## 条目模板

复制下面格式追加到"开放中"区最上方：

```md
### [YYYY-MM-DD] useXxx / 新字段名 / ...
- **场景**：<哪个页面 / 哪个交互 / 为什么需要>
- **期望签名**：`useXxx(params): { data, isLoading, error }`
- **期望数据**：<简要描述，或 TypeScript 类型草稿>
- **紧急度**：`mock-ok`（可以先用 mock 顶住） / `blocker`（真实阻塞）
- **提出者**：@<handle>
- **状态**：`open` / `in-progress` / `done` / `rejected`
- **PR / Issue**：<链接，等工程师接后填上>
```

---

## 开放中

### [2026-04-15] useRemixPost: accept ret_code 202
- **场景**：Feed 页选创意卡片后 remix 请求被当作失败 — 后端返回 `ret_code: 202`（HTTP Accepted），但 `useRemixPost.ts:40` 只接受 `200`
- **期望签名**：不变，只修改 ret_code 校验逻辑
- **期望数据**：`(raw.ret_code !== 200 && raw.ret_code !== 202) || !raw.task_id` 
- **紧急度**：`blocker`（remix 功能完全不可用）
- **提出者**：@yin
- **状态**：`open`

### [2026-04-15] useRemixTask: handle missing status field
- **场景**：remix 任务完成时后端返回 `{ ret_code: 200, post: {...} }` 但无 `status` 字段，`useRemixTask.ts:34` 检查 `!raw.status` 为 true 导致误判为 error
- **期望签名**：不变，推断 status — 有 `post` → `'done'`，有 `error` → `'error'`，否则 `'pending'`
- **紧急度**：`blocker`（即使绕过 202 问题，轮询结果也被误判）
- **提出者**：@yin
- **状态**：`open`

---

## 最近完成

### [2026-04-14] CDN 路由工具收归 core
- **场景**：CdnImg / PlazaPage / App.tsx 的 CDN 配置获取和 URL 改写
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：qomoking/chataigram-core#4

### [2026-04-14] useAnimation / prefetchAnimation 收归 core
- **场景**：PlazaPage / LoginPage / CreateAvatarPage 的 Lottie 动画拉取
- **提出者**：@king
- **状态**：`done`
- **PR / Issue**：qomoking/chataigram-core#3

---

## 使用约定

- 新条目放"开放中"区最上方，按时间倒序
- 条目完成后 core 在 `index.ts` 导出，web 这边删 mock + `pnpm core:bump` + 在此文件把条目移到"最近完成"区
- "最近完成"保留最近 10 条即可，更早的 clean up（有 git 历史兜底）
- 被 reject 的条目说明原因 + 替代方案
