
export interface Point {
  x: number;
  y: number;
}

export interface Anchor {
  point: Point;       // 锚点
  handleIn: Point;    // 控制进入此锚点的曲线的控制点
  handleOut: Point;   // 控制离开此锚点的曲线的控制点
}

// BBox moved here from geometry.ts to avoid circular dependencies
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EndpointStyle = 'none' | 'arrow' | 'triangle' | 'dot' | 'square' | 'circle' | 'diamond' | 'bar' | 'butt' | 'round' | 'square_cap' | 'reverse_arrow';

interface ShapeBase {
  id: string;
  color: string;
  fill: string;
  fillStyle: string;
  strokeWidth: number;
  strokeLineDash?: [number, number];
  strokeLineCapStart?: EndpointStyle;
  strokeLineCapEnd?: EndpointStyle;
  strokeLineJoin?: 'miter' | 'round' | 'bevel';
  endpointSize?: number; // 端点尺寸 (描边宽度的倍数)
  endpointFill?: 'solid' | 'hollow'; // 端点填充样式
  opacity?: number;
  rotation?: number; // in radians
  // RoughJS 属性
  roughness: number;
  bowing: number;
  fillWeight: number; // 填充影线的描边权重
  hachureAngle: number; // 填充影线的角度
  hachureGap: number; // 填充影线之间的间隙
  curveTightness: number; // 用于 rc.curve
  curveStepCount: number; // 用于 rc.curve
  curveFitting?: number; // 用于 rc.curve
  preserveVertices?: boolean;
  disableMultiStroke?: boolean;
  disableMultiStrokeFill?: boolean;
  simplification?: number;
}

// 任何已存储、可编辑路径的基础接口。
interface AnchoredPathBase extends ShapeBase {
  anchors: Anchor[];
  isClosed?: boolean;
}

export interface VectorPathData extends AnchoredPathBase {
  tool: 'pen' | 'line';
}

export interface RectangleData extends ShapeBase {
  tool: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

export interface EllipseData extends ShapeBase {
  tool: 'ellipse';
  x: number; // top-left corner of bounding box
  y: number; // top-left corner of bounding box
  width: number;
  height: number;
}

export interface ImageData extends ShapeBase {
  tool: 'image';
  src: string; // data URL
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

// 任何已存储并已转换为锚点的路径的通用类型。
export type AnyPath = VectorPathData | RectangleData | EllipseData | ImageData;

// 用于实时手绘的临时路径类型。
export interface LivePath extends ShapeBase {
  id: string;
  tool: 'pen' | 'brush';
  points: Point[];
}

export type DrawingShape = RectangleData | EllipseData | VectorPathData;

// A brush path that is being drawn, represented by a series of points.
export type BrushPathWithPoints = LivePath;

export type Tool = 'pen' | 'brush' | 'selection' | 'rectangle' | 'ellipse' | 'line';

export type SelectionMode = 'move' | 'edit';

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
  initialSelectionBbox: BBox;
};

// A drag state for resizing a single shape
type ResizeDragState = {
  type: 'resize';
  pathId: string;
  handle: ResizeHandlePosition;
  originalPath: RectangleData | EllipseData | ImageData;
  initialPointerPos: Point;
};

// A drag state for scaling multiple shapes
type ScaleDragState = {
  type: 'scale';
  pathIds: string[];
  handle: ResizeHandlePosition;
  originalPaths: AnyPath[];
  initialPointerPos: Point;
  initialSelectionBbox: BBox;
};

// A drag state for rotating multiple shapes
type RotateDragState = {
    type: 'rotate';
    pathIds: string[];
    originalPaths: AnyPath[];
    center: Point;
    initialAngle: number;
};

// A drag state for changing border radius
type BorderRadiusDragState = {
  type: 'border-radius';
  pathId: string;
  originalPath: RectangleData | ImageData;
  initialPointerPos: Point;
};


export type DragState = VectorDragState | MoveDragState | ResizeDragState | ScaleDragState | RotateDragState | BorderRadiusDragState | null;