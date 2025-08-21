/**
 * 本文件包含了整个应用中使用的常量。
 * 这包括颜色配置、RoughJS 的默认参数以及 UI 中使用的 SVG 图标等。
 */

import React from 'react';
import type { EndpointStyle } from './types';

export const COLORS = [
  '#FFFFFF', // White
  '#EF4444', // 红色-500
  '#3B82F6', // 蓝色-500
  '#22C55E', // 绿色-500
  '#F97316', // 橙色-500
  '#A855F7', // 紫色-500
  '#EC4899', // 粉色-500
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


export const ICONS = {
  UNDO: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  ),
  REDO: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3-2.3" />
    </svg>
  ),
  CLEAR: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  PEN: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <g transform="rotate(90 12 12)">
        <path d="M12 5l-7 7-3-3 7-7 3 3z"/>
        <path d="M6 11l1.5 7.5L22 22l-3.5-14.5L11 6l-5 5z"/>
        <path d="M22 22l-7.586-7.586"/>
        <circle cx="13" cy="13" r="2"/>
      </g>
    </svg>
  ),
  BRUSH: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M15.5 2.5a2.121 2.121 0 0 1 3 3L5 21l-4 1 1-4Z"/>
      <path d="m14 6 3 3"/>
    </svg>
  ),
  CHECK: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  EDIT: (
     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
    </svg>
  ),
  MOVE: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
  ),
  RECTANGLE: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    </svg>
  ),
  POLYGON: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 5 L2 22 L22 22 Z"></path>
    </svg>
  ),
  ELLIPSE: (
     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>
  ),
  LINE: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="4" y1="20" x2="20" y2="4"></line>
    </svg>
  ),
  ARC: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <g transform="rotate(90 12 12)">
        <path d="M20 20a12 12 0 0 0-16-16"/>
      </g>
    </svg>
  ),
  LASSO: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3.24 7.04 14.46 2.06a10 8 0 0 1 8.48 3.48l-2.81 4.79" />
      <path d="m16.48 11.26-2.8 4.76a10 8 0 0 1-11.42 1.48l4.73-8.2" />
      <path d="M7 22a5 5 0 0 1-2-3.994" />
      <circle cx="5" cy="16" r="2" />
    </svg>
  ),
  PROPERTIES: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
      <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line>
      <line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line>
      <line x1="17" y1="16" x2="23" y2="16"></line>
    </svg>
  ),
  GRID: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="18" height="18" x="3" y="3" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
    </svg>
  ),
  CUT: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
  ),
  COPY: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
  ),
  PASTE: (
     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M12 2v4a2 2 0 0 0 2 2h4"/><rect width="8" height="4" x="8" y="12" rx="1"/><path d="M8 12h8"/></svg>
  ),
  FLIP_HORIZONTAL: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3m10-16h-3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
      <path d="M12 20V4"/>
    </svg>
  ),
  FLIP_VERTICAL: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 8v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8m-5 10v-3a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v3"/>
      <path d="M4 12h16"/>
    </svg>
  ),
  COPY_SVG: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      <path d="M12.5 12.5h-1v2h1a.5.5 0 0 0 0-1v-1"/>
      <path d="M15 12.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0 0 1h.5v.5h-1a.5.5 0 0 0 0 1h1a.5.5 0 0 0 .5-.5"/>
      <path d="m18 14.5-1-2-1 2"/>
      <path d="M17 12.5v2"/>
    </svg>
  ),
  COPY_PNG: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      <path d="M12.5 12.5h-1a.5.5 0 0 0 0 1h1v1h-1a.5.5 0 0 0 0 1h1a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5Z"/>
      <path d="M15.5 12.5h-1a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h1"/>
      <path d="M18.5 12.5h-1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h.5l.5.5v.5"/>
    </svg>
  ),
  IMPORT: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 17V3"/><path d="m6 11 6 6 6-6"/>
        <path d="M19 21H5"/>
    </svg>
  ),
  MENU: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  ),
  SAVE: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  ),
  OPEN: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  PATH_CONVERT: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 20V4h8l4 4v4"/>
      <path d="M4 12h4"/>
      <path d="M14.5 10.5 18 7l4 4-3.5 3.5a2.12 2.12 0 0 1-3 0v0a2.12 2.12 0 0 1 0-3Z"/>
    </svg>
  ),
  SIMPLIFY_PATH: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 6c1.6-1.6 4.3-1.6 6 0 1.7 1.7 4.4 1.7 6 0 1.7-1.7 4.3-1.7 6 0"/>
      <path d="M12 10v4"/>
      <path d="m15 12-3 3-3-3"/>
      <path d="M3 18c5-5 13-5 18 0"/>
    </svg>
  ),
  BRING_FORWARD: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="m16 12-4-4-4 4"/>
    </svg>
  ),
  SEND_BACKWARD: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 16V8"/><path d="m16 12-4 4-4 4"/>
    </svg>
  ),
  BRING_TO_FRONT: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>
    </svg>
  ),
  SEND_TO_BACK: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 8V4h12v12h-4"/><rect x="8" y="8" width="12" height="12" rx="2"/>
    </svg>
  ),
  CHEVRON_LEFT: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  ),
  BACKGROUND_COLOR: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 14 14"/><path d="M22 11h-4.3c-.5 0-.9.4-.9.9v4.3c0 .5.4.9.9.9H22"/></svg>
  ),
  ENDPOINT_NONE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  ENDPOINT_DOT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="14" y2="12" />
        <path d="M20 8.5 L14 12 L20 15.5 Z" fill="none" />
    </svg>
  ),
  ENDPOINT_ARROW: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12" />
        <polyline points="14 8.5 20 12 14 15.5" />
    </svg>
  ),
  ENDPOINT_REVERSE_ARROW: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12" />
        <polyline points="10 8.5 4 12 10 15.5" />
    </svg>
  ),
  ENDPOINT_TRIANGLE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="14" y2="12" />
        <path d="M14 8.5 L20 12 L14 15.5 Z" fill="none" />
    </svg>
  ),
  ENDPOINT_SQUARE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="16" y2="12" />
        <rect x="16" y="8" width="8" height="8" fill="none" />
    </svg>
  ),
  ENDPOINT_CIRCLE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="15" y2="12" />
        <circle cx="19" cy="12" r="4" fill="none" />
    </svg>
  ),
  ENDPOINT_DIAMOND: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="14" y2="12" />
        <path d="M18 8 L22 12 L18 16 L14 12 Z" fill="none" />
    </svg>
  ),
  ENDPOINT_BAR: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="20" y1="7" x2="20" y2="17" />
    </svg>
  ),
  ENDPOINT_SETTINGS: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 12h12"/>
      <path d="m12 8 4 4-4 4"/>
    </svg>
  ),
  DASH_SETTINGS: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 12h1.5M9.5 12h1.5M15.5 12h1.5"/>
    </svg>
  ),
  ENDPOINT_FILL_SOLID: (
    <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" fill="currentColor" />
    </svg>
  ),
  ENDPOINT_FILL_HOLLOW: (
    <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
  STYLE_LIBRARY: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="currentColor" className="h-5 w-5">
      <path d="M896 554.666667h-42.666667v298.666666H170.666667v-298.666666H128l384-384 384 384z m-640-8.533334V768h512v-221.866667l-256-256-256 256z m174.933333-76.8h170.666667v85.333334h-170.666667v-85.333334z" />
    </svg>
  ),
  PLUS: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  TRASH: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  MORE_VERTICAL: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  ),
  ALIGN_LEFT: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>,
  ALIGN_HORIZONTAL_CENTER: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="12" y1="21" x2="12" y2="3"/><rect x="3" y="6" width="6" height="12" rx="2"/><rect x="15" y="10" width="6" height="4" rx="2"/></svg>,
  ALIGN_RIGHT: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  ALIGN_TOP: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="10" y1="3" x2="10" y2="21"/><line x1="6" y1="3" x2="6" y2="21"/><line x1="14" y1="3" x2="14" y2="21"/><line x1="18" y1="3" x2="18" y2="21"/></svg>,
  ALIGN_VERTICAL_CENTER: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="21" y1="12" x2="3" y2="12"/><rect x="6" y="3" width="12" height="6" rx="2"/><rect x="10" y="15" width="4" height="6" rx="2"/></svg>,
  ALIGN_BOTTOM: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="10" y1="21" x2="10" y2="3"/><line x1="6" y1="21" x2="6" y2="3"/><line x1="14" y1="21" x2="14" y2="3"/><line x1="18" y1="21" x2="18" y2="3"/></svg>,
  DISTRIBUTE_HORIZONTAL: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="21" y1="17" x2="3" y2="17"/><line x1="21" y1="7" x2="3" y2="7"/><rect x="4" y="12" width="4" height="5" rx="1"/><rect x="16" y="7" width="4" height="5" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/></svg>,
  DISTRIBUTE_VERTICAL: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="17" y1="21" x2="17" y2="3"/><line x1="7" y1="21" x2="7" y2="3"/><rect x="12" y="4" width="5" height="4" rx="1"/><rect x="7" y="16" width="5" height="4" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/></svg>,
  ALIGN_DISTRIBUTE: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><rect x="3" y="14" width="4" height="4"/><rect x="17" y="14" width="4" height="4"/><rect x="10" y="14" width="4" height="4"/></svg>,
  LAYERS: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
  ),
  EYE_OPEN: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
  ),
  EYE_OFF: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>
  ),
  LOCK_OPEN: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
  ),
  LOCK_CLOSED: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
  ),
  GRIP_VERTICAL: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
  ),
};

// Fix alignment icon rotation
ICONS.ALIGN_LEFT = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="3" y1="21" x2="3" y2="3"/><rect x="7" y="4" width="10" height="5" rx="1"/><rect x="7" y="12" width="14" height="5" rx="1"/></svg>;
ICONS.ALIGN_HORIZONTAL_CENTER = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="12" y1="21" x2="12" y2="3"/><rect x="3" y="6" width="6" height="12" rx="2"/><rect x="15" y="10" width="6" height="4" rx="2"/></svg>;
ICONS.ALIGN_RIGHT = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="21" y1="21" x2="21" y2="3"/><rect x="10" y="4" width="7" height="5" rx="1"/><rect x="3" y="12" width="14" height="5" rx="1"/></svg>;
ICONS.ALIGN_TOP = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="3" y1="3" x2="21" y2="3"/><rect x="4" y="7" width="5" height="10" rx="1"/><rect x="12" y="7" width="5" height="14" rx="1"/></svg>;
ICONS.ALIGN_VERTICAL_CENTER = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="3" y1="12" x2="21" y2="12"/><rect x="6" y="3" width="12" height="6" rx="2"/><rect x="10" y="15" width="4" height="6" rx="2"/></svg>;
ICONS.ALIGN_BOTTOM = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="3" y1="21" x2="21" y2="21"/><rect x="4" y="10" width="5" height="7" rx="1"/><rect x="12" y="3" width="5" height="14" rx="1"/></svg>;


export const ENDPOINT_STYLES: { name: EndpointStyle; title: string; icon: JSX.Element }[] = [
    { name: 'none', title: '无', icon: ICONS.ENDPOINT_NONE },
    { name: 'arrow', title: '箭头', icon: ICONS.ENDPOINT_ARROW },
    { name: 'reverse_arrow', title: '反向箭头', icon: ICONS.ENDPOINT_REVERSE_ARROW },
    { name: 'triangle', title: '三角形', icon: ICONS.ENDPOINT_TRIANGLE },
    { name: 'dot', title: '倒三角', icon: ICONS.ENDPOINT_DOT },
    { name: 'square', title: '空心方形', icon: ICONS.ENDPOINT_SQUARE },
    { name: 'circle', title: '空心圆形', icon: ICONS.ENDPOINT_CIRCLE },
    { name: 'diamond', title: '菱形', icon: ICONS.ENDPOINT_DIAMOND },
    { name: 'bar', title: '竖线', icon: ICONS.ENDPOINT_BAR },
];