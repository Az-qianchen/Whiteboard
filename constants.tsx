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
  Pipette, SwatchBook, X, Spline, Waypoints, Triangle, GitCommitHorizontal,
  CircleDot, ChevronDown,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  Pencil, Type,
  MousePointer2, Paintbrush2, AlignHorizontalSpaceAround,
  AlignLeft, AlignJustify, AlignRight,
  Sparkles, GripVertical, Crop,
  Diff,
  Play, Pause, Rewind, ChevronUp, Wand2,
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

// RoughJS 的默认参数
export const DEFAULT_ROUGHNESS = 1.2;
export const DEFAULT_BOWING = 1;
// Sensible defaults that are not the special "-1" value.
export const DEFAULT_FILL_WEIGHT = 0.5;
export const DEFAULT_HACHURE_GAP = 4;
export const DEFAULT_HACHURE_ANGLE = -41; // 度
export const DEFAULT_CURVE_TIGHTNESS = 0;
export const DEFAULT_CURVE_STEP_COUNT = 9;
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
  LINE: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M6 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path><path d="M18 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path><path d="M7.5 16.5l9 -9"></path></svg>,
  ARC: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M17 3m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"></path><path d="M3 17m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"></path><path d="M17 5c-6.627 0 -12 5.373 -12 12"></path></svg>,
  TEXT: <Type className="h-5 w-5" />,
  FRAME: <Crop className="h-5 w-5" />,
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
  CHEVRON_LEFT: <ChevronLeft className="h-5 w-5" />,
  CHEVRON_DOWN: <ChevronDown className="w-full h-full" />,
  CHEVRON_UP: <ChevronUp className="h-5 w-5" />,
  LOCK_CLOSED: <Lock className="h-4 w-4" />,
  LOCK_OPEN: <LockOpen className="h-4 w-4" />,
  EYE_OPEN: <Eye className="h-4 w-4" />,
  EYE_OFF: <EyeOff className="h-4 w-4" />,
  TRASH: <Trash2 className="h-4 w-4" />,
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
  ENDPOINT_SETTINGS: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 12h12"/>
      <path d="m12 8 4 4-4 4"/>
    </svg>
  ),
  DASH_SETTINGS: <MoreHorizontal className="h-5 w-5" />,
  MORE_VERTICAL: <MoreVertical className="h-4 w-4" />,
  PLUS: <Plus className="h-5 w-5" />,
  IMAGE: <ImageIcon className="h-5 w-5" />,
  GROUP: <Boxes className="h-5 w-5" />,
  LOGO: <Pencil />,
  EYEDROPPER: <Pipette className="h-5 w-5" />,
  EFFECTS: <Sparkles className="h-5 w-5" />,
  X: <X className="h-4 w-4" />,
  GRIP: <GripVertical className="h-4 w-4" />,
  MASK: <Diff className="h-5 w-5" />,
  PLAY: <Play className="h-5 w-5" />,
  PAUSE: <Pause className="h-5 w-5" />,
  REWIND: <Rewind className="h-5 w-5" />,
  TRACE_IMAGE: <Wand2 className="h-5 w-5" />,
  BOOLEAN_UNION: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-squares-unite-icon lucide-squares-unite"><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 0 1 1h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-3a1 1 0 0 0-1-1z"/></svg>,
  BOOLEAN_SUBTRACT: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-squares-subtract-icon lucide-squares-subtract"><path d="M10 22a2 2 0 0 1-2-2"/><path d="M16 22h-2"/><path d="M16 4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-5a2 2 0 0 1 2-2h5a1 1 0 0 0 1-1z"/><path d="M20 8a2 2 0 0 1 2 2"/><path d="M22 14v2"/><path d="M22 20a2 2 0 0 1-2 2"/></svg>,
  BOOLEAN_INTERSECT: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-squares-intersect-icon lucide-squares-intersect"><path d="M10 22a2 2 0 0 1-2-2"/><path d="M14 2a2 2 0 0 1 2 2"/><path d="M16 22h-2"/><path d="M2 10V8"/><path d="M2 4a2 2 0 0 1 2-2"/><path d="M20 8a2 2 0 0 1 2 2"/><path d="M22 14v2"/><path d="M22 20a2 2 0 0 1-2 2"/><path d="M4 16a2 2 0 0 1-2-2"/><path d="M8 10a2 2 0 0 1 2-2h5a1 1 0 0 1 1 1v5a2 2 0 0 1-2 2H9a1 1 0 0 1-1-1z"/><path d="M8 2h2"/></svg>,
  BOOLEAN_EXCLUDE: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-squares-exclude-icon lucide-squares-exclude"><path d="M16 12v2a2 2 0 0 1-2 2H9a1 1 0 0 0-1 1v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h0"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1h-5a2 2 0 0 0-2 2v2"/></svg>,
};