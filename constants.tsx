

import React from 'react';

export const COLORS = [
  '#000000', // 黑色
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
// 使用 -1 作为哨兵值，让 RoughJS 根据描边宽度计算默认值
export const DEFAULT_FILL_WEIGHT = -1;
export const DEFAULT_HACHURE_GAP = -1;
export const DEFAULT_HACHURE_ANGLE = -41; // 度
export const DEFAULT_CURVE_TIGHTNESS = 0;
export const DEFAULT_CURVE_STEP_COUNT = 9;


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
};