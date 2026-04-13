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

_(暂无条目)_

---

## 最近完成

_(暂无条目)_

---

## 使用约定

- 新条目放"开放中"区最上方，按时间倒序
- 条目完成后 core 在 `index.ts` 导出，web 这边删 mock + `pnpm core:bump` + 在此文件把条目移到"最近完成"区
- "最近完成"保留最近 10 条即可，更早的 clean up（有 git 历史兜底）
- 被 reject 的条目说明原因 + 替代方案
