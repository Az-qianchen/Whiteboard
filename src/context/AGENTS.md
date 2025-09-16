# context 目录指南

## 设计原则
- 用于存放跨组件共享的状态容器（React Context 或 Zustand store 包装）。
- 每个 store 单独成文件，并暴露创建函数、提供器组件与选择器工具。
- 若使用 Zustand，请保持 `create` 配置纯粹；避免在 store 定义中直接访问 DOM。

## 类型约束
- 状态、动作类型需显式定义接口或类型别名，确保在组件中获得完整推断。
- 导出的 hook（如 `useToolStore`）需返回只读片段或选择器，禁止暴露整个状态对象的可写引用。

## 副作用与持久化
- 初始化副作用放在 Provider 组件内部的 `useEffect` 中，保证可预测性。
- 本地存储/IndexedDB 持久化逻辑应拆分至 `@/lib` 并通过注入方式使用。

## 测试
- 为 store 行为在 `tests/context` 中编写单元测试，覆盖状态变更与边界条件。
- Provider 组件应提供用于测试的轻量包裹器（例如 `TestAppProvider`）。
