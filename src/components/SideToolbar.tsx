/**
 * 本文件定义了位于侧边的属性工具栏组件。
 * 它包含了用于修改选中图形属性（如颜色、描边宽度、透明度等）
 * 或设置新图形默认样式的控件。
 */

import React, { useMemo } from 'react';
import type { Tool, AnyPath, VectorPathData, TextData } from '../types';
import type { HsvAdjustment } from '@/lib/image';
import { ICONS } from '../constants';
import PanelButton from '@/components/PanelButton';

import { NumericInput, ColorControl, FillStyleControl, EndpointPopover, DashControl, StylePropertiesPopover, TextProperties, EffectsPopover } from './side-toolbar';
import { ImageHsvPopover } from './side-toolbar/ImageHsvPopover';

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
  // Text Properties
  text: string;
  setText: (text: string) => void;
  fontFamily: string;
  setFontFamily: (family: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  textAlign: 'left' | 'center' | 'right';
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  // Effects
  blur: number;
  setBlur: (b: number) => void;
  shadowEnabled: boolean;
  setShadowEnabled: (se: boolean) => void;
  shadowOffsetX: number;
  setShadowOffsetX: (so: number) => void;
  shadowOffsetY: number;
  setShadowOffsetY: (so: number) => void;
  shadowBlur: number;
  setShadowBlur: (sb: number) => void;
  shadowColor: string;
  setShadowColor: (sc: string) => void;
  onAdjustImageHsv: (adj: HsvAdjustment) => void;
}

/**
 * 一个 React 组件，根据当前选定的工具或对象，显示相关的属性控件。
 * @param props - 包含所有工具栏状态和回调函数的对象。
 * @returns 渲染后的侧边工具栏。
 */
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
    text, setText,
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    textAlign, setTextAlign,
    onAdjustImageHsv,
  } = props;

  const isTextMode = useMemo(() => {
    return tool === 'text' || firstSelectedPath?.tool === 'text';
  }, [tool, firstSelectedPath]);

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
    return ['pen', 'line', 'brush', 'arc'].includes(tool);
  }, [tool, firstSelectedPath]);
  
  const isDashControlVisible = useMemo(() => {
    if (firstSelectedPath) {
      return firstSelectedPath.tool !== 'text';
    }
    return tool !== 'selection' && tool !== 'text';
  }, [tool, firstSelectedPath]);

  const isFrameSelected = firstSelectedPath?.tool === 'frame';

  return (
    <div className="sidebar-container bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 flex flex-col items-center gap-2 text-[var(--text-primary)]">
      {isFrameSelected ? (
        <div className="text-center text-sm text-[var(--text-secondary)]">画框属性</div>
      ) : isTextMode ? (
        <TextProperties
          text={text}
          setText={setText}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          fontSize={fontSize}
          setFontSize={setFontSize}
          textAlign={textAlign}
          setTextAlign={setTextAlign}
          beginCoalescing={beginCoalescing}
          endCoalescing={endCoalescing}
        />
      ) : (
        <>
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
        </>
      )}

      {!isFrameSelected && (
        <>
          <ColorControl
            label={isTextMode ? "文字颜色" : "描边色"}
            color={color}
            setColor={setColor}
            beginCoalescing={beginCoalescing}
            endCoalescing={endCoalescing}
          />

          {!isTextMode && (
            <>
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
            </>
          )}
          
          {isDashControlVisible && !isTextMode && (
            <DashControl {...props} />
          )}
          
          {isEndpointControlVisible && !isTextMode && (
            <EndpointPopover {...props} />
          )}

          {firstSelectedPath?.tool === 'image' && (
            <ImageHsvPopover
              onAdjust={onAdjustImageHsv}
              beginCoalescing={beginCoalescing}
              endCoalescing={endCoalescing}
            />
          )}

          {!isTextMode && <EffectsPopover {...props} />}
          {!isTextMode && <StylePropertiesPopover {...props} />}
        </>
      )}


      <div className="h-px w-full bg-[var(--ui-separator)] my-1"></div>
      
      <div className="flex flex-col items-center w-14" title="样式库">
        <PanelButton
          variant="unstyled"
          onClick={onToggleStyleLibrary}
          className={`flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors ${
            isStyleLibraryOpen
              ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
          }`}
          title="样式库"
        >
          {ICONS.STYLE_LIBRARY}
        </PanelButton>
      </div>
    </div>
  );
};
