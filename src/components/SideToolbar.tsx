/**
 * 本文件定义了位于侧边的属性工具栏组件。
 * 它包含了用于修改选中图形属性（如颜色、描边宽度、透明度等）
 * 或设置新图形默认样式的控件。
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tool, AnyPath, VectorPathData, GradientFill } from '../types';
import type { HsvAdjustment } from '@/lib/image';
import { ICONS } from '../constants';
import PanelButton from '@/components/PanelButton';

import { NumericInput, ColorControl, FillStyleControl, EndpointPopover, DashControl, StylePropertiesPopover, EffectsPopover, GradientFillPopover } from './side-toolbar';
import { ImageHsvPopover } from './side-toolbar/ImageHsvPopover';

interface SideToolbarProps {
  tool: Tool;
  color: string;
  setColor: (color: string) => void;
  fill: string;
  setFill: (color: string) => void;
  fillGradient: GradientFill | null;
  setFillGradient: (gradient: GradientFill | null) => void;
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
  fontFamily: string;
  setFontFamily: (family: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  textAlign: 'left' | 'center' | 'right';
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  lineHeight: number;
  setLineHeight: (value: number) => void;
  isTextEditing: boolean;
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
    fillGradient, setFillGradient,
    fillStyle, setFillStyle,
    firstSelectedPath,
    beginCoalescing, endCoalescing,
    onToggleStyleLibrary,
    isStyleLibraryOpen,
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    textAlign, setTextAlign,
    lineHeight, setLineHeight,
    isTextEditing,
    onAdjustImageHsv,
  } = props;

  const { t } = useTranslation();
  const opacityLabel = t('opacity');
  const sidesLabel = t('sideToolbar.sides');
  const borderRadiusLabel = t('sideToolbar.borderRadius');
  const strokeWidthLabel = t('sideToolbar.strokeWidth');
  const strokeColorLabel = t('sideToolbar.strokeColor');
  const fillColorLabel = t('sideToolbar.fillColor');
  const framePropertiesLabel = t('sideToolbar.frameProperties');
  const styleLibraryLabel = t('sideToolbar.styleLibrary');
  const fontFamilyLabel = t('text.fontFamily');
  const fontSizeLabel = t('text.fontSize');
  const lineHeightLabel = t('text.lineHeight');
  const alignmentLabel = t('text.alignment');
  const alignLeftLabel = t('alignLeft');
  const alignCenterLabel = t('alignHorizontalCenter');
  const alignRightLabel = t('alignRight');

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
      return true;
    }
    return tool !== 'selection';
  }, [tool, firstSelectedPath]);

  const isFrameSelected = firstSelectedPath?.tool === 'frame';
  const isGradientActive = !!fillGradient;
  const isTextContext = firstSelectedPath?.tool === 'text' || tool === 'text';
  const disableTextControls = isTextEditing && isTextContext;

  const fontFamilyOptions = useMemo(
    () => [
      { value: 'Virgil, Segoe UI, sans-serif', label: 'Virgil' },
      { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
      { value: 'Cascadia, Menlo, monospace', label: 'Cascadia' },
    ],
    []
  );

  const resolvedFontFamilyOptions = useMemo(() => {
    if (fontFamilyOptions.some(option => option.value === fontFamily)) {
      return fontFamilyOptions;
    }
    return [...fontFamilyOptions, { value: fontFamily, label: fontFamily }];
  }, [fontFamily, fontFamilyOptions]);

  const alignmentOptions: Array<{ value: 'left' | 'center' | 'right'; label: string; icon: React.ReactNode }> = useMemo(
    () => [
      { value: 'left', label: alignLeftLabel, icon: ICONS.ALIGN_LEFT },
      { value: 'center', label: alignCenterLabel, icon: ICONS.ALIGN_HORIZONTAL_CENTER },
      { value: 'right', label: alignRightLabel, icon: ICONS.ALIGN_RIGHT },
    ],
    [alignCenterLabel, alignLeftLabel, alignRightLabel]
  );

  return (
    <div className="sidebar-container bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-1.5 flex flex-col items-center gap-1.5 text-[var(--text-primary)]">
      {isFrameSelected ? (
        <div className="text-center text-sm text-[var(--text-secondary)]">{framePropertiesLabel}</div>
      ) : (
        <>
          <NumericInput
            label={opacityLabel}
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
              label={sidesLabel}
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
              label={borderRadiusLabel}
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
            label={strokeWidthLabel}
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
          {isTextContext && (
            <div className="flex w-full justify-center">
              <div className="flex w-40 flex-col gap-2 rounded-lg border border-[var(--ui-panel-border)]/60 bg-[var(--ui-element-bg)]/40 p-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]">{fontFamilyLabel}</label>
                <select
                  className="w-full rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-element-bg)] px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  value={fontFamily}
                  onChange={event => setFontFamily(event.target.value)}
                  disabled={disableTextControls}
                >
                  {resolvedFontFamilyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-2">
                  <NumericInput
                    label={fontSizeLabel}
                    value={fontSize}
                    setValue={setFontSize}
                    min={1}
                    max={512}
                    step={1}
                    unit="px"
                    beginCoalescing={beginCoalescing}
                    endCoalescing={endCoalescing}
                  />
                  <NumericInput
                    label={lineHeightLabel}
                    value={lineHeight}
                    setValue={setLineHeight}
                    min={0.5}
                    max={5}
                    step={5}
                    unit="%"
                    valueTransformer={{
                      toDisplay: v => Math.round(v * 100),
                      fromDisplay: v => v / 100,
                    }}
                    beginCoalescing={beginCoalescing}
                    endCoalescing={endCoalescing}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">{alignmentLabel}</span>
                  <div className="flex items-center gap-1">
                    {alignmentOptions.map(option => (
                      <PanelButton
                        key={option.value}
                        variant="unstyled"
                        onClick={() => setTextAlign(option.value)}
                        disabled={disableTextControls}
                        className={`h-8 w-8 rounded-md transition-colors ${
                          textAlign === option.value
                            ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
                        }`}
                        title={option.label}
                        aria-label={option.label}
                      >
                        <div className="flex h-full w-full items-center justify-center">{option.icon}</div>
                      </PanelButton>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <ColorControl
            label={strokeColorLabel}
            color={color}
            setColor={setColor}
            beginCoalescing={beginCoalescing}
            endCoalescing={endCoalescing}
          />

          <GradientFillPopover
            label={fillColorLabel}
            fill={fill}
            fillGradient={fillGradient}
            setFill={setFill}
            setFillGradient={setFillGradient}
            fillStyle={fillStyle}
            setFillStyle={setFillStyle}
            beginCoalescing={beginCoalescing}
            endCoalescing={endCoalescing}
            className="mt-2"
          />
          <FillStyleControl
            fillStyle={fillStyle}
            setFillStyle={setFillStyle}
            disabled={isGradientActive}
          />

          {isDashControlVisible && (
            <DashControl {...props} />
          )}

          {isEndpointControlVisible && (
            <EndpointPopover {...props} />
          )}

          {firstSelectedPath?.tool === 'image' && (
            <ImageHsvPopover
              onAdjust={onAdjustImageHsv}
              beginCoalescing={beginCoalescing}
              endCoalescing={endCoalescing}
            />
          )}

          <EffectsPopover {...props} />
          <StylePropertiesPopover {...props} />
        </>
      )}


      <div className="h-px w-full bg-[var(--ui-separator)] my-1"></div>
      
      <div className="flex flex-col items-center w-14" title={styleLibraryLabel}>
        <PanelButton
          variant="unstyled"
          onClick={onToggleStyleLibrary}
          className={`flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors ${
            isStyleLibraryOpen
              ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
          }`}
          title={styleLibraryLabel}
        >
          {ICONS.STYLE_LIBRARY}
        </PanelButton>
      </div>
    </div>
  );
};
