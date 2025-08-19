/**
 * 本文件定义了位于侧边的属性工具栏组件。
 * 它包含了用于修改选中图形属性（如颜色、描边宽度、透明度等）
 * 或设置新图形默认样式的控件。
 */

import React, { useMemo } from 'react';
import type { Tool, AnyPath, VectorPathData } from '../../types';
import { ICONS } from '../../constants';

import { NumericInput, ColorControl, FillStyleControl, EndpointPopover, DashControl, StylePropertiesPopover } from './side-toolbar';

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
  strokeLineCapStart: any;
  setStrokeLineCapStart: (cap: any) => void;
  strokeLineCapEnd: any;
  setStrokeLineCapEnd: (cap: any) => void;
  endpointSize: number;
  setEndpointSize: (size: number) => void;
  endpointFill: 'solid' | 'hollow';
  setEndpointFill: (fill: 'solid' | 'hollow') => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  sides: number | null;
  setSides: (sides: number) => void;
  borderRadius: number | null;
  setBorderRadius: (radius: number) => void;
  isRough: boolean;
  setIsRough: (r: boolean) => void;
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
  preserveVertices: boolean;
  setPreserveVertices: (pv: boolean) => void;
  disableMultiStroke: boolean;
  setDisableMultiStroke: (dms: boolean) => void;
  disableMultiStrokeFill: boolean;
  setDisableMultiStrokeFill: (dmsf: boolean) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
  firstSelectedPath: AnyPath | null;
  onToggleStyleLibrary: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isStyleLibraryOpen: boolean;
}

export const SideToolbar: React.FC<SideToolbarProps> = (props) => {
  const {
    tool,
    sides, setSides,
    borderRadius, setBorderRadius,
    opacity, setOpacity,
    strokeWidth, setStrokeWidth,
    color, setColor,
    fill, setFill,
    fillStyle, setFillStyle,
    firstSelectedPath,
    beginCoalescing, endCoalescing,
    onToggleStyleLibrary,
    isStyleLibraryOpen,
  } = props;

  const isEndpointControlVisible = useMemo(() => {
    if (firstSelectedPath) {
      if ((firstSelectedPath.tool === 'pen' || firstSelectedPath.tool === 'line')) {
        return !(firstSelectedPath as VectorPathData).isClosed;
      }
      if (firstSelectedPath.tool === 'brush') {
        return true;
      }
      return false;
    }
    return ['pen', 'line', 'brush'].includes(tool);
  }, [tool, firstSelectedPath]);
  
  const isDashControlVisible = useMemo(() => {
    if (firstSelectedPath) {
      return true; // Show for any selected shape
    }
    // Show for any drawing tool
    return tool !== 'selection';
  }, [tool, firstSelectedPath]);

  return (
    <div className="sidebar-container bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-3 flex flex-col items-center gap-4 text-[var(--text-primary)]">
      <NumericInput
        label="透明度"
        value={opacity}
        setValue={setOpacity}
        min={0}
        max={1}
        step={1}
        unit="%"
        valueTransformer={{ toDisplay: v => v * 100, fromDisplay: v => v / 100 }}
        beginCoalescing={beginCoalescing}
        endCoalescing={endCoalescing}
      />

      {sides !== null && (
        <NumericInput
          label="边数"
          value={sides}
          setValue={setSides}
          min={3}
          max={50}
          step={1}
          unit=""
          beginCoalescing={beginCoalescing}
          endCoalescing={endCoalescing}
        />
      )}
      
      {borderRadius !== null && (
        <NumericInput
          label="圆角"
          value={borderRadius}
          setValue={setBorderRadius}
          min={0}
          max={500}
          step={1}
          unit="px"
          beginCoalescing={beginCoalescing}
          endCoalescing={endCoalescing}
        />
      )}

      <NumericInput
        label="宽度"
        value={strokeWidth}
        setValue={setStrokeWidth}
        min={0}
        max={100}
        step={1}
        unit="px"
        beginCoalescing={beginCoalescing}
        endCoalescing={endCoalescing}
      />
      
      <ColorControl
        label="描边色"
        color={color}
        setColor={setColor}
        beginCoalescing={beginCoalescing}
        endCoalescing={endCoalescing}
        disabled={strokeWidth === 0}
      />

      <ColorControl
        label="背景色"
        color={fill}
        setColor={setFill}
        beginCoalescing={beginCoalescing}
        endCoalescing={endCoalescing}
      />
      
      <FillStyleControl
        fillStyle={fillStyle}
        setFillStyle={setFillStyle}
      />

      {isDashControlVisible && (
        <DashControl {...props} />
      )}
      
      {isEndpointControlVisible && (
        <EndpointPopover {...props} />
      )}
      
      <StylePropertiesPopover {...props} />

      <div className="h-px w-full bg-[var(--separator)] my-1"></div>
      
      <div className="flex flex-col items-center gap-1 w-14" title="样式库">
        <button 
          onClick={e => onToggleStyleLibrary(e)}
          className={`p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors ring-1 ring-inset ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
            isStyleLibraryOpen
              ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]'
          }`}
          title="样式库"
        >
          {ICONS.STYLE_LIBRARY}
        </button>
        <span className="text-xs font-medium text-[var(--text-secondary)] sidebar-label">样式库</span>
      </div>
    </div>
  );
};