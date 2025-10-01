/**
 * 本文件定义了整个应用中使用的所有 TypeScript 类型和接口。
 * 这有助于确保代码的类型安全和可读性，定义了如点、路径、工具等核心数据结构。
 */
import type { Dispatch, SetStateAction } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface Anchor {
  point: Point;       // 锚点
  handleIn: Point;    // 控制进入此锚点的曲线的控制点
  handleOut: Point;   // 控制离开此锚点的曲线的控制点
}

export interface QuadCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export type QuadWarpOffsets = QuadCorners;

// BBox moved here from geometry.ts to avoid circular dependencies
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EndpointStyle = 'none' | 'arrow' | 'triangle' | 'dot' | 'square' | 'circle' | 'diamond' | 'bar' | 'butt' | 'round' | 'square_cap' | 'reverse_arrow';

export interface StyleClipboardData {
  color?: string;
  fill?: string;
  fillGradient?: GradientFill | null;
  fillStyle?: string;
  strokeWidth?: number;
  strokeLineDash?: [number, number];
  strokeLineCapStart?: EndpointStyle;
  strokeLineCapEnd?: EndpointStyle;
  strokeLineJoin?: 'miter' | 'round' | 'bevel';
  endpointSize?: number;
  endpointFill?: 'solid' | 'hollow';
  isRough?: boolean;
  opacity?: number;
  roughness?: number;
  bowing?: number;
  fillWeight?: number;
  hachureAngle?: number;
  hachureGap?: number;
  curveTightness?: number;
  curveStepCount?: number;
  preserveVertices?: boolean;
  disableMultiStroke?: boolean;
  disableMultiStrokeFill?: boolean;
  borderRadius?: number;
  sides?: number;
  fontFamily?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  blur?: number;
  shadowEnabled?: boolean;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowColor?: string;
}

export type MaterialData = {
  shapes: AnyPath[];
}

export interface GradientStop {
  offset: number; // 0 - 1
  color: string;
  opacity?: number;
}

export interface GradientHandle {
  x: number;
  y: number;
}

export interface LinearGradientFill {
  type: 'linear';
  angle: number; // degrees
  stops: GradientStop[];
  start?: GradientHandle;
  end?: GradientHandle;
}

export interface RadialGradientFill {
  type: 'radial';
  stops: GradientStop[];
  center: GradientHandle;
  edge: GradientHandle;
}

export type GradientFill = LinearGradientFill | RadialGradientFill;

export type GradientControlHandle = 'start' | 'end' | 'center' | 'edge';

export type LibraryData = {
  type: 'whiteboard/library';
  version: 1;
  styles: StyleClipboardData[];
  materials: MaterialData[];
};


export type Alignment = 'left' | 'right' | 'h-center' | 'top' | 'bottom' | 'v-center';
export type DistributeMode = 'edges' | 'centers';

export interface PngExportOptions {
  scale: number;
  highQuality: boolean;
  transparentBg: boolean;
  padding?: number;
}
export interface AnimationExportOptions {
  format: 'sequence' | 'spritesheet';
  columns: number;
  clipToFrameId?: string | 'full';
}

// 图片矢量化参数选项
export interface TraceOptions {
  ltres: number;          // 直线阈值
  qtres: number;          // 曲线阈值
  pathomit: number;       // 忽略小路径长度
  numberofcolors: number; // 颜色数量
}

interface ShapeBase {
  id: string;
  name?: string; // 用于图层，特别是组
  color: string;
  fill: string;
  fillGradient?: GradientFill | null;
  fillStyle: string;
  strokeWidth: number;
  strokeLineDash?: [number, number];
  strokeLineCapStart?: EndpointStyle;
  strokeLineCapEnd?: EndpointStyle;
  strokeLineJoin?: 'miter' | 'round' | 'bevel';
  endpointSize?: number; // 端点尺寸 (描边宽度的倍数)
  endpointFill?: 'solid' | 'hollow'; // 端点填充样式
  isRough?: boolean; // 是否使用手绘风格渲染
  opacity?: number;
  rotation?: number; // in radians
  scaleX?: number;
  scaleY?: number;
  isVisible?: boolean; // 是否可见 (图层面板)
  isLocked?: boolean;  // 是否锁定 (图层面板)
  // RoughJS 属性
  roughness: number;
  bowing: number;
  fillWeight: number; // 填充影线的描边权重
  hachureAngle: number; // 填充影线的角度
  hachureGap: number; // 填充影线之间的间隙
  curveTightness: number; // 用于 rc.curve
  curveStepCount: number; // 用于 rc.curve
  preserveVertices?: boolean;
  disableMultiStroke?: boolean;
  disableMultiStrokeFill?: boolean;
  // 效果
  blur?: number;
  shadowEnabled?: boolean;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowColor?: string;
}

// 任何已存储、可编辑路径的基础接口。
interface AnchoredPathBase extends ShapeBase {
  anchors: Anchor[];
  isClosed?: boolean;
}

export interface VectorPathData extends AnchoredPathBase {
  tool: 'pen' | 'line';
}

export interface BrushPathData extends ShapeBase {
  tool: 'brush';
  points: Point[];
}

export interface RectangleData extends ShapeBase {
  tool: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  skewX?: number;
  skewY?: number;
  warp?: QuadWarpOffsets;
}

export interface FrameData extends ShapeBase {
  tool: 'frame';
  x: number;
  y: number;
  width: number;
  height: number;
  skewX?: number;
  skewY?: number;
}

export interface PolygonData extends ShapeBase {
  tool: 'polygon';
  x: number;
  y: number;
  width: number;
  height: number;
  sides: number;
  borderRadius?: number;
  skewX?: number;
  skewY?: number;
}

export interface EllipseData extends ShapeBase {
  tool: 'ellipse';
  x: number; // top-left corner of bounding box
  y: number; // top-left corner of bounding box
  width: number;
  height: number;
  skewX?: number;
  skewY?: number;
}

export interface BinaryFileMetadata {
  id: string;
  mimeType: string;
  size: number;
  created: number;
  lastModified: number;
  name?: string;
}

export interface BinaryFile extends BinaryFileMetadata {
  blob: Blob;
}

export interface ImageData extends ShapeBase {
  tool: 'image';
  fileId: string;
  // Legacy field retained for migrations – new code should rely on fileId.
  src?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  skewX?: number;
  skewY?: number;
  warp?: QuadWarpOffsets;
}

export interface ArcData extends ShapeBase {
  tool: 'arc';
  points: [Point, Point, Point]; // start, end, via
}

export interface GroupData extends ShapeBase {
  tool: 'group';
  children: AnyPath[];
  isCollapsed?: boolean; // 用于图层面板UI
  mask?: 'clip'; // 新增：用于标识遮罩组
}

// 任何已存储并已转换为锚点的路径的通用类型。
export type AnyPath = VectorPathData | RectangleData | EllipseData | ImageData | BrushPathData | PolygonData | ArcData | GroupData | FrameData;

export interface Frame {
  id: string;
  paths: AnyPath[];
}

export type FrameInput = Omit<Frame, 'id'> & { id?: string };

export interface WhiteboardData {
  type: 'whiteboard/shapes';
  version: number; // 2 for old, 3 for new with frames
  paths?: AnyPath[]; // For backward compatibility (version 2)
  frames?: Frame[]; // For new version 3
  backgroundColor?: string;
  fps?: number;
  files?: Record<string, { dataURL: string; mimeType?: string }>; // Legacy export compatibility
}

// 用于实时手绘的临时路径类型。
export interface LivePath extends ShapeBase {
  id: string;
  tool: 'brush';
  points: Point[];
}

export interface DrawingArcData extends ShapeBase {
  tool: 'arc';
  points: Point[]; // 0 to 3 points
}

export type DrawingShape = RectangleData | EllipseData | VectorPathData | PolygonData | DrawingArcData | FrameData;

// A brush path that is being drawn, represented by a series of points.
export type BrushPathWithPoints = LivePath;

export type Tool = 'pen' | 'brush' | 'selection' | 'rectangle' | 'polygon' | 'ellipse' | 'line' | 'arc' | 'frame';

export type SelectionMode = 'move' | 'edit' | 'lasso';

export type ResizeHandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'right' | 'bottom' | 'left';

// A drag state for vector paths
type VectorDragState = {
  type: 'anchor' | 'handleIn' | 'handleOut';
  pathId: string;
  anchorIndex: number;
  initialPoint: Point;
};

// A drag state for moving shapes
type MoveDragState = {
  type: 'move';
  pathIds: string[];
  originalPaths: AnyPath[];
  initialPointerPos: Point;
  initialSelectionBbox: BBox;
  axisLock: 'x' | 'y' | null;
};

// A drag state for resizing a single shape
type ResizeDragState = {
  type: 'resize';
  pathId: string;
  handle: ResizeHandlePosition;
  originalPath: RectangleData | EllipseData | ImageData | PolygonData | FrameData;
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

type SkewDragState = {
  type: 'skew';
  pathId: string;
  handle: ResizeHandlePosition;
  originalPath: RectangleData | EllipseData | ImageData | PolygonData | FrameData;
  initialPointerPos: Point;
};

type WarpDragState = {
  type: 'warp';
  pathId: string;
  handle: ResizeHandlePosition;
  originalPath: RectangleData | ImageData;
  initialPointerPos: Point;
  baseCorners: QuadCorners;
  warpedCorners: QuadCorners;
  initialHandlePoint: Point;
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
  originalPath: RectangleData | ImageData | PolygonData;
  initialPointerPos: Point;
};

// A drag state for editing an arc
type ArcDragState = {
  type: 'arc';
  pathId: string;
  pointIndex: 0 | 1 | 2;
  initialPoint: Point;
};

type CropDragState = {
    type: 'crop';
    pathId: string;
    handle: ResizeHandlePosition;
    initialCropRect: BBox;
    originalImage: ImageData;
    initialPointerPos: Point;
}

type GradientDragState = {
    type: 'gradient';
    pathId: string;
    handle: GradientControlHandle;
}

// Union of all possible drag states
export type DragState = VectorDragState | MoveDragState | ResizeDragState | ScaleDragState | SkewDragState | WarpDragState | RotateDragState | BorderRadiusDragState | ArcDragState | CropDragState | GradientDragState | null;

export interface SelectionPathState {
  paths: AnyPath[];
  setPaths: Dispatch<SetStateAction<AnyPath[]>>;
  selectedPathIds: string[];
  setSelectedPathIds: Dispatch<SetStateAction<string[]>>;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

export interface SelectionToolbarState {
  selectionMode: SelectionMode;
}

export interface CanvasViewTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface SelectionViewTransform {
  viewTransform: CanvasViewTransform;
  getPointerPosition: (e: { clientX: number; clientY: number }, svg: SVGSVGElement) => Point;
}