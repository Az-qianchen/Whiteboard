# 项目介绍
这是一个类似 Excalidraw 的白板工具，可以绘制手绘风格的矢量图形。

## 功能特性
- **画笔工具**: 快速绘制具有可调节粗糙度的手绘风格线条。
- **钢笔工具**: 创建和编辑精确的、平滑的贝塞尔曲线。
- **AI 绘图**: 通过文本提示生成矢量图形。
- **形状工具**: 绘制矩形、椭圆和直线。
- **编辑工具**: 移动锚点和控制手柄，微调任何路径。
- **丰富的工具栏**: 包括颜色选择器、描边宽度、撤销/重做和清除画布等功能。
- **平移和缩放**: 流畅的画布导航。
- **网格与吸附**: 可切换的网格和吸附功能，用于精确对齐。

## 快捷键 (Shortcuts)

### 工具切换
- `V`: 选择工具 (Select/Edit Tool)
- `B`: 画笔工具 (Brush Tool)
- `P`: 钢笔工具 (Pen Tool)
- `A`: 打开 AI 绘图对话框 (Open AI Drawing Dialog)
- `R`: 矩形工具 (Rectangle Tool)
- `O`: 椭圆工具 (Ellipse Tool)
- `L`: 线条工具 (Line Tool)

### 编辑操作
- `Ctrl/Cmd + Z`: 撤销 (Undo)
- `Ctrl/Cmd + Shift + Z`: 重做 (Redo)
- `Backspace` / `Delete`: 删除选中项 (Delete Selection)
- `Ctrl + 点击路径`: 在路径上添加一个新点 (Add a new point on a path)
- `Alt + 点击锚点`: 删除一个点 (Delete a point)
- `Escape`: 取消选择 / 取消当前绘制 (Clear Selection / Cancel Drawing)
- `Enter`: (使用钢笔工具时) 完成路径 (Finish Path with Pen Tool)

### 画布导航
- **平移**: 按住鼠标中键并拖动 (Hold middle mouse button and drag)
- **缩放**: 使用鼠标滚轮 (Use mouse wheel)
- `G`: 切换网格和吸附 (Toggle Grid & Snapping)

### 绘图辅助
- `Shift` + 拖动绘制形状: 绘制正方形/正圆 (Draw perfect square/circle)
- `Shift` + 拖动绘制直线: 按 45° 角度吸附 (Snap line to 45° increments)
- `Shift` + 拖动控制手柄: 独立（非对称）移动手柄 (Move handle independently)


# 项目架构
该项目采用基于 React Hooks 的现代化架构，以实现关注点分离和最大的可维护性。

- `App.tsx`: 作为应用的组合根，将各个部分连接在一起。
- `components/`: 包含 UI 组件，如 `Toolbar` 和 `Whiteboard`。
- `hooks/`: 存放大部分应用逻辑的自定义 React Hooks。
  - `usePaths`: 管理所有路径数据（创建、更新、删除）。
  - `useToolbarState`: 管理工具栏的状态（颜色、描边宽度、工具等）。
  - `usePointerInteraction`: 处理所有画布上的指针事件（绘图、编辑、选择）。
  - `useViewTransform`: 控制画布的平移和缩放。
- `lib/`: 包含辅助函数和算法，如路径拟合和几何计算。
- `types.ts`: 定义了整个应用中使用的数据结构和类型。
- `constants.tsx`: 存储应用范围内的常量，如颜色和图标。

# 项目规范(不要编辑这一章节)
1. 每一个功能尽量保持解耦，单一脚本不要过长
2. 功能实现尽量引用成熟的库
3. 每个脚本顶部写明该脚本的功能
