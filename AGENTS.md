# 仓库指南

## 项目结构与模块组织
- 根入口：`index.html`、`index.tsx`、`App.tsx`。
- 源码模块放在顶层目录下：
  - `components/` UI 组件（建议每个文件一个组件）。
  - `context/` React Context 提供器/状态。
  - `hooks/` 自定义 React hooks（可复用逻辑）。
  - `lib/` 工具与辅助函数。
  - `types.ts` 共享 TypeScript 类型；`constants.tsx` UI/常量。
- 导入别名：根相对导入请使用 `@/`（见 `vite.config.ts`）。

## 构建、测试与开发命令
- `npm run dev` —— 启动 Vite 开发服务器（支持 HMR）。
- `npm run build` —— 生产构建输出到 `dist/`。
- `npm run preview` —— 本地预览已构建应用。
- 建议使用 Node 18+（适配 Vite 6）。

## 编码风格与命名约定
- TypeScript 严格模式；尽量显式类型，避免使用 `any`。
- 缩进：2 空格；保持行内聚且可读。
- 字符串：使用单引号；语句以分号结尾。
- React：函数组件 + hooks；不使用类组件。
- 文件命名：
  - 组件：`PascalCase.tsx`（如 `ColorPicker.tsx`）。
  - Hooks：`hooks/` 目录下 `useSomething.ts`。
  - Context：`context/` 目录下 `XContext.tsx`。
  - 工具：`lib/` 目录下 `camelCase.ts`。
- 导出：优先使用具名导出；仅页面/入口组件使用默认导出。

## 测试指南
- 未预置测试运行器；如需添加测试，请使用 Vitest + React Testing Library。
- 测试文件可与模块同目录（`*.test.ts`/`*.test.tsx`），或放在 `tests/` 下。
- 重点为核心工具（绘制、变换）与 `context/` 中的 reducer/状态编写组件/单元测试。

## 提交与 Pull Request 指南
- 使用 Conventional Commits：`feat:`、`fix:`、`refactor:`、`docs:`、`chore:`。
- 提交信息保持祈使语气并限定范围：例如 `feat(brush): support pressure taper`。
- PR 必须包含：
  - 变更摘要与动机说明；
  - 关联 issue（如有）；
  - UI 变更的截图/GIF；
  - 破坏性变更或迁移说明。

## 安全与配置提示
- 机密/配置：使用 `.env.local`（已忽略提交）。示例：`GEMINI_API_KEY=...`。
- 通过 `process.env.GEMINI_API_KEY` 访问环境变量（在 `vite.config.ts` 中映射）。
- 不要提交 API Key 或大体积资源；`dist/` 与 `node_modules/` 不应纳入版本控制。

## 面向代理的说明
- 本文件的作用域为仓库根目录。请遵循 `@/` 别名，除非必要请勿重命名文件，并保持最小且聚焦的差异。

