/**
 * 本文件包含了整个应用中使用的常量。
 * 这包括颜色配置、RoughJS 的默认参数以及 UI 中使用的 SVG 图标等。
 */

import React from 'react';
import type { EndpointStyle } from './types';
import {
  Undo2, Redo2, Trash2, PenTool, Check,
  Move, Square, Circle, Lasso, SlidersHorizontal,
  Grid3X3, Scissors, Copy, ClipboardList, FlipHorizontal2, FlipVertical2,
  FileCode2, FileImage, FileDown, Menu, Save, Folder, Layers, MoreVertical,
  MoreHorizontal, Plus, Image as ImageIcon, Boxes, ChevronLeft, Lock, LockOpen,
  Eye, EyeOff, Paintbrush, ArrowUpSquare, ArrowDownSquare,
  Pipette, SwatchBook, X, Spline, Waypoints, Triangle, GitCommitHorizontal, Layers2,
  CircleDot, ChevronDown,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  Pencil, Type,
  MousePointer2, Paintbrush2, AlignHorizontalSpaceAround,
  AlignLeft, AlignJustify, AlignRight,
  Sparkles, GripVertical,
  Blend,Slash,MoveRight,
  Play, Pause, Rewind, ChevronUp, Wand2,SquaresExclude,SquaresIntersect,SquaresSubtract,SquaresUnite,
  // FIX: `RectangleDashed` is not a valid icon in `lucide-react`. Replaced with `SquareDashed`.
  SquareDashed,
  RotateCcw,
} from 'lucide-react';

const ICON_SIZE = 'w-[17px] h-[17px]';
const ICON_SIZE_SM = 'w-[14px] h-[14px]';

export const BUTTON_SIZE = 'w-[34px] h-[34px]';
export const BUTTON_SIZE_SM = 'w-[31px] h-[31px]';
export const BUTTON_SIZE_XS = 'w-[27px] h-[27px]';


export const COLORS = [
  '#FFFFFF', // White
  '#f03e3e', // oc-red-6
  '#228be6', // oc-blue-6
  '#40c057', // oc-green-6
  '#f76707', // oc-orange-6
  '#7950f2', // oc-violet-6
  '#d6336c', // oc-pink-6
];

// RoughJS 的默认参数
export const DEFAULT_ROUGHNESS = 2.5;
export const DEFAULT_BOWING = 1;
// Sensible defaults that are not the special "-1" value.
export const DEFAULT_FILL_WEIGHT = 2.55;
export const DEFAULT_HACHURE_GAP = 10.25;
export const DEFAULT_HACHURE_ANGLE = 0; // 度
export const DEFAULT_CURVE_TIGHTNESS = 0;
export const DEFAULT_CURVE_STEP_COUNT = 1;
export const DEFAULT_PRESERVE_VERTICES = false;
export const DEFAULT_DISABLE_MULTI_STROKE = false;
export const DEFAULT_DISABLE_MULTI_STROKE_FILL = false;

const ENDPOINT_ICONS = {
  NONE: (
    <svg viewBox="0 0 24 24" className={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  DOT: (
    <svg viewBox="0 0 24 24" className={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="14" y2="12" />
        <path d="M20 8.5 L14 12 L20 15.5 Z" fill="none" />
    </svg>
  ),
  ARROW: (
    <svg viewBox="0 0 24 24" className={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12" />
        <polyline points="14 8.5 20 12 14 15.5" />
    </svg>
  ),
  REVERSE_ARROW: (
    <svg viewBox="0 0 24 24" className={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h8m0 0l6 -4.5m-6 4.5l6 4.5" />
    </svg>
  ),
  TRIANGLE: (
    <svg viewBox="0 0 24 24" className={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="14" y2="12" />
        <path d="M14 8.5 L20 12 L14 15.5 Z" fill="none" />
    </svg>
  ),
  SQUARE: (
    <svg viewBox="0 0 24 24" className={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="16" y2="12" />
        <rect x="16" y="8" width="8" height="8" fill="none" />
    </svg>
  ),
  CIRCLE: (
    <svg viewBox="0 0 24 24" className={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="15" y2="12" />
        <circle cx="19" cy="12" r="4" fill="none" />
    </svg>
  ),
  DIAMOND: (
    <svg viewBox="0 0 24 24" className={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="14" y2="12" />
        <path d="M18 8 L22 12 L18 16 L14 12 Z" fill="none" />
    </svg>
  ),
  BAR: (
    <svg viewBox="0 0 24 24" className={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="20" y1="7" x2="20" y2="17" />
    </svg>
  ),
};

export const ENDPOINT_STYLES: { name: EndpointStyle; title: string; icon: JSX.Element }[] = [
  { name: 'none', title: '无', icon: ENDPOINT_ICONS.NONE },
  { name: 'arrow', title: '箭头', icon: ENDPOINT_ICONS.ARROW },
  { name: 'reverse_arrow', title: '分叉', icon: ENDPOINT_ICONS.REVERSE_ARROW },
  { name: 'dot', title: '倒三角', icon: ENDPOINT_ICONS.DOT },
  { name: 'triangle', title: '三角', icon: ENDPOINT_ICONS.TRIANGLE },
  { name: 'square', title: '方块', icon: ENDPOINT_ICONS.SQUARE },
  { name: 'circle', title: '圆', icon: ENDPOINT_ICONS.CIRCLE },
  { name: 'diamond', title: '菱形', icon: ENDPOINT_ICONS.DIAMOND },
  { name: 'bar', title: '竖线', icon: ENDPOINT_ICONS.BAR },
];


export const ICONS = {
  UNDO: <Undo2 className={ICON_SIZE} />,
  REDO: <Redo2 className={ICON_SIZE} />,
  CLEAR: <Trash2 className={ICON_SIZE} />,
  PEN: <PenTool className={ICON_SIZE} />,
  BRUSH: <Pencil className={ICON_SIZE} />,
  CHECK: <Check className={ICON_SIZE} />,
  SELECTION: <MousePointer2 className={ICON_SIZE} />,
  EDIT: <Spline className={ICON_SIZE} />,
  MOVE: <Move className={ICON_SIZE} />,
  RECTANGLE: <Square className={ICON_SIZE} />,
  POLYGON: <Triangle className={ICON_SIZE} />,
  ELLIPSE: <Circle className={ICON_SIZE} />,
  LINE: <Slash className={ICON_SIZE} />,
  ARC: <Spline className={ICON_SIZE} />,
  TEXT: <Type className={ICON_SIZE} />,
  FRAME: <SquareDashed className={ICON_SIZE} />,
  LASSO: <Lasso className={ICON_SIZE} />,
  PROPERTIES: <SlidersHorizontal className={ICON_SIZE} />,
  GRID: <Grid3X3 className={ICON_SIZE} />,
  CUT: <Scissors className={ICON_SIZE} />,
  COPY: <Copy className={ICON_SIZE} />,
  PASTE: <ClipboardList className={ICON_SIZE} />,
  FLIP_HORIZONTAL: <FlipHorizontal2 className={ICON_SIZE} />,
  FLIP_VERTICAL: <FlipVertical2 className={ICON_SIZE} />,
  COPY_SVG: <FileCode2 className={ICON_SIZE} />,
  COPY_PNG: <FileImage className={ICON_SIZE} />,
  IMPORT: <FileDown className={ICON_SIZE} />,
  MENU: <Menu className={ICON_SIZE} />,
  SAVE: <Save className={ICON_SIZE} />,
  OPEN: <Folder className={ICON_SIZE} />,
  PATH_CONVERT: <Spline className={ICON_SIZE} />,
  SIMPLIFY_PATH: <Waypoints className={ICON_SIZE} />,
  BRING_FORWARD: <ArrowUpSquare className={ICON_SIZE} />,
  SEND_BACKWARD: <ArrowDownSquare className={ICON_SIZE} />,
  CHEVRON_LEFT: <ChevronLeft className={ICON_SIZE} />,
  CHEVRON_DOWN: <ChevronDown className={ICON_SIZE_SM} />,
  CHEVRON_UP: <ChevronUp className={ICON_SIZE} />,
  LOCK_CLOSED: <Lock className={ICON_SIZE} />,
  LOCK_OPEN: <LockOpen className={ICON_SIZE} />,
  EYE_OPEN: <Eye className={ICON_SIZE} />,
  EYE_OFF: <EyeOff className={ICON_SIZE} />,
  TRASH: <Trash2 className={ICON_SIZE} />,
  LAYERS: <Layers className={ICON_SIZE} />,
  BACKGROUND_COLOR: <Paintbrush className={ICON_SIZE} />,
  ALIGN_LEFT: <AlignLeft className={ICON_SIZE} />,
  ALIGN_HORIZONTAL_CENTER: <AlignJustify className={ICON_SIZE} />,
  ALIGN_RIGHT: <AlignRight className={ICON_SIZE} />,
  ALIGN_TOP: <AlignStartHorizontal className={ICON_SIZE} />,
  ALIGN_VERTICAL_CENTER: <AlignCenterHorizontal className={ICON_SIZE} />,
  ALIGN_BOTTOM: <AlignEndHorizontal className={ICON_SIZE} />,
  ALIGN_DISTRIBUTE: <AlignHorizontalSpaceAround className={ICON_SIZE} />,
  DISTRIBUTE_HORIZONTAL: <AlignHorizontalJustifyCenter className={ICON_SIZE_SM} />,
  DISTRIBUTE_VERTICAL: <AlignVerticalJustifyCenter className={ICON_SIZE_SM} />,
  STYLE_LIBRARY: <SwatchBook className={ICON_SIZE} />,
  ENDPOINT_FILL_HOLLOW: <CircleDot className={ICON_SIZE} />,
  ENDPOINT_FILL_SOLID: <Circle className={`${ICON_SIZE} fill-current`} />,
  ENDPOINT_SETTINGS: <MoveRight className={ICON_SIZE} />,
  DASH_SETTINGS: <MoreHorizontal className={ICON_SIZE} />,
  MORE_VERTICAL: <MoreVertical className={ICON_SIZE_SM} />,
  PLUS: <Plus className={ICON_SIZE} />,
  IMAGE: <ImageIcon className={ICON_SIZE} />,
  GROUP: <Boxes className={ICON_SIZE} />,
  LOGO: <Pencil className={ICON_SIZE} />,
  EYEDROPPER: <Pipette className={ICON_SIZE} />,
  EFFECTS: <Sparkles className={ICON_SIZE} />,
  X: <X className={ICON_SIZE_SM} />,
  GRIP: <GripVertical className={ICON_SIZE_SM} />,
  MASK: <Blend className={ICON_SIZE} />,
  PLAY: <Play className={ICON_SIZE} />,
  PAUSE: <Pause className={ICON_SIZE} />,
  REWIND: <Rewind className={ICON_SIZE} />,
  TRACE_IMAGE: <Wand2 className={ICON_SIZE} />,
  BOOLEAN_UNION: <SquaresUnite className={ICON_SIZE} />,
  BOOLEAN_SUBTRACT: <SquaresSubtract className={ICON_SIZE} />,
  BOOLEAN_INTERSECT: <SquaresIntersect className={ICON_SIZE} />,
  BOOLEAN_EXCLUDE: <SquaresExclude className={ICON_SIZE} />,
  ONION_SKIN: <Layers2 className={ICON_SIZE} />,
  RESET_PREFERENCES: <RotateCcw className={ICON_SIZE} />,
};
