/**
 * 本文件包含一系列简单的自定义 Hooks，用于管理单个绘图属性的状态及其在 localStorage 中的持久化。
 */
import { useState, useEffect } from 'react';
import { getLocalStorageItem } from '../../lib/utils';
import { COLORS, DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_CURVE_TIGHTNESS, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_STEP_COUNT, DEFAULT_PRESERVE_VERTICES, DEFAULT_DISABLE_MULTI_STROKE, DEFAULT_DISABLE_MULTI_STROKE_FILL } from '../../constants';
import type { EndpointStyle } from '../../types';

const useDrawingProperty = <T,>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => getLocalStorageItem(key, defaultValue));
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [value, key]);
  return { [`drawing${key.split('_').pop()}`]: value, [`setDrawing${key.split('_').pop()}`]: setValue };
};

export const useDrawingColor = () => {
  const [drawingColor, setDrawingColor] = useState<string>(() => getLocalStorageItem('whiteboard_drawingColor', COLORS[0]));
  useEffect(() => { localStorage.setItem('whiteboard_drawingColor', JSON.stringify(drawingColor)); }, [drawingColor]);
  return { drawingColor, setDrawingColor };
};

export const useDrawingFill = () => {
  const [drawingFill, setDrawingFill] = useState<string>(() => getLocalStorageItem('whiteboard_drawingFill', 'transparent'));
  useEffect(() => { localStorage.setItem('whiteboard_drawingFill', JSON.stringify(drawingFill)); }, [drawingFill]);
  return { drawingFill, setDrawingFill };
};

export const useDrawingFillStyle = () => {
  const [drawingFillStyle, setDrawingFillStyle] = useState<string>(() => getLocalStorageItem('whiteboard_drawingFillStyle', 'hachure'));
  useEffect(() => { localStorage.setItem('whiteboard_drawingFillStyle', JSON.stringify(drawingFillStyle)); }, [drawingFillStyle]);
  return { drawingFillStyle, setDrawingFillStyle };
};

export const useDrawingStrokeWidth = () => {
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState<number>(() => getLocalStorageItem('whiteboard_drawingStrokeWidth', 8));
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeWidth', JSON.stringify(drawingStrokeWidth)); }, [drawingStrokeWidth]);
  return { drawingStrokeWidth, setDrawingStrokeWidth };
};

export const useDrawingOpacity = () => {
  const [drawingOpacity, setDrawingOpacity] = useState<number>(() => getLocalStorageItem('whiteboard_drawingOpacity', 1));
  useEffect(() => { localStorage.setItem('whiteboard_drawingOpacity', JSON.stringify(drawingOpacity)); }, [drawingOpacity]);
  return { drawingOpacity, setDrawingOpacity };
};

export const useDrawingSides = () => {
  const [drawingSides, setDrawingSides] = useState<number>(() => getLocalStorageItem('whiteboard_drawingSides', 6));
  useEffect(() => { localStorage.setItem('whiteboard_drawingSides', JSON.stringify(drawingSides)); }, [drawingSides]);
  return { drawingSides, setDrawingSides };
};

export const useDrawingBorderRadius = () => {
  const [drawingBorderRadius, setDrawingBorderRadius] = useState<number>(() => getLocalStorageItem('whiteboard_drawingBorderRadius', 0));
  useEffect(() => { localStorage.setItem('whiteboard_drawingBorderRadius', JSON.stringify(drawingBorderRadius)); }, [drawingBorderRadius]);
  return { drawingBorderRadius, setDrawingBorderRadius };
};

export const useDrawingStrokeLineDash = () => {
  const [drawingStrokeLineDash, setDrawingStrokeLineDash] = useState<[number, number] | undefined>(() => getLocalStorageItem('whiteboard_drawingStrokeLineDash', undefined));
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineDash', JSON.stringify(drawingStrokeLineDash)); }, [drawingStrokeLineDash]);
  return { drawingStrokeLineDash, setDrawingStrokeLineDash };
};

export const useDrawingStrokeLineCapStart = () => {
  const [drawingStrokeLineCapStart, setDrawingStrokeLineCapStart] = useState<EndpointStyle>(() => getLocalStorageItem('whiteboard_drawingStrokeLineCapStart', 'round'));
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineCapStart', JSON.stringify(drawingStrokeLineCapStart)); }, [drawingStrokeLineCapStart]);
  return { drawingStrokeLineCapStart, setDrawingStrokeLineCapStart };
};

export const useDrawingStrokeLineCapEnd = () => {
  const [drawingStrokeLineCapEnd, setDrawingStrokeLineCapEnd] = useState<EndpointStyle>(() => getLocalStorageItem('whiteboard_drawingStrokeLineCapEnd', 'round'));
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineCapEnd', JSON.stringify(drawingStrokeLineCapEnd)); }, [drawingStrokeLineCapEnd]);
  return { drawingStrokeLineCapEnd, setDrawingStrokeLineCapEnd };
};

export const useDrawingEndpointSize = () => {
  const [drawingEndpointSize, setDrawingEndpointSize] = useState<number>(() => getLocalStorageItem('whiteboard_drawingEndpointSize', 1));
  useEffect(() => { localStorage.setItem('whiteboard_drawingEndpointSize', JSON.stringify(drawingEndpointSize)); }, [drawingEndpointSize]);
  return { drawingEndpointSize, setDrawingEndpointSize };
};

export const useDrawingEndpointFill = () => {
  const [drawingEndpointFill, setDrawingEndpointFill] = useState<'solid' | 'hollow'>(() => getLocalStorageItem('whiteboard_drawingEndpointFill', 'hollow'));
  useEffect(() => { localStorage.setItem('whiteboard_drawingEndpointFill', JSON.stringify(drawingEndpointFill)); }, [drawingEndpointFill]);
  return { drawingEndpointFill, setDrawingEndpointFill };
};

export const useDrawingIsRough = () => {
  const [drawingIsRough, setDrawingIsRough] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingIsRough', true));
  useEffect(() => { localStorage.setItem('whiteboard_drawingIsRough', JSON.stringify(drawingIsRough)); }, [drawingIsRough]);
  return { drawingIsRough, setDrawingIsRough };
};

export const useDrawingRoughness = () => {
  const [drawingRoughness, setDrawingRoughness] = useState<number>(() => getLocalStorageItem('whiteboard_drawingRoughness', DEFAULT_ROUGHNESS));
  useEffect(() => { localStorage.setItem('whiteboard_drawingRoughness', JSON.stringify(drawingRoughness)); }, [drawingRoughness]);
  return { drawingRoughness, setDrawingRoughness };
};

export const useDrawingBowing = () => {
  const [drawingBowing, setDrawingBowing] = useState<number>(() => getLocalStorageItem('whiteboard_drawingBowing', DEFAULT_BOWING));
  useEffect(() => { localStorage.setItem('whiteboard_drawingBowing', JSON.stringify(drawingBowing)); }, [drawingBowing]);
  return { drawingBowing, setDrawingBowing };
};

export const useDrawingFillWeight = () => {
  const [drawingFillWeight, setDrawingFillWeight] = useState<number>(() => getLocalStorageItem('whiteboard_drawingFillWeight', DEFAULT_FILL_WEIGHT));
  useEffect(() => { localStorage.setItem('whiteboard_drawingFillWeight', JSON.stringify(drawingFillWeight)); }, [drawingFillWeight]);
  return { drawingFillWeight, setDrawingFillWeight };
};

export const useDrawingHachureAngle = () => {
  const [drawingHachureAngle, setDrawingHachureAngle] = useState<number>(() => getLocalStorageItem('whiteboard_drawingHachureAngle', DEFAULT_HACHURE_ANGLE));
  useEffect(() => { localStorage.setItem('whiteboard_drawingHachureAngle', JSON.stringify(drawingHachureAngle)); }, [drawingHachureAngle]);
  return { drawingHachureAngle, setDrawingHachureAngle };
};

export const useDrawingHachureGap = () => {
  const [drawingHachureGap, setDrawingHachureGap] = useState<number>(() => getLocalStorageItem('whiteboard_drawingHachureGap', DEFAULT_HACHURE_GAP));
  useEffect(() => { localStorage.setItem('whiteboard_drawingHachureGap', JSON.stringify(drawingHachureGap)); }, [drawingHachureGap]);
  return { drawingHachureGap, setDrawingHachureGap };
};

export const useDrawingCurveTightness = () => {
  const [drawingCurveTightness, setDrawingCurveTightness] = useState<number>(() => getLocalStorageItem('whiteboard_drawingCurveTightness', DEFAULT_CURVE_TIGHTNESS));
  useEffect(() => { localStorage.setItem('whiteboard_drawingCurveTightness', JSON.stringify(drawingCurveTightness)); }, [drawingCurveTightness]);
  return { drawingCurveTightness, setDrawingCurveTightness };
};

export const useDrawingCurveStepCount = () => {
  const [drawingCurveStepCount, setDrawingCurveStepCount] = useState<number>(() => getLocalStorageItem('whiteboard_drawingCurveStepCount', DEFAULT_CURVE_STEP_COUNT));
  useEffect(() => { localStorage.setItem('whiteboard_drawingCurveStepCount', JSON.stringify(drawingCurveStepCount)); }, [drawingCurveStepCount]);
  return { drawingCurveStepCount, setDrawingCurveStepCount };
};

export const useDrawingPreserveVertices = () => {
  const [drawingPreserveVertices, setDrawingPreserveVertices] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingPreserveVertices', DEFAULT_PRESERVE_VERTICES));
  useEffect(() => { localStorage.setItem('whiteboard_drawingPreserveVertices', JSON.stringify(drawingPreserveVertices)); }, [drawingPreserveVertices]);
  return { drawingPreserveVertices, setDrawingPreserveVertices };
};

export const useDrawingDisableMultiStroke = () => {
  const [drawingDisableMultiStroke, setDrawingDisableMultiStroke] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingDisableMultiStroke', DEFAULT_DISABLE_MULTI_STROKE));
  useEffect(() => { localStorage.setItem('whiteboard_drawingDisableMultiStroke', JSON.stringify(drawingDisableMultiStroke)); }, [drawingDisableMultiStroke]);
  return { drawingDisableMultiStroke, setDrawingDisableMultiStroke };
};

export const useDrawingDisableMultiStrokeFill = () => {
  const [drawingDisableMultiStrokeFill, setDrawingDisableMultiStrokeFill] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingDisableMultiStrokeFill', DEFAULT_DISABLE_MULTI_STROKE_FILL));
  useEffect(() => { localStorage.setItem('whiteboard_drawingDisableMultiStrokeFill', JSON.stringify(drawingDisableMultiStrokeFill)); }, [drawingDisableMultiStrokeFill]);
  return { drawingDisableMultiStrokeFill, setDrawingDisableMultiStrokeFill };
};

export const useDrawingText = () => {
  const [drawingText, setDrawingText] = useState<string>(() => getLocalStorageItem('whiteboard_drawingText', '文本'));
  useEffect(() => { localStorage.setItem('whiteboard_drawingText', JSON.stringify(drawingText)); }, [drawingText]);
  return { drawingText, setDrawingText };
};

export const useDrawingFontSize = () => {
  const [drawingFontSize, setDrawingFontSize] = useState<number>(() => getLocalStorageItem('whiteboard_drawingFontSize', 24));
  useEffect(() => { localStorage.setItem('whiteboard_drawingFontSize', JSON.stringify(drawingFontSize)); }, [drawingFontSize]);
  return { drawingFontSize, setDrawingFontSize };
};

export const useDrawingTextAlign = () => {
  const [drawingTextAlign, setDrawingTextAlign] = useState<'left' | 'center' | 'right'>(() => getLocalStorageItem('whiteboard_drawingTextAlign', 'left'));
  useEffect(() => { localStorage.setItem('whiteboard_drawingTextAlign', JSON.stringify(drawingTextAlign)); }, [drawingTextAlign]);
  return { drawingTextAlign, setDrawingTextAlign };
};

export const useDrawingBlur = () => {
  const [drawingBlur, setDrawingBlur] = useState<number>(() => getLocalStorageItem('whiteboard_drawingBlur', 0));
  useEffect(() => { localStorage.setItem('whiteboard_drawingBlur', JSON.stringify(drawingBlur)); }, [drawingBlur]);
  return { drawingBlur, setDrawingBlur };
};

export const useDrawingShadowEnabled = () => {
  const [drawingShadowEnabled, setDrawingShadowEnabled] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingShadowEnabled', false));
  useEffect(() => { localStorage.setItem('whiteboard_drawingShadowEnabled', JSON.stringify(drawingShadowEnabled)); }, [drawingShadowEnabled]);
  return { drawingShadowEnabled, setDrawingShadowEnabled };
};

export const useDrawingShadowOffsetX = () => {
  const [drawingShadowOffsetX, setDrawingShadowOffsetX] = useState<number>(() => getLocalStorageItem('whiteboard_drawingShadowOffsetX', 2));
  useEffect(() => { localStorage.setItem('whiteboard_drawingShadowOffsetX', JSON.stringify(drawingShadowOffsetX)); }, [drawingShadowOffsetX]);
  return { drawingShadowOffsetX, setDrawingShadowOffsetX };
};

export const useDrawingShadowOffsetY = () => {
  const [drawingShadowOffsetY, setDrawingShadowOffsetY] = useState<number>(() => getLocalStorageItem('whiteboard_drawingShadowOffsetY', 2));
  useEffect(() => { localStorage.setItem('whiteboard_drawingShadowOffsetY', JSON.stringify(drawingShadowOffsetY)); }, [drawingShadowOffsetY]);
  return { drawingShadowOffsetY, setDrawingShadowOffsetY };
};

export const useDrawingShadowBlur = () => {
  const [drawingShadowBlur, setDrawingShadowBlur] = useState<number>(() => getLocalStorageItem('whiteboard_drawingShadowBlur', 4));
  useEffect(() => { localStorage.setItem('whiteboard_drawingShadowBlur', JSON.stringify(drawingShadowBlur)); }, [drawingShadowBlur]);
  return { drawingShadowBlur, setDrawingShadowBlur };
};

export const useDrawingShadowColor = () => {
  const [drawingShadowColor, setDrawingShadowColor] = useState<string>(() => getLocalStorageItem('whiteboard_drawingShadowColor', 'rgba(0,0,0,0.5)'));
  useEffect(() => { localStorage.setItem('whiteboard_drawingShadowColor', JSON.stringify(drawingShadowColor)); }, [drawingShadowColor]);
  return { drawingShadowColor, setDrawingShadowColor };
};
