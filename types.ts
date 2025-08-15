
export interface Point {
  x: number;
  y: number;
}

export interface Anchor {
  point: Point;       // 锚点
  handleIn: Point;    // 控制进入此锚点的曲线的控制点
  handleOut: Point;   // 控制离开此锚点的曲线的控制点
}

interface ShapeBase {
  id: string;
  color: string;
  fill: string;
  fillStyle: string;
  strokeWidth: number;
  // RoughJS 属性
  roughness: number;
  bowing: number;
  fillWeight: number; // 填充影线的描边权重
  hachureAngle: number; // 填充影线的角度
  hachureGap: number; // 填充影线之间的间隙
  curveTightness: number; // 用于 rc.curve
  curveStepCount: number; // 用于 rc.curve
}

// 任何已存储、可编辑路径的基础接口。
interface AnchoredPathBase extends ShapeBase {
  anchors: Anchor[];
  isClosed?: boolean;
}

export interface VectorPathData extends AnchoredPathBase {
  tool: 'pen' | 'line';
}

export interface BrushPathData extends AnchoredPathBase {
  tool: 'brush';
}

export interface RectangleData extends ShapeBase {
  tool: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseData extends ShapeBase {
  tool: 'ellipse';
  x: number; // top-left corner of bounding box
  y: number; // top-left corner of bounding box
  width: number;
  height: number;
}

// 任何已存储并已转换为锚点的路径的通用类型。
export type AnyPath = VectorPathData | BrushPathData | RectangleData | EllipseData;

// 用于实时手绘的临时路径类型。
export interface LivePath extends ShapeBase {
  id: string;
  tool: 'pen' | 'brush';
  points: Point[];
}

export type DrawingShape = RectangleData | EllipseData | VectorPathData;

// A brush path that is being drawn, represented by a series of points.
export type BrushPathWithPoints = LivePath;

export type Tool = 'pen' | 'brush' | 'edit' | 'rectangle' | 'ellipse' | 'line';

export type ResizeHandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'right' | 'bottom' | 'left';

// A drag state for vector paths
type VectorDragState = {
  type: 'anchor' | 'handleIn' | 'handleOut';
  pathId: string;
  anchorIndex: number;
};

// A drag state for moving shapes
type MoveDragState = {
  type: 'move';
  pathIds: string[];
  originalPaths: AnyPath[];
  initialPointerPos: Point;
};

// A drag state for resizing a single shape
type ResizeDragState = {
  type: 'resize';
  pathId: string;
  handle: ResizeHandlePosition;
  originalPath: RectangleData | EllipseData | BrushPathData;
  initialPointerPos: Point;
};

export type DragState = VectorDragState | MoveDragState | ResizeDragState | null;