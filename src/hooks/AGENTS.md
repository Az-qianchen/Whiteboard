# hooks 目录指南

## 基本约定
- 每个文件导出一个或一组相关的自定义 hook，命名均以 `use` 开头。
- Hook 内部保持纯粹：避免直接修改外部模块状态，必要时通过参数或回调注入。
- 对外暴露的 API 使用 TypeScript 明确输入输出类型，必要时编写泛型约束。

## 副作用管理
- 使用 `useEffect`/`useLayoutEffect` 时，依赖数组必须完整，禁止忽略 ESLint 提示。
- 订阅或事件监听需在清理函数中解除，确保组件卸载后不留残余副作用。

## 复用与测试
- 把通用业务逻辑拆成小型 hook，组合使用时保持单一职责。
- 在 `tests/lib` 或 `tests/hooks`（若新增） 中为复杂 hook 编写单元测试，可借助 React Testing Library hooks 渲染器。

## 文档
- 文件顶部添加简短注释描述用途，必要时在 README 或内联注释中说明使用示例。
