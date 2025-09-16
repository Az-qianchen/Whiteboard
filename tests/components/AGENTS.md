# tests/components 目录指南

## 测试范围
- 覆盖 UI 组件的交互、可访问性及视觉状态（通过快照或查询断言）。
- 仅测试公开 API，避免断言内部实现细节或私有函数。

## 编写约定
- 使用 React Testing Library 提供的 `render`、`screen`、`userEvent`，模拟用户行为。
- 对异步 UI 状态使用 `await screen.findBy...`；避免使用 `setTimeout` 等硬等待方案。
- 需要 mock 上下文时，优先使用实际 Provider 的测试包装器，而非手写 stub。

## 快照策略
- 快照测试需保持最小化，仅用于结构稳定的静态组件，并在更新时明确说明原因。
