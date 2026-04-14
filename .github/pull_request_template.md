<!--
  提 PR 前请勾选下面清单。规则见 CLAUDE.md。
  一个 PR = 一件事；不夹带无关改动。
-->

## 做了什么

<!-- 一两句话。写"做了什么"，不写"怎么做"。 -->

## 影响范围

- [ ] 只改了 web 仓代码（未改 `packages/core/`）
- [ ] 只做了一件事，没夹带无关 refactor / 清理
- [ ] 基于最新 `main` 分支

## 视觉 / 交互改动（设计师 PR 必填）

<!-- 贴截图或短录屏；没有视觉改动可以删掉这一节 -->

| Before | After |
| ------ | ----- |
|        |       |

- 断点覆盖：`[ ] mobile  [ ] tablet  [ ] desktop`
- 涉及页面 / 组件：

## 数据与契约

- [ ] 需要的数据已在 `@chataigram/core` 找到对应 hook
- [ ] 若 core 没有：加了 `src/mocks/handlers.ts` mock 且类型 import from `@chataigram/core`
- [ ] 若 core 需要新增：已在 `docs/core-wishlist.md` 登记

## 本地验证

- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] 本地 `pnpm dev` 或 `pnpm dev:mocks` 手动走过主要路径

## 备注

<!-- Figma 链接、相关 issue、评审想特别关注的点等 -->
