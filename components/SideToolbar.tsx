
import React, { useState, useEffect, Fragment, useRef, useMemo } from 'react';
import { Popover, Transition, Switch } from '@headlessui/react';
import { ICONS, ENDPOINT_STYLES, LINE_CAP_STYLES } from '../constants';
import type { Tool, AnyPath, VectorPathData, RectangleData, EndpointStyle } from '../types';
import { ColorPicker } from './ColorPicker';

const FILL_STYLE_ICONS = {
  solid: (
    <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor"><rect x="2" y="2" width="16" height="16" /></svg>
  ),
  hachure: (
    <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M 3 17 L 17 3 M 3 12 L 12 3 M 3 7 L 7 3 M 8 17 L 17 8 M 13 17 L 17 13" />
      <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  'cross-hatch': (
     <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M 5 0 V 20 M 10 0 V 20 M 15 0 V 20 M 0 5 H 20 M 0 10 H 20 M 0 15 H 20" strokeWidth="1" />
      <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  dots: (
    <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <circle cx="6" cy="6" r="1.2"/><circle cx="14" cy="6" r="1.2"/>
      <circle cx="6" cy="14" r="1.2"/><circle cx="14" cy="14" r="1.2"/>
      <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  dashed: (
    <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M 4 5 H 8 M 12 5 H 16 M 4 10 H 8 M 12 10 H 16 M 4 15 H 8 M 12 15 H 16" />
        <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  zigzag: (
    <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M 3 4 L 7 8 L 3 12 L 7 16 M 8 4 L 12 8 L 8 12 L 12 16 M 13 4 L 17 8 L 13 12 L 17 16" />
      <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  'zigzag-line': (
    <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M 2 5 L 6 2 L 10 5 L 14 2 L 18 5 M 2 10 L 6 7 L 10 10 L 14 7 L 18 10 M 2 15 L 6 12 L 10 15 L 14 12 L 18 15" />
      <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
};

const FILL_STYLES = [
    { name: 'solid', title: '实心', icon: FILL_STYLE_ICONS.solid },
    { name: 'hachure', title: '平行', icon: FILL_STYLE_ICONS.hachure },
    { name: 'cross-hatch', title: '十字', icon: FILL_STYLE_ICONS['cross-hatch'] },
    { name: 'dots', title: '圆点', icon: FILL_STYLE_ICONS.dots },
    { name: 'dashed', title: '虚线', icon: FILL_STYLE_ICONS.dashed },
    { name: 'zigzag', title: '涂鸦', icon: FILL_STYLE_ICONS.zigzag },
    { name: 'zigzag-line', title: '锯齿', icon: FILL_STYLE_ICONS['zigzag-line'] },
];

const LINEJOIN_STYLES: { name: 'miter' | 'round' | 'bevel', title: string, icon: JSX.Element }[] = [
    { name: 'miter', title: '尖角', icon: ICONS.LINEJOIN_MITER },
    { name: 'round', title: '圆角', icon: ICONS.LINEJOIN_ROUND },
    { name: 'bevel', title: '斜角', icon: ICONS.LINEJOIN_BEVEL },
];

const ENDPOINT_FILL_STYLES: { name: 'hollow' | 'solid', title: string, icon: JSX.Element }[] = [
    { name: 'hollow', title: '空心', icon: ICONS.ENDPOINT_FILL_HOLLOW },
    { name: 'solid', title: '实心', icon: ICONS.ENDPOINT_FILL_SOLID },
];

interface SideToolbarProps {
  tool: Tool;
  color: string;
  setColor: (color: string) => void;
  fill: string;
  setFill: (color: string) => void;
  fillStyle: string;
  setFillStyle: (style: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  strokeLineDash: [number, number] | undefined;
  setStrokeLineDash: (dash: [number, number] | undefined) => void;
  strokeLineCapStart: EndpointStyle;
  setStrokeLineCapStart: (cap: EndpointStyle) => void;
  strokeLineCapEnd: EndpointStyle;
  setStrokeLineCapEnd: (cap: EndpointStyle) => void;
  strokeLineJoin: 'miter' | 'round' | 'bevel';
  setStrokeLineJoin: (join: 'miter' | 'round' | 'bevel') => void;
  endpointSize: number;
  setEndpointSize: (size: number) => void;
  endpointFill: 'solid' | 'hollow';
  setEndpointFill: (fill: 'solid' | 'hollow') => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  borderRadius: number | null;
  setBorderRadius: (radius: number) => void;
  
  // RoughJS properties
  roughness: number;
  setRoughness: (r: number) => void;
  bowing: number;
  setBowing: (b: number) => void;
  fillWeight: number;
  setFillWeight: (fw: number) => void;
  hachureAngle: number;
  setHachureAngle: (ha: number) => void;
  hachureGap: number;
  setHachureGap: (hg: number) => void;
  curveTightness: number;
  setCurveTightness: (ct: number) => void;
  curveStepCount: number;
  setCurveStepCount: (csc: number) => void;
  curveFitting: number;
  setCurveFitting: (cf: number) => void;
  preserveVertices: boolean;
  setPreserveVertices: (pv: boolean) => void;
  disableMultiStroke: boolean;
  setDisableMultiStroke: (dms: boolean) => void;
  disableMultiStrokeFill: boolean;
  setDisableMultiStrokeFill: (dmsf: boolean) => void;
  simplification: number;
  setSimplification: (s: number) => void;

  beginCoalescing: () => void;
  endCoalescing: () => void;
  firstSelectedPath: AnyPath | null;
}

export const SideToolbar: React.FC<SideToolbarProps> = ({
  tool,
  color, setColor,
  fill, setFill,
  fillStyle, setFillStyle,
  strokeWidth, setStrokeWidth,
  strokeLineDash, setStrokeLineDash,
  strokeLineCapStart, setStrokeLineCapStart,
  strokeLineCapEnd, setStrokeLineCapEnd,
  strokeLineJoin, setStrokeLineJoin,
  endpointSize, setEndpointSize,
  endpointFill, setEndpointFill,
  opacity, setOpacity,
  borderRadius, setBorderRadius,
  roughness, setRoughness,
  bowing, setBowing,
  fillWeight, setFillWeight,
  hachureAngle, setHachureAngle,
  hachureGap, setHachureGap,
  curveTightness, setCurveTightness,
  curveStepCount, setCurveStepCount,
  curveFitting, setCurveFitting,
  preserveVertices, setPreserveVertices,
  disableMultiStroke, setDisableMultiStroke,
  disableMultiStrokeFill, setDisableMultiStrokeFill,
  simplification, setSimplification,
  beginCoalescing, endCoalescing,
  firstSelectedPath,
}) => {
  const [localStrokeWidth, setLocalStrokeWidth] = useState(strokeWidth.toString());
  const [localOpacity, setLocalOpacity] = useState(Math.round(opacity * 100).toString());
  const [localBorderRadius, setLocalBorderRadius] = useState(borderRadius !== null ? Math.round(borderRadius).toString() : '');
  const [localDash, setLocalDash] = useState('0');
  const [localGap, setLocalGap] = useState('0');
  const wheelTimeoutRef = useRef<number | null>(null);
  
  const isDashed = strokeLineDash !== undefined;

  useEffect(() => { setLocalStrokeWidth(strokeWidth.toString()); }, [strokeWidth]);
  useEffect(() => { setLocalOpacity(Math.round(opacity * 100).toString()); }, [opacity]);
  useEffect(() => { if (borderRadius !== null) setLocalBorderRadius(Math.round(borderRadius).toString()); }, [borderRadius]);
  useEffect(() => {
    if (strokeLineDash) {
        // If it's the special dotted line value, show '0' in UI.
        if (strokeLineDash[0] === 0.1) {
            setLocalDash('0');
        } else {
            setLocalDash(strokeLineDash[0].toString());
        }
        setLocalGap(strokeLineDash[1].toString());
    } else {
        // When dashing is off, the inputs are disabled so their value is less important,
        // but we can try to preserve the last known values for a better UX when re-enabled.
        // For simplicity, we'll reset, which is also fine.
        setLocalDash('20');
        setLocalGap('10');
    }
  }, [strokeLineDash]);

  useEffect(() => {
    return () => { if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current); };
  }, []);

  const handleStrokeWidthCommit = () => {
    let value = parseInt(localStrokeWidth, 10);
    if (isNaN(value) || value < 1) value = 1;
    else if (value > 100) value = 100;
    setStrokeWidth(value);
    setLocalStrokeWidth(value.toString());
  };

  const handleStrokeWidthWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!wheelTimeoutRef.current) beginCoalescing(); else clearTimeout(wheelTimeoutRef.current);
    const increment = e.deltaY < 0 ? 1 : -1;
    const newValue = Math.max(1, Math.min(100, strokeWidth + increment));
    setStrokeWidth(newValue);
    wheelTimeoutRef.current = window.setTimeout(() => { endCoalescing(); wheelTimeoutRef.current = null; }, 500);
  };
  
  const handleOpacityCommit = () => {
    let value = parseInt(localOpacity, 10);
    if (isNaN(value) || value < 0) value = 0;
    else if (value > 100) value = 100;
    setOpacity(value / 100);
    setLocalOpacity(value.toString());
  };

  const handleOpacityWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!wheelTimeoutRef.current) beginCoalescing(); else clearTimeout(wheelTimeoutRef.current);
    const increment = e.deltaY < 0 ? 1 : -1;
    const currentOpacityPercent = Math.round(opacity * 100);
    const newValue = Math.max(0, Math.min(100, currentOpacityPercent + increment));
    setOpacity(newValue / 100);
    wheelTimeoutRef.current = window.setTimeout(() => { endCoalescing(); wheelTimeoutRef.current = null; }, 500);
  };

  const handleBorderRadiusCommit = () => {
    let value = parseInt(localBorderRadius, 10);
    if (isNaN(value) || value < 0) value = 0;
    else if (value > 500) value = 500;
    setBorderRadius(value);
    setLocalBorderRadius(value.toString());
  };

  const handleBorderRadiusWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (borderRadius === null) return;
    if (!wheelTimeoutRef.current) beginCoalescing(); else clearTimeout(wheelTimeoutRef.current);
    const increment = e.deltaY < 0 ? 1 : -1;
    const newValue = Math.max(0, Math.min(500, borderRadius + increment));
    setBorderRadius(newValue);
    wheelTimeoutRef.current = window.setTimeout(() => { endCoalescing(); wheelTimeoutRef.current = null; }, 500);
  };
  
   const handleToggleDashed = (enabled: boolean) => {
    if (enabled) {
        let dash = parseInt(localDash, 10);
        let gap = parseInt(localGap, 10);
        if (isNaN(dash) || dash < 0) dash = 20;
        if (isNaN(gap) || gap <= 0) gap = 10;
        
        if (dash === 0) {
            setStrokeLineCapStart('round');
            setStrokeLineCapEnd('round');
            setStrokeLineDash([0.1, gap > 0 ? gap : strokeWidth * 2]);
        } else {
            setStrokeLineDash([dash, gap]);
        }
    } else {
        setStrokeLineDash(undefined);
    }
  };

  const handleDashAndGapCommit = () => {
    if (!isDashed) return;

    let dash = parseInt(localDash, 10);
    let gap = parseInt(localGap, 10);

    const currentDashValue = strokeLineDash ? (strokeLineDash[0] === 0.1 ? 0 : strokeLineDash[0]) : 0;
    dash = isNaN(dash) ? currentDashValue : Math.max(0, dash);
    gap = isNaN(gap) ? (strokeLineDash?.[1] ?? 0) : Math.max(0, gap);

    if (dash === 0) {
        setStrokeLineCapStart('round');
        setStrokeLineCapEnd('round');
        const finalGap = gap > 0 ? gap : strokeWidth * 2;
        setStrokeLineDash([0.1, finalGap]);
    } else {
        if (dash > 0 && gap <= 0) {
            gap = dash;
        }
        setStrokeLineDash([dash, gap]);
    }
  };

  const handleDashWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!isDashed) return;
    if (!wheelTimeoutRef.current) beginCoalescing(); else clearTimeout(wheelTimeoutRef.current);
    
    const increment = e.deltaY < 0 ? 1 : -1;
    const currentDash = strokeLineDash ? (strokeLineDash[0] === 0.1 ? 0 : strokeLineDash[0]) : 0;
    const currentGap = strokeLineDash ? strokeLineDash[1] : 0;
    
    const newDash = Math.max(0, currentDash + increment);

    if (newDash === 0) {
        setStrokeLineCapStart('round');
        setStrokeLineCapEnd('round');
        const newGap = (currentGap <= 0) ? strokeWidth * 2 : currentGap;
        setStrokeLineDash([0.1, newGap]);
    } else {
        const newGap = (currentGap <= 0 && newDash > 0) ? newDash : currentGap;
        setStrokeLineDash([newDash, newGap]);
    }
    
    wheelTimeoutRef.current = window.setTimeout(() => { endCoalescing(); wheelTimeoutRef.current = null; }, 500);
  };
  
  const handleGapWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!isDashed) return;
    if (!wheelTimeoutRef.current) beginCoalescing(); else clearTimeout(wheelTimeoutRef.current);

    const increment = e.deltaY < 0 ? 1 : -1;
    const [currentDash] = strokeLineDash ?? [0, 0];
    const currentGap = strokeLineDash ? strokeLineDash[1] : 0;
    const newGap = Math.max(0, currentGap + increment);
    
    setStrokeLineDash([currentDash, newGap]);
    
    wheelTimeoutRef.current = window.setTimeout(() => { endCoalescing(); wheelTimeoutRef.current = null; }, 500);
  };
  
  // --- Line Cap & Marker Logic ---
  
  const isMarker = (style: EndpointStyle) => ENDPOINT_STYLES.some(s => s.name === style && s.name !== 'none');

  const currentLineCap = useMemo(() => {
    if (!isMarker(strokeLineCapStart)) return strokeLineCapStart;
    if (!isMarker(strokeLineCapEnd)) return strokeLineCapEnd;
    return 'round'; // Default if both are markers
  }, [strokeLineCapStart, strokeLineCapEnd]);

  const handleLineCapChange = (newCap: EndpointStyle) => {
    if (!isMarker(strokeLineCapStart)) {
      setStrokeLineCapStart(newCap);
    }
    if (!isMarker(strokeLineCapEnd)) {
      setStrokeLineCapEnd(newCap);
    }
  };

  const startMarkerValue = isMarker(strokeLineCapStart) ? strokeLineCapStart : 'none';
  const endMarkerValue = isMarker(strokeLineCapEnd) ? strokeLineCapEnd : 'none';
  
  const isCapControlDisabled = isMarker(strokeLineCapStart) && isMarker(strokeLineCapEnd);
  
  const fillableMarkers: EndpointStyle[] = ['triangle', 'square', 'circle', 'diamond', 'dot'];
  const isFillControlEnabled = fillableMarkers.includes(startMarkerValue) || fillableMarkers.includes(endMarkerValue);

  const handleStartMarkerChange = (newMarker: EndpointStyle) => {
    if (newMarker === 'none') {
      setStrokeLineCapStart(currentLineCap);
    } else {
      setStrokeLineCapStart(newMarker);
    }
  };
  
  const handleEndMarkerChange = (newMarker: EndpointStyle) => {
    if (newMarker === 'none') {
      setStrokeLineCapEnd(currentLineCap);
    } else {
      setStrokeLineCapEnd(newMarker);
    }
  };

  const areCurvePropertiesEnabled = useMemo(() => {
    const path = firstSelectedPath;
    // For new shapes being drawn
    if (!path) {
      if (tool === 'rectangle') return borderRadius !== null && borderRadius > 0;
      return tool === 'brush' || tool === 'line' || tool === 'ellipse';
    }
    // For selected shapes
    switch (path.tool) {
        case 'pen':
        case 'image':
            return false;
        case 'line': {
            const hasCurves = (path as VectorPathData).anchors.some(a => 
                (Math.abs(a.point.x - a.handleIn.x) > 0.1 || Math.abs(a.point.y - a.handleIn.y) > 0.1) ||
                (Math.abs(a.point.x - a.handleOut.x) > 0.1 || Math.abs(a.point.y - a.handleOut.y) > 0.1)
            );
            return !hasCurves;
        }
        case 'rectangle':
            // borderRadius from props is already the selected path's radius.
            return borderRadius !== null && borderRadius > 0;
        case 'ellipse':
            return true;
        default:
            return false;
    }
  }, [tool, firstSelectedPath, borderRadius]);

  const isStrokeStyleVisible = useMemo(() => {
    if (firstSelectedPath) {
      if (firstSelectedPath.tool === 'pen' || firstSelectedPath.tool === 'line') {
        return !(firstSelectedPath as VectorPathData).isClosed;
      }
      return false;
    }
    return ['pen', 'line', 'brush'].includes(tool);
  }, [tool, firstSelectedPath]);


  const isFillEnabledForCurrentTool = tool === 'selection' || tool === 'rectangle' || tool === 'ellipse' || tool === 'pen';
  const isSimplificationEnabled = useMemo(() => ['brush', 'rectangle', 'ellipse', 'selection'].includes(tool), [tool]);


  return (
    <div className="bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-3 flex flex-col items-center gap-4 text-[var(--text-primary)]">
        
        {/* Opacity Control */}
        <div className="flex flex-col items-center gap-1 w-20">
            <div className="flex items-center bg-black/20 rounded-md h-9 px-2 w-full cursor-ns-resize" onWheel={handleOpacityWheel} title="使用滚轮调节">
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={localOpacity} onChange={(e) => setLocalOpacity(e.target.value.replace(/[^0-9]/g, ''))} onBlur={handleOpacityCommit} onKeyDown={(e) => { if (e.key === 'Enter') { handleOpacityCommit(); (e.currentTarget as HTMLInputElement).blur(); } }} className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] pointer-events-none" aria-label="透明度" />
            <span className="text-sm text-[var(--text-secondary)]">%</span>
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">透明度</span>
        </div>

        {/* Border Radius Control */}
        {borderRadius !== null && (
           <div className="flex flex-col items-center gap-1 w-20">
             <div className="flex items-center bg-black/20 rounded-md h-9 px-2 w-full cursor-ns-resize" onWheel={handleBorderRadiusWheel} title="使用滚轮调节">
               <input type="text" inputMode="numeric" pattern="[0-9]*" value={localBorderRadius} onChange={(e) => setLocalBorderRadius(e.target.value.replace(/[^0-9]/g, ''))} onBlur={handleBorderRadiusCommit} onKeyDown={(e) => { if (e.key === 'Enter') { handleBorderRadiusCommit(); (e.currentTarget as HTMLInputElement).blur(); } }} className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] pointer-events-none" aria-label="圆角" />
               <span className="text-sm text-[var(--text-secondary)]">px</span>
             </div>
             <span className="text-xs font-medium text-[var(--text-secondary)]">圆角</span>
           </div>
        )}

        {/* 描边宽度 */}
        <div className="flex flex-col items-center gap-1 w-20">
          <div className="flex items-center bg-black/20 rounded-md h-9 px-2 w-full cursor-ns-resize" onWheel={handleStrokeWidthWheel} title="使用滚轮调节">
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={localStrokeWidth} onChange={(e) => setLocalStrokeWidth(e.target.value.replace(/[^0-9]/g, ''))} onBlur={handleStrokeWidthCommit} onKeyDown={(e) => { if (e.key === 'Enter') { handleStrokeWidthCommit(); (e.currentTarget as HTMLInputElement).blur(); } }} className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] pointer-events-none" aria-label="描边宽度" />
            <span className="text-sm text-[var(--text-secondary)]">px</span>
          </div>
          <span className="text-xs font-medium text-[var(--text-secondary)]">宽度</span>
        </div>
        
        {/* 描边颜色选择 */}
        <div className="flex flex-col items-center gap-1 w-14">
          <Popover className="relative">
            <Popover.Button className="h-8 w-8 rounded-full ring-1 ring-inset ring-white/10 transition-transform transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-[var(--ui-panel-bg)]" style={{ backgroundColor: color }} aria-label="选择描边颜色" />
            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
              <Popover.Panel className="absolute bottom-0 mb-0 -translate-x-full left-[-1rem] z-20">
                <ColorPicker color={color} onChange={setColor} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
              </Popover.Panel>
            </Transition>
          </Popover>
          <span className="text-xs font-medium text-[var(--text-secondary)]">描边色</span>
        </div>

        {/* 填充颜色选择 */}
        <div className={`flex flex-col items-center gap-1 w-14 transition-opacity ${!isFillEnabledForCurrentTool ? 'opacity-50' : ''}`}>
          <Popover className="relative">
              <Popover.Button disabled={!isFillEnabledForCurrentTool} className="h-8 w-8 rounded-full ring-1 ring-inset ring-white/10 transition-transform transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-[var(--ui-panel-bg)] disabled:cursor-not-allowed" style={{ backgroundColor: fill, backgroundImage: (fill === 'transparent' || (fill.includes('rgba') && fill.endsWith('0)')) || (fill.includes('hsla') && fill.endsWith('0)'))) ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none', backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px', }} aria-label="选择填充颜色" />
              <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                <Popover.Panel className="absolute bottom-0 mb-0 -translate-x-full left-[-1rem] z-20">
                  <ColorPicker color={fill} onChange={setFill} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                </Popover.Panel>
              </Transition>
          </Popover>
          <span className="text-xs font-medium text-[var(--text-secondary)]">背景色</span>
        </div>
        
        {/* 填充样式 */}
        <div className={`flex flex-col items-center gap-1 w-14 transition-opacity ${!isFillEnabledForCurrentTool ? 'opacity-50' : ''}`}>
          <Popover className="relative">
            <Popover.Button disabled={!isFillEnabledForCurrentTool} className="h-9 w-9 p-1.5 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)] ring-1 ring-inset ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed" title={`填充样式: ${FILL_STYLES.find(s => s.name === fillStyle)?.title}`} aria-label="选择填充样式">
              {FILL_STYLE_ICONS[fillStyle as keyof typeof FILL_STYLE_ICONS]}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
              <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-48 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-2">
                {({ close }) => (
                  <div className="grid grid-cols-1 gap-1">
                    {FILL_STYLES.map(({ name, title, icon }) => (
                      <button key={name} onClick={() => { setFillStyle(name); close(); }} className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors ${ fillStyle === name ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]' : 'hover:bg-[var(--ui-hover-bg)] text-[var(--text-primary)]' }`}>
                        <div className="w-5 h-5 flex-shrink-0 text-current">{icon}</div>
                        <span className="flex-grow">{title}</span>
                        {fillStyle === name && <div className="w-5 h-5 text-[var(--accent-primary)]">{ICONS.CHECK}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </Popover.Panel>
            </Transition>
          </Popover>
          <span className="text-xs font-medium text-[var(--text-secondary)]">填充样式</span>
        </div>

        {/* 描边样式 */}
        {isStrokeStyleVisible && (
        <div className="flex flex-col items-center gap-1 w-14">
          <Popover className="relative">
            <Popover.Button className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)] ring-1 ring-inset ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]" title="描边样式">
              {ICONS.STROKE_STYLE}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
              <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-72 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
                <div className="flex flex-col gap-4">
                   <div className={`grid grid-cols-2 gap-x-4 transition-opacity ${isCapControlDisabled ? 'opacity-50' : ''}`}>
                        <PopoverSegmentedControl
                            label="线帽"
                            options={LINE_CAP_STYLES}
                            value={currentLineCap}
                            onChange={handleLineCapChange}
                            disabled={isCapControlDisabled}
                        />
                        <PopoverSegmentedControl
                            label="边角"
                            options={LINEJOIN_STYLES}
                            value={strokeLineJoin}
                            onChange={setStrokeLineJoin}
                        />
                   </div>
                  <div className="h-px my-1 bg-[var(--separator)]" />
                  <EndpointGrid
                    label="起点标记"
                    options={ENDPOINT_STYLES}
                    value={startMarkerValue}
                    onChange={handleStartMarkerChange}
                  />
                  <EndpointGrid
                    label="终点标记"
                    options={ENDPOINT_STYLES}
                    value={endMarkerValue}
                    onChange={handleEndMarkerChange}
                  />
                   <div className={`transition-opacity ${!isFillControlEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                     <SwitchControl
                        label="端点填充"
                        enabled={endpointFill === 'solid'}
                        setEnabled={(enabled) => setEndpointFill(enabled ? 'solid' : 'hollow')}
                     />
                   </div>
                  <div className="h-px my-1 bg-[var(--separator)]" />
                  <Slider
                    label="端点尺寸"
                    value={endpointSize ?? 1}
                    setValue={setEndpointSize}
                    min={0.5}
                    max={10}
                    step={0.1}
                    onInteractionStart={beginCoalescing}
                    onInteractionEnd={endCoalescing} />
                  <div className="h-px my-1 bg-[var(--separator)]" />
                   <SwitchControl label="虚线" enabled={isDashed} setEnabled={handleToggleDashed} />
                   <div className={`grid grid-cols-2 gap-x-2 transition-opacity ${!isDashed ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center bg-black/20 rounded-md h-9 px-2 w-full cursor-ns-resize" onWheel={handleDashWheel} title="使用滚轮调节">
                                <input type="text" inputMode="numeric" pattern="[0-9]*" value={localDash} onChange={(e) => setLocalDash(e.target.value.replace(/[^0-9]/g, ''))} onBlur={handleDashAndGapCommit} onKeyDown={(e) => { if (e.key === 'Enter') { handleDashAndGapCommit(); (e.currentTarget as HTMLInputElement).blur(); }}} className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] pointer-events-none" aria-label="虚线长度" />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-secondary)]">虚线长度</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center bg-black/20 rounded-md h-9 px-2 w-full cursor-ns-resize" onWheel={handleGapWheel} title="使用滚轮调节">
                                <input type="text" inputMode="numeric" pattern="[0-9]*" value={localGap} onChange={(e) => setLocalGap(e.target.value.replace(/[^0-9]/g, ''))} onBlur={handleDashAndGapCommit} onKeyDown={(e) => { if (e.key === 'Enter') { handleDashAndGapCommit(); (e.currentTarget as HTMLInputElement).blur(); }}} className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] pointer-events-none" aria-label="虚线间隔" />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-secondary)]">虚线间隔</span>
                        </div>
                   </div>
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
          <span className="text-xs font-medium text-[var(--text-secondary)]">描边</span>
        </div>
        )}
        
        {/* 属性 */}
        <div className="flex flex-col items-center gap-1 w-14">
            <Popover className="relative">
              <Popover.Button className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)] ring-1 ring-inset ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]" title="样式属性">
                {ICONS.PROPERTIES}
              </Popover.Button>
               <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
                    <div className="flex flex-col gap-4">
                        {/* Stroke & Curve Properties */}
                        <div className="space-y-4">
                            <div className={`space-y-4 transition-opacity ${!isSimplificationEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                               <Slider label="简化" value={simplification} setValue={setSimplification} min={0} max={4} step={0.1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                            </div>
                            <Slider label="粗糙度" value={roughness} setValue={setRoughness} min={0} max={5} step={0.1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                            <Slider label="弯曲度" value={bowing} setValue={setBowing} min={0} max={10} step={0.25} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                            <div className={`space-y-4 transition-opacity ${!areCurvePropertiesEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                              <Slider label="平滑度" value={curveTightness} setValue={setCurveTightness} min={-1.5} max={1.5} step={0.1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                              <Slider label="曲线步数" value={curveStepCount} setValue={setCurveStepCount} min={1} max={30} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                              <Slider label="曲线拟合" value={curveFitting} setValue={setCurveFitting} min={0} max={1} step={0.05} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                            </div>
                            <SwitchControl label="禁用端点随机" enabled={preserveVertices} setEnabled={setPreserveVertices} />
                            <SwitchControl label="禁用多重描边" enabled={disableMultiStroke} setEnabled={setDisableMultiStroke} />
                        </div>

                        <div className="h-px bg-[var(--separator)]" />

                        {/* Fill Properties */}
                        <div className={`space-y-4 transition-opacity ${!isFillEnabledForCurrentTool || fillStyle === 'solid' ? 'opacity-50' : ''}`}>
                          <p className={`text-xs text-gray-500 -mb-2 ${isFillEnabledForCurrentTool && fillStyle !== 'solid' ? 'hidden' : ''}`}>填充属性仅适用于非实心样式</p>
                          <div className={`space-y-4 ${!isFillEnabledForCurrentTool || fillStyle === 'solid' ? 'pointer-events-none' : ''}`}>
                            <Slider label="填充权重" value={fillWeight} setValue={setFillWeight} min={-1} max={5} step={0.25} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                            <Slider label="影线角度" value={hachureAngle} setValue={setHachureAngle} min={-90} max={90} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                            <Slider label="影线间距" value={hachureGap} setValue={setHachureGap} min={-1} max={20} step={0.5} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                            <SwitchControl label="禁用多重填充" enabled={disableMultiStrokeFill} setEnabled={setDisableMultiStrokeFill} />
                          </div>
                        </div>
                    </div>
                </Popover.Panel>
              </Transition>
            </Popover>
            <span className="text-xs font-medium text-[var(--text-secondary)]">样式</span>
        </div>
    </div>
  )
}

const EndpointGrid = <T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { name: T; title: string; icon: JSX.Element }[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
    <div className="grid grid-cols-3 gap-1 bg-black/20 rounded-md p-1 w-full">
      {options.map(opt => (
        <button
          key={opt.name}
          title={opt.title}
          onClick={() => onChange(opt.name)}
          className={`flex-1 flex justify-center items-center h-8 rounded-sm transition-colors text-[var(--text-secondary)] hover:bg-white/10 ${value === opt.name ? 'bg-white/20 !text-[var(--text-primary)]' : ''}`}
        >
          <div className="w-6 h-6">{opt.icon}</div>
        </button>
      ))}
    </div>
  </div>
);

interface SegmentedControlProps<T extends string> {
    label: string;
    options: { name: T; title: string; icon: JSX.Element }[];
    value: T;
    onChange: (value: T) => void;
    disabled?: boolean;
}

const PopoverSegmentedControl = <T extends string>({ label, options, value, onChange, disabled = false }: SegmentedControlProps<T>) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
    <div className={`flex items-center bg-black/20 rounded-md p-1 w-full ${disabled ? 'cursor-not-allowed' : ''}`}>
      {options.map(opt => (
        <button
          key={opt.name}
          title={opt.title}
          onClick={() => { if (!disabled) onChange(opt.name); }}
          disabled={disabled}
          className={`flex-1 flex justify-center items-center h-8 rounded-sm transition-colors text-[var(--text-secondary)] hover:bg-white/10 disabled:hover:bg-transparent ${value === opt.name ? 'bg-white/20 !text-[var(--text-primary)]' : ''}`}
        >
          <div className="w-6 h-6">{opt.icon}</div>
        </button>
      ))}
    </div>
  </div>
);


interface SliderProps {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  step: number;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  displayValue?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, setValue, min, max, step, onInteractionStart, onInteractionEnd, displayValue }) => {
  const handlePointerDown = () => {
    onInteractionStart();
    const handlePointerUp = () => { onInteractionEnd(); window.removeEventListener('pointerup', handlePointerUp); };
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="grid grid-cols-3 items-center gap-2">
      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor={label}>{label}</label>
      <input type="range" id={label} min={min} max={max} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} onPointerDown={handlePointerDown} className="w-full col-span-2 accent-[var(--accent-primary)]" />
      {displayValue && <span className="text-xs text-[var(--text-secondary)] col-start-2 col-span-2 text-center -mt-2">{displayValue}</span>}
    </div>
  );
};

interface SwitchControlProps {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const SwitchControl: React.FC<SwitchControlProps> = ({ label, enabled, setEnabled }) => (
  <div className="flex items-center justify-between">
    <label htmlFor={label} className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
    <Switch
      id={label}
      checked={enabled}
      onChange={setEnabled}
      className={`${enabled ? 'bg-[var(--accent-primary)]' : 'bg-black/30'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--ui-panel-bg)]`}
    >
      <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
    </Switch>
  </div>
);
