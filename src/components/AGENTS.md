# components 目录指南

## 组件结构
- 每个文件聚焦一个可复用组件，复杂组件可新建子目录拆分子组件。
- 组件统一使用函数式写法，并具名导出（例如 `export function ColorPicker(...)`）。
- Props 类型定义放在文件顶部，命名为 `XxxProps`，必要时导出供外部复用。
- 如果组件需要暴露 ref，请使用 `forwardRef` 并附带泛型类型。

## 状态与交互
- UI 状态优先使用受控模式；复杂状态拆至 `hooks/` 或 `context/`。
- 副作用保持最小化，DOM 操作需通过 `useEffect`/`useLayoutEffect` 并妥善清理。

## 样式
- 样式使用 Tailwind CSS 原子类组合，避免在组件内书写大段内联样式。
- 颜色、尺寸等常量统一存放在 `@/constants` 或专门的配置文件中。

## 无障碍与可测试性
- 提供语义化标签和 `aria-*` 属性，确保键盘可访问性。
- 为交互组件提供可选择的 `data-testid`，便于在 `tests/components` 中编写测试。
