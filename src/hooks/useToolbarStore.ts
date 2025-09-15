import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COLORS, DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_CURVE_TIGHTNESS, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_STEP_COUNT, DEFAULT_PRESERVE_VERTICES, DEFAULT_DISABLE_MULTI_STROKE, DEFAULT_DISABLE_MULTI_STROKE_FILL } from '@/constants';
import type { EndpointStyle } from '@/types';

export interface ToolbarState {
  drawingColor: string;
  setDrawingColor: (v: string) => void;

  drawingFill: string;
  setDrawingFill: (v: string) => void;

  drawingFillStyle: string;
  setDrawingFillStyle: (v: string) => void;

  drawingStrokeWidth: number;
  setDrawingStrokeWidth: (v: number) => void;

  drawingOpacity: number;
  setDrawingOpacity: (v: number) => void;

  drawingSides: number;
  setDrawingSides: (v: number) => void;

  drawingBorderRadius: number;
  setDrawingBorderRadius: (v: number) => void;

  drawingStrokeLineDash: [number, number] | undefined;
  setDrawingStrokeLineDash: (v: [number, number] | undefined) => void;

  drawingStrokeLineCapStart: EndpointStyle;
  setDrawingStrokeLineCapStart: (v: EndpointStyle) => void;

  drawingStrokeLineCapEnd: EndpointStyle;
  setDrawingStrokeLineCapEnd: (v: EndpointStyle) => void;

  drawingEndpointSize: number;
  setDrawingEndpointSize: (v: number) => void;

  drawingEndpointFill: 'solid' | 'hollow';
  setDrawingEndpointFill: (v: 'solid' | 'hollow') => void;

  drawingIsRough: boolean;
  setDrawingIsRough: (v: boolean) => void;

  drawingRoughness: number;
  setDrawingRoughness: (v: number) => void;

  drawingBowing: number;
  setDrawingBowing: (v: number) => void;

  drawingFillWeight: number;
  setDrawingFillWeight: (v: number) => void;

  drawingHachureAngle: number;
  setDrawingHachureAngle: (v: number) => void;

  drawingHachureGap: number;
  setDrawingHachureGap: (v: number) => void;

  drawingCurveTightness: number;
  setDrawingCurveTightness: (v: number) => void;

  drawingCurveStepCount: number;
  setDrawingCurveStepCount: (v: number) => void;

  drawingPreserveVertices: boolean;
  setDrawingPreserveVertices: (v: boolean) => void;

  drawingDisableMultiStroke: boolean;
  setDrawingDisableMultiStroke: (v: boolean) => void;

  drawingDisableMultiStrokeFill: boolean;
  setDrawingDisableMultiStrokeFill: (v: boolean) => void;

  drawingText: string;
  setDrawingText: (v: string) => void;

  drawingFontFamily: string;
  setDrawingFontFamily: (v: string) => void;

  drawingFontSize: number;
  setDrawingFontSize: (v: number) => void;

  drawingTextAlign: 'left' | 'center' | 'right';
  setDrawingTextAlign: (v: 'left' | 'center' | 'right') => void;

  drawingBlur: number;
  setDrawingBlur: (v: number) => void;

  drawingShadowEnabled: boolean;
  setDrawingShadowEnabled: (v: boolean) => void;

  drawingShadowOffsetX: number;
  setDrawingShadowOffsetX: (v: number) => void;

  drawingShadowOffsetY: number;
  setDrawingShadowOffsetY: (v: number) => void;

  drawingShadowBlur: number;
  setDrawingShadowBlur: (v: number) => void;

  drawingShadowColor: string;
  setDrawingShadowColor: (v: string) => void;
}

export const useToolbarStore = create<ToolbarState>()(
  persist(
    (set) => ({
      drawingColor: COLORS[0],
      setDrawingColor: (v) => set({ drawingColor: v }),

      drawingFill: 'transparent',
      setDrawingFill: (v) => set({ drawingFill: v }),

      drawingFillStyle: 'hachure',
      setDrawingFillStyle: (v) => set({ drawingFillStyle: v }),

      drawingStrokeWidth: 8,
      setDrawingStrokeWidth: (v) => set({ drawingStrokeWidth: v }),

      drawingOpacity: 1,
      setDrawingOpacity: (v) => set({ drawingOpacity: v }),

      drawingSides: 6,
      setDrawingSides: (v) => set({ drawingSides: v }),

      drawingBorderRadius: 0,
      setDrawingBorderRadius: (v) => set({ drawingBorderRadius: v }),

      drawingStrokeLineDash: undefined,
      setDrawingStrokeLineDash: (v) => set({ drawingStrokeLineDash: v }),

      drawingStrokeLineCapStart: 'round',
      setDrawingStrokeLineCapStart: (v) => set({ drawingStrokeLineCapStart: v }),

      drawingStrokeLineCapEnd: 'round',
      setDrawingStrokeLineCapEnd: (v) => set({ drawingStrokeLineCapEnd: v }),

      drawingEndpointSize: 1,
      setDrawingEndpointSize: (v) => set({ drawingEndpointSize: v }),

      drawingEndpointFill: 'hollow',
      setDrawingEndpointFill: (v) => set({ drawingEndpointFill: v }),

      drawingIsRough: true,
      setDrawingIsRough: (v) => set({ drawingIsRough: v }),

      drawingRoughness: DEFAULT_ROUGHNESS,
      setDrawingRoughness: (v) => set({ drawingRoughness: v }),

      drawingBowing: DEFAULT_BOWING,
      setDrawingBowing: (v) => set({ drawingBowing: v }),

      drawingFillWeight: DEFAULT_FILL_WEIGHT,
      setDrawingFillWeight: (v) => set({ drawingFillWeight: v }),

      drawingHachureAngle: DEFAULT_HACHURE_ANGLE,
      setDrawingHachureAngle: (v) => set({ drawingHachureAngle: v }),

      drawingHachureGap: DEFAULT_HACHURE_GAP,
      setDrawingHachureGap: (v) => set({ drawingHachureGap: v }),

      drawingCurveTightness: DEFAULT_CURVE_TIGHTNESS,
      setDrawingCurveTightness: (v) => set({ drawingCurveTightness: v }),

      drawingCurveStepCount: DEFAULT_CURVE_STEP_COUNT,
      setDrawingCurveStepCount: (v) => set({ drawingCurveStepCount: v }),

      drawingPreserveVertices: DEFAULT_PRESERVE_VERTICES,
      setDrawingPreserveVertices: (v) => set({ drawingPreserveVertices: v }),

      drawingDisableMultiStroke: DEFAULT_DISABLE_MULTI_STROKE,
      setDrawingDisableMultiStroke: (v) => set({ drawingDisableMultiStroke: v }),

      drawingDisableMultiStrokeFill: DEFAULT_DISABLE_MULTI_STROKE_FILL,
      setDrawingDisableMultiStrokeFill: (v) => set({ drawingDisableMultiStrokeFill: v }),

      drawingText: '文本',
      setDrawingText: (v) => set({ drawingText: v }),

      drawingFontFamily: 'Excalifont',
      setDrawingFontFamily: (v) => set({ drawingFontFamily: v }),

      drawingFontSize: 24,
      setDrawingFontSize: (v) => set({ drawingFontSize: v }),

      drawingTextAlign: 'left',
      setDrawingTextAlign: (v) => set({ drawingTextAlign: v }),

      drawingBlur: 0,
      setDrawingBlur: (v) => set({ drawingBlur: v }),

      drawingShadowEnabled: false,
      setDrawingShadowEnabled: (v) => set({ drawingShadowEnabled: v }),

      drawingShadowOffsetX: 2,
      setDrawingShadowOffsetX: (v) => set({ drawingShadowOffsetX: v }),

      drawingShadowOffsetY: 2,
      setDrawingShadowOffsetY: (v) => set({ drawingShadowOffsetY: v }),

      drawingShadowBlur: 4,
      setDrawingShadowBlur: (v) => set({ drawingShadowBlur: v }),

      drawingShadowColor: 'rgba(0,0,0,0.5)',
      setDrawingShadowColor: (v) => set({ drawingShadowColor: v }),
    }),
    {
      name: 'whiteboard_toolbar_state',
    }
  )
);

