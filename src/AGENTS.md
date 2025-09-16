# src 目录开发指南

## 通用约定
- 所有源码均使用 TypeScript/TSX，保持类型定义完整，避免使用 `any`。
- 模块导入使用 `@/` 别名或相对路径，禁止出现裸 `../..` 跨层跳转。
- 仅入口文件允许默认导出，其余模块使用具名导出以便树摇优化。
- 提交前确保通过 `npm run build`，并为新增逻辑补充相应测试或故事。

## 状态与副作用
- 组件内部状态优先使用 React hooks，跨组件共享状态应放入 `context/`。
- 自定义 hooks 须以 `use` 开头并保持纯粹，可复用逻辑拆分到 `lib/`。
- 引入副作用时使用 `useEffect`/`useLayoutEffect`，清理函数必不可少。

## 样式与资源
- 优先使用 Tailwind CSS 原子类；如需自定义样式，请集中在 `index.css` 或组件局部 `className`。
- 不直接向 DOM 注入内联 `<style>`；共享样式抽取为工具函数或常量。

## 代码整洁性
- 保持文件长度适中（建议不超过 200 行），必要时拆分成多个模块。
- 提交前执行 `npm run lint`（若添加了 ESLint 配置）或相关静态检查。

## 目录内层指引
- `components/`、`context/`、`hooks/`、`lib/` 与 `types/` 均有各自的 `AGENTS.md`，实现前请先阅读对应说明。
