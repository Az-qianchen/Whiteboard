/**
 * Toolbar drawing properties mapped to Zustand store selectors.
 * This replaces the previous localStorage + useState approach.
 */
import { useToolbarStore } from '@/hooks/useToolbarStore';
import type { EndpointStyle } from '@/types';

export const useDrawingColor = () => {
  const drawingColor = useToolbarStore(s => s.drawingColor);
  const setDrawingColor = useToolbarStore(s => s.setDrawingColor);
  return { drawingColor, setDrawingColor };
};

export const useDrawingFill = () => {
  const drawingFill = useToolbarStore(s => s.drawingFill);
  const setDrawingFill = useToolbarStore(s => s.setDrawingFill);
  return { drawingFill, setDrawingFill };
};

export const useDrawingFillStyle = () => {
  const drawingFillStyle = useToolbarStore(s => s.drawingFillStyle);
  const setDrawingFillStyle = useToolbarStore(s => s.setDrawingFillStyle);
  return { drawingFillStyle, setDrawingFillStyle };
};

export const useDrawingStrokeWidth = () => {
  const drawingStrokeWidth = useToolbarStore(s => s.drawingStrokeWidth);
  const setDrawingStrokeWidth = useToolbarStore(s => s.setDrawingStrokeWidth);
  return { drawingStrokeWidth, setDrawingStrokeWidth };
};

export const useDrawingOpacity = () => {
  const drawingOpacity = useToolbarStore(s => s.drawingOpacity);
  const setDrawingOpacity = useToolbarStore(s => s.setDrawingOpacity);
  return { drawingOpacity, setDrawingOpacity };
};

export const useDrawingSides = () => {
  const drawingSides = useToolbarStore(s => s.drawingSides);
  const setDrawingSides = useToolbarStore(s => s.setDrawingSides);
  return { drawingSides, setDrawingSides };
};

export const useDrawingBorderRadius = () => {
  const drawingBorderRadius = useToolbarStore(s => s.drawingBorderRadius);
  const setDrawingBorderRadius = useToolbarStore(s => s.setDrawingBorderRadius);
  return { drawingBorderRadius, setDrawingBorderRadius };
};

export const useDrawingStrokeLineDash = () => {
  const drawingStrokeLineDash = useToolbarStore(s => s.drawingStrokeLineDash);
  const setDrawingStrokeLineDash = useToolbarStore(s => s.setDrawingStrokeLineDash);
  return { drawingStrokeLineDash, setDrawingStrokeLineDash };
};

export const useDrawingStrokeLineCapStart = () => {
  const drawingStrokeLineCapStart = useToolbarStore(s => s.drawingStrokeLineCapStart as EndpointStyle);
  const setDrawingStrokeLineCapStart = useToolbarStore(s => s.setDrawingStrokeLineCapStart);
  return { drawingStrokeLineCapStart, setDrawingStrokeLineCapStart };
};

export const useDrawingStrokeLineCapEnd = () => {
  const drawingStrokeLineCapEnd = useToolbarStore(s => s.drawingStrokeLineCapEnd as EndpointStyle);
  const setDrawingStrokeLineCapEnd = useToolbarStore(s => s.setDrawingStrokeLineCapEnd);
  return { drawingStrokeLineCapEnd, setDrawingStrokeLineCapEnd };
};

export const useDrawingEndpointSize = () => {
  const drawingEndpointSize = useToolbarStore(s => s.drawingEndpointSize);
  const setDrawingEndpointSize = useToolbarStore(s => s.setDrawingEndpointSize);
  return { drawingEndpointSize, setDrawingEndpointSize };
};

export const useDrawingEndpointFill = () => {
  const drawingEndpointFill = useToolbarStore(s => s.drawingEndpointFill);
  const setDrawingEndpointFill = useToolbarStore(s => s.setDrawingEndpointFill);
  return { drawingEndpointFill, setDrawingEndpointFill };
};

export const useDrawingIsRough = () => {
  const drawingIsRough = useToolbarStore(s => s.drawingIsRough);
  const setDrawingIsRough = useToolbarStore(s => s.setDrawingIsRough);
  return { drawingIsRough, setDrawingIsRough };
};

export const useDrawingRoughness = () => {
  const drawingRoughness = useToolbarStore(s => s.drawingRoughness);
  const setDrawingRoughness = useToolbarStore(s => s.setDrawingRoughness);
  return { drawingRoughness, setDrawingRoughness };
};

export const useDrawingBowing = () => {
  const drawingBowing = useToolbarStore(s => s.drawingBowing);
  const setDrawingBowing = useToolbarStore(s => s.setDrawingBowing);
  return { drawingBowing, setDrawingBowing };
};

export const useDrawingFillWeight = () => {
  const drawingFillWeight = useToolbarStore(s => s.drawingFillWeight);
  const setDrawingFillWeight = useToolbarStore(s => s.setDrawingFillWeight);
  return { drawingFillWeight, setDrawingFillWeight };
};

export const useDrawingHachureAngle = () => {
  const drawingHachureAngle = useToolbarStore(s => s.drawingHachureAngle);
  const setDrawingHachureAngle = useToolbarStore(s => s.setDrawingHachureAngle);
  return { drawingHachureAngle, setDrawingHachureAngle };
};

export const useDrawingHachureGap = () => {
  const drawingHachureGap = useToolbarStore(s => s.drawingHachureGap);
  const setDrawingHachureGap = useToolbarStore(s => s.setDrawingHachureGap);
  return { drawingHachureGap, setDrawingHachureGap };
};

export const useDrawingCurveTightness = () => {
  const drawingCurveTightness = useToolbarStore(s => s.drawingCurveTightness);
  const setDrawingCurveTightness = useToolbarStore(s => s.setDrawingCurveTightness);
  return { drawingCurveTightness, setDrawingCurveTightness };
};

export const useDrawingCurveStepCount = () => {
  const drawingCurveStepCount = useToolbarStore(s => s.drawingCurveStepCount);
  const setDrawingCurveStepCount = useToolbarStore(s => s.setDrawingCurveStepCount);
  return { drawingCurveStepCount, setDrawingCurveStepCount };
};

export const useDrawingPreserveVertices = () => {
  const drawingPreserveVertices = useToolbarStore(s => s.drawingPreserveVertices);
  const setDrawingPreserveVertices = useToolbarStore(s => s.setDrawingPreserveVertices);
  return { drawingPreserveVertices, setDrawingPreserveVertices };
};

export const useDrawingDisableMultiStroke = () => {
  const drawingDisableMultiStroke = useToolbarStore(s => s.drawingDisableMultiStroke);
  const setDrawingDisableMultiStroke = useToolbarStore(s => s.setDrawingDisableMultiStroke);
  return { drawingDisableMultiStroke, setDrawingDisableMultiStroke };
};

export const useDrawingDisableMultiStrokeFill = () => {
  const drawingDisableMultiStrokeFill = useToolbarStore(s => s.drawingDisableMultiStrokeFill);
  const setDrawingDisableMultiStrokeFill = useToolbarStore(s => s.setDrawingDisableMultiStrokeFill);
  return { drawingDisableMultiStrokeFill, setDrawingDisableMultiStrokeFill };
};

export const useDrawingText = () => {
  const drawingText = useToolbarStore(s => s.drawingText);
  const setDrawingText = useToolbarStore(s => s.setDrawingText);
  return { drawingText, setDrawingText };
};

export const useDrawingFontFamily = () => {
  const drawingFontFamily = useToolbarStore(s => s.drawingFontFamily);
  const setDrawingFontFamily = useToolbarStore(s => s.setDrawingFontFamily);
  return { drawingFontFamily, setDrawingFontFamily };
};

export const useDrawingFontSize = () => {
  const drawingFontSize = useToolbarStore(s => s.drawingFontSize);
  const setDrawingFontSize = useToolbarStore(s => s.setDrawingFontSize);
  return { drawingFontSize, setDrawingFontSize };
};

export const useDrawingTextAlign = () => {
  const drawingTextAlign = useToolbarStore(s => s.drawingTextAlign);
  const setDrawingTextAlign = useToolbarStore(s => s.setDrawingTextAlign);
  return { drawingTextAlign, setDrawingTextAlign };
};

export const useDrawingBlur = () => {
  const drawingBlur = useToolbarStore(s => s.drawingBlur);
  const setDrawingBlur = useToolbarStore(s => s.setDrawingBlur);
  return { drawingBlur, setDrawingBlur };
};

export const useDrawingShadowEnabled = () => {
  const drawingShadowEnabled = useToolbarStore(s => s.drawingShadowEnabled);
  const setDrawingShadowEnabled = useToolbarStore(s => s.setDrawingShadowEnabled);
  return { drawingShadowEnabled, setDrawingShadowEnabled };
};

export const useDrawingShadowOffsetX = () => {
  const drawingShadowOffsetX = useToolbarStore(s => s.drawingShadowOffsetX);
  const setDrawingShadowOffsetX = useToolbarStore(s => s.setDrawingShadowOffsetX);
  return { drawingShadowOffsetX, setDrawingShadowOffsetX };
};

export const useDrawingShadowOffsetY = () => {
  const drawingShadowOffsetY = useToolbarStore(s => s.drawingShadowOffsetY);
  const setDrawingShadowOffsetY = useToolbarStore(s => s.setDrawingShadowOffsetY);
  return { drawingShadowOffsetY, setDrawingShadowOffsetY };
};

export const useDrawingShadowBlur = () => {
  const drawingShadowBlur = useToolbarStore(s => s.drawingShadowBlur);
  const setDrawingShadowBlur = useToolbarStore(s => s.setDrawingShadowBlur);
  return { drawingShadowBlur, setDrawingShadowBlur };
};

export const useDrawingShadowColor = () => {
  const drawingShadowColor = useToolbarStore(s => s.drawingShadowColor);
  const setDrawingShadowColor = useToolbarStore(s => s.setDrawingShadowColor);
  return { drawingShadowColor, setDrawingShadowColor };
};

