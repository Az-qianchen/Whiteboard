/**
 * 本文件包含了整个应用中使用的常量。
 * 这包括颜色配置、RoughJS 的默认参数以及 UI 中使用的 SVG 图标等。
 */

import React from 'react';
import type { EndpointStyle } from './types';
import {
  Undo2, Redo2, Trash2, PenTool, Check,
  Move, Square, Circle, Lasso, SlidersHorizontal, Sliders, Eraser,
  Grid3X3, Scissors, Copy, ClipboardList, FlipHorizontal2, FlipVertical2,
  FileCode2, FileImage, FileDown, Menu, Save, Folder, Layers, MoreVertical,
  MoreHorizontal, Plus, Image as ImageIcon, Boxes, ChevronLeft, Lock, LockOpen,
  Eye, EyeOff, Paintbrush, ArrowUpSquare, ArrowDownSquare,
  Pipette, SwatchBook, X, Spline, Waypoints, Triangle, GitCommitHorizontal, Layers2,
  CircleDot, ChevronDown,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  Pencil,
  MousePointer2, Paintbrush2, AlignHorizontalSpaceAround,
  AlignLeft, AlignJustify, AlignRight,
  Sparkles, Languages, GripVertical,
  Blend,Slash,MoveRight,Type,
  Play, Pause, Rewind, ChevronUp, Wand2,SquaresExclude,SquaresIntersect,SquaresSubtract,SquaresUnite,
  SquareDashed,
  RotateCcw,
  Crop,
} from 'lucide-react';


export const COLORS = [
  '#FFFFFF', // White
  '#f03e3e', // oc-red-6
  '#228be6', // oc-blue-6
  '#40c057', // oc-green-6
  '#f76707', // oc-orange-6
  '#7950f2', // oc-violet-6
  '#d6336c', // oc-pink-6
];

export const CONTROL_BUTTON_CLASS =
  'flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]';

export const TIMELINE_PANEL_HEIGHT_VAR = 'var(--timeline-panel-height, 0px)';
export const TIMELINE_PANEL_COLLAPSED_OFFSET = '1rem';
export const TIMELINE_PANEL_BOTTOM_OFFSET = `calc(${TIMELINE_PANEL_HEIGHT_VAR} + ${TIMELINE_PANEL_COLLAPSED_OFFSET})`;
export const getTimelinePanelBottomOffset = () => TIMELINE_PANEL_BOTTOM_OFFSET;

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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  DOT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="14" y2="12" />
        <path d="M20 8.5 L14 12 L20 15.5 Z" fill="none" />
    </svg>
  ),
  ARROW: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12" />
        <polyline points="14 8.5 20 12 14 15.5" />
    </svg>
  ),
  REVERSE_ARROW: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h8m0 0l6 -4.5m-6 4.5l6 4.5" />
    </svg>
  ),
  TRIANGLE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="14" y2="12" />
        <path d="M14 8.5 L20 12 L14 15.5 Z" fill="none" />
    </svg>
  ),
  SQUARE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="16" y2="12" />
        <rect x="16" y="8" width="8" height="8" fill="none" />
    </svg>
  ),
  CIRCLE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="15" y2="12" />
        <circle cx="19" cy="12" r="4" fill="none" />
    </svg>
  ),
  DIAMOND: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="14" y2="12" />
        <path d="M18 8 L22 12 L18 16 L14 12 Z" fill="none" />
    </svg>
  ),
  BAR: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="20" y1="7" x2="20" y2="17" />
    </svg>
  ),
};

export const ENDPOINT_STYLES: { name: EndpointStyle; titleKey: string; icon: JSX.Element }[] = [
  { name: 'none', titleKey: 'sideToolbar.strokeStyle.options.none', icon: ENDPOINT_ICONS.NONE },
  { name: 'arrow', titleKey: 'sideToolbar.strokeStyle.options.arrow', icon: ENDPOINT_ICONS.ARROW },
  { name: 'reverse_arrow', titleKey: 'sideToolbar.strokeStyle.options.reverse_arrow', icon: ENDPOINT_ICONS.REVERSE_ARROW },
  { name: 'dot', titleKey: 'sideToolbar.strokeStyle.options.dot', icon: ENDPOINT_ICONS.DOT },
  { name: 'triangle', titleKey: 'sideToolbar.strokeStyle.options.triangle', icon: ENDPOINT_ICONS.TRIANGLE },
  { name: 'square', titleKey: 'sideToolbar.strokeStyle.options.square', icon: ENDPOINT_ICONS.SQUARE },
  { name: 'circle', titleKey: 'sideToolbar.strokeStyle.options.circle', icon: ENDPOINT_ICONS.CIRCLE },
  { name: 'diamond', titleKey: 'sideToolbar.strokeStyle.options.diamond', icon: ENDPOINT_ICONS.DIAMOND },
  { name: 'bar', titleKey: 'sideToolbar.strokeStyle.options.bar', icon: ENDPOINT_ICONS.BAR },
];


export const ICONS = {
  UNDO: <Undo2 className="h-5 w-5" />,
  REDO: <Redo2 className="h-5 w-5" />,
  CLEAR: <Trash2 className="h-5 w-5" />,
  PEN: <PenTool className="h-5 w-5" />,
  BRUSH: <Pencil className="h-5 w-5" />,
  CHECK: <Check className="h-5 w-5" />,
  SELECTION: <MousePointer2 className="h-5 w-5" />,
  EDIT: <Spline className="h-5 w-5" />,
  MOVE: <Move className="h-5 w-5" />,
  RECTANGLE: <Square className="h-5 w-5" />,
  POLYGON: <Triangle className="h-5 w-5" />,
  ELLIPSE: <Circle className="h-5 w-5" />,
  LINE: <Slash className="h-5 w-5" />,
  ARC: <Spline className="h-5 w-5" />,
  FRAME: <SquareDashed className="h-5 w-5" />,
  TEXT: <Type className="h-5 w-5" />,
  LASSO: <Lasso className="h-5 w-5" />,
  PROPERTIES: <SlidersHorizontal className="h-5 w-5" />,
  GRID: <Grid3X3 className="h-5 w-5" />,
  CUT: <Scissors className="h-5 w-5" />,
  COPY: <Copy className="h-5 w-5" />,
  PASTE: <ClipboardList className="h-5 w-5" />,
  FLIP_HORIZONTAL: <FlipHorizontal2 className="h-5 w-5" />,
  FLIP_VERTICAL: <FlipVertical2 className="h-5 w-5" />,
  COPY_SVG: <FileCode2 className="h-5 w-5" />,
  COPY_PNG: <FileImage className="h-5 w-5" />,
  IMPORT: <FileDown className="h-5 w-5" />,
  MENU: <Menu className="h-5 w-5" />,
  SAVE: <Save className="h-5 w-5" />,
  OPEN: <Folder className="h-5 w-5" />,
  PATH_CONVERT: <Spline className="h-5 w-5" />,
  SIMPLIFY_PATH: <Waypoints className="h-5 w-5" />,
  BRING_FORWARD: <ArrowUpSquare className="h-5 w-5" />,
  SEND_BACKWARD: <ArrowDownSquare className="h-5 w-5" />,
  CHEVRON_LEFT: <ChevronLeft className="h-[24px] w-[24px]" />,
  CHEVRON_DOWN: <ChevronDown className="w-full h-full" />,
  CHEVRON_UP: <ChevronUp className="h-[24px] w-[24px]" />,
  LOCK_CLOSED: <Lock className="h-5 w-5" />,
  LOCK_OPEN: <LockOpen className="h-5 w-5" />,
  EYE_OPEN: <Eye className="h-5 w-5" />,
  EYE_OFF: <EyeOff className="h-5 w-5" />,
  TRASH: <Trash2 className="h-5 w-5" />,
  LAYERS: <Layers className="h-5 w-5" />,
  BACKGROUND_COLOR: <Paintbrush className="h-5 w-5" />,
  ALIGN_LEFT: <AlignLeft className="h-5 w-5" />,
  ALIGN_HORIZONTAL_CENTER: <AlignJustify className="h-5 w-5" />,
  ALIGN_RIGHT: <AlignRight className="h-5 w-5" />,
  ALIGN_TOP: <AlignStartHorizontal className="h-5 w-5" />,
  ALIGN_VERTICAL_CENTER: <AlignCenterHorizontal className="h-5 w-5" />,
  ALIGN_BOTTOM: <AlignEndHorizontal className="h-5 w-5" />,
  ALIGN_DISTRIBUTE: <AlignHorizontalSpaceAround className="h-5 w-5" />,
  DISTRIBUTE_HORIZONTAL: <AlignHorizontalJustifyCenter className="h-4 w-4" />,
  DISTRIBUTE_VERTICAL: <AlignVerticalJustifyCenter className="h-4 w-4" />,
  STYLE_LIBRARY: <SwatchBook className="h-5 w-5" />,
  ENDPOINT_FILL_HOLLOW: <CircleDot />,
  ENDPOINT_FILL_SOLID: <Circle className="fill-current" />,
  ENDPOINT_SETTINGS: <MoveRight className="h-5 w-5" />,
  DASH_SETTINGS: <MoreHorizontal className="h-5 w-5" />,
  MORE_VERTICAL: <MoreVertical className="h-4 w-4" />,
  PLUS: <Plus className="h-5 w-5" />,
  IMAGE: <ImageIcon className="h-5 w-5" />,
  GROUP: <Boxes className="h-5 w-5" />,
  LOGO: <Pencil />,
  EYEDROPPER: <Pipette className="h-5 w-5" />,
  EFFECTS: <Sparkles className="h-5 w-5" />,
  LANGUAGE: <Languages className="h-5 w-5" />,
  X: <X className="h-4 w-4" />,
  GRIP: <GripVertical className="h-4 w-4" />,
  MASK: <Blend className="h-5 w-5" />,
  REMOVE_BG: <Eraser className="h-5 w-5" />,
  CROP_TRIM: <Crop className="h-5 w-5" />,
  PLAY: <Play className="h-5 w-5" />,
  PAUSE: <Pause className="h-5 w-5" />,
  REWIND: <Rewind className="h-5 w-5" />,
  TRACE_IMAGE: <Wand2 className="h-5 w-5" />,
  HSV: <Sliders className="h-5 w-5" />,
  BOOLEAN_UNION: <SquaresUnite className="h-5 w-5" />,
  BOOLEAN_SUBTRACT: <SquaresSubtract className="h-5 w-5" />,
  BOOLEAN_INTERSECT: <SquaresIntersect className="h-5 w-5" />,
  BOOLEAN_EXCLUDE: <SquaresExclude className="h-5 w-5" />,
  BOOLEAN_DIVIDE: <Scissors className="h-5 w-5" />,
  ONION_SKIN: <Layers2 className="h-5 w-5" />,
  RESET_PREFERENCES: <RotateCcw className="h-5 w-5" />,
};
