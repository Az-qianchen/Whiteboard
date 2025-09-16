# tests/context 目录指南

## 测试目标
- 验证 store/context 的状态初始化、动作处理以及选择器的正确性。
- 覆盖边界条件（例如空数据、错误输入、重复操作），确保状态保持可预测。

## 工具与约定
- 使用 Vitest 的 `beforeEach`/`afterEach` 重置 store，避免测试间状态泄漏。
- 如需模拟浏览器 API（`localStorage`、`IndexedDB` 等），请在测试文件顶部集中 mock，并在用例结束后清理。
- 对包含异步逻辑的 store，使用 `await`/`vi.useFakeTimers()` 结合 `vi.runAllTimers()` 驱动流程。

## 文档
- 在测试描述中明确动作或场景（例如 `should reset tool when switching mode`），便于回归时快速定位。
