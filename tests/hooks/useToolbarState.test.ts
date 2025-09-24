// useToolbarState 钩子状态更新测试
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToolbarState } from '@/hooks/useToolbarState';
import { COLORS, DEFAULT_BOWING, DEFAULT_CURVE_STEP_COUNT, DEFAULT_CURVE_TIGHTNESS, DEFAULT_DISABLE_MULTI_STROKE, DEFAULT_DISABLE_MULTI_STROKE_FILL, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_PRESERVE_VERTICES, DEFAULT_ROUGHNESS } from '@/constants';
import type { AnyPath, RectangleData, TextData } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

const drawingColorSetter = vi.fn();
const drawingFillSetter = vi.fn();
const drawingFillGradientSetter = vi.fn();
const drawingFillStyleSetter = vi.fn();
const drawingStrokeWidthSetter = vi.fn();
const drawingOpacitySetter = vi.fn();
const drawingSidesSetter = vi.fn();
const drawingBorderRadiusSetter = vi.fn();
const drawingStrokeLineDashSetter = vi.fn();
const drawingStrokeLineCapStartSetter = vi.fn();
const drawingStrokeLineCapEndSetter = vi.fn();
const drawingEndpointSizeSetter = vi.fn();
const drawingEndpointFillSetter = vi.fn();
const drawingIsRoughSetter = vi.fn();
const drawingRoughnessSetter = vi.fn();
const drawingBowingSetter = vi.fn();
const drawingFillWeightSetter = vi.fn();
const drawingHachureAngleSetter = vi.fn();
const drawingHachureGapSetter = vi.fn();
const drawingCurveTightnessSetter = vi.fn();
const drawingCurveStepCountSetter = vi.fn();
const drawingPreserveVerticesSetter = vi.fn();
const drawingDisableMultiStrokeSetter = vi.fn();
const drawingDisableMultiStrokeFillSetter = vi.fn();
const drawingTextSetter = vi.fn();
const drawingFontFamilySetter = vi.fn();
const drawingFontSizeSetter = vi.fn();
const drawingTextAlignSetter = vi.fn();
const drawingBlurSetter = vi.fn();
const drawingShadowEnabledSetter = vi.fn();
const drawingShadowOffsetXSetter = vi.fn();
const drawingShadowOffsetYSetter = vi.fn();
const drawingShadowBlurSetter = vi.fn();
const drawingShadowColorSetter = vi.fn();

vi.mock('@/hooks/toolbar-state/property-hooks', () => ({
  useDrawingColor: () => ({ drawingColor: '#222222', setDrawingColor: drawingColorSetter }),
  useDrawingFill: () => ({ drawingFill: 'transparent', setDrawingFill: drawingFillSetter }),
  useDrawingFillGradient: () => ({ drawingFillGradient: null, setDrawingFillGradient: drawingFillGradientSetter }),
  useDrawingFillStyle: () => ({ drawingFillStyle: 'hachure', setDrawingFillStyle: drawingFillStyleSetter }),
  useDrawingStrokeWidth: () => ({ drawingStrokeWidth: 0, setDrawingStrokeWidth: drawingStrokeWidthSetter }),
  useDrawingOpacity: () => ({ drawingOpacity: 1, setDrawingOpacity: drawingOpacitySetter }),
  useDrawingSides: () => ({ drawingSides: 6, setDrawingSides: drawingSidesSetter }),
  useDrawingBorderRadius: () => ({ drawingBorderRadius: 0, setDrawingBorderRadius: drawingBorderRadiusSetter }),
  useDrawingStrokeLineDash: () => ({ drawingStrokeLineDash: undefined, setDrawingStrokeLineDash: drawingStrokeLineDashSetter }),
  useDrawingStrokeLineCapStart: () => ({ drawingStrokeLineCapStart: 'round', setDrawingStrokeLineCapStart: drawingStrokeLineCapStartSetter }),
  useDrawingStrokeLineCapEnd: () => ({ drawingStrokeLineCapEnd: 'round', setDrawingStrokeLineCapEnd: drawingStrokeLineCapEndSetter }),
  useDrawingEndpointSize: () => ({ drawingEndpointSize: 1, setDrawingEndpointSize: drawingEndpointSizeSetter }),
  useDrawingEndpointFill: () => ({ drawingEndpointFill: 'hollow', setDrawingEndpointFill: drawingEndpointFillSetter }),
  useDrawingIsRough: () => ({ drawingIsRough: true, setDrawingIsRough: drawingIsRoughSetter }),
  useDrawingRoughness: () => ({ drawingRoughness: DEFAULT_ROUGHNESS, setDrawingRoughness: drawingRoughnessSetter }),
  useDrawingBowing: () => ({ drawingBowing: DEFAULT_BOWING, setDrawingBowing: drawingBowingSetter }),
  useDrawingFillWeight: () => ({ drawingFillWeight: DEFAULT_FILL_WEIGHT, setDrawingFillWeight: drawingFillWeightSetter }),
  useDrawingHachureAngle: () => ({ drawingHachureAngle: DEFAULT_HACHURE_ANGLE, setDrawingHachureAngle: drawingHachureAngleSetter }),
  useDrawingHachureGap: () => ({ drawingHachureGap: DEFAULT_HACHURE_GAP, setDrawingHachureGap: drawingHachureGapSetter }),
  useDrawingCurveTightness: () => ({ drawingCurveTightness: DEFAULT_CURVE_TIGHTNESS, setDrawingCurveTightness: drawingCurveTightnessSetter }),
  useDrawingCurveStepCount: () => ({ drawingCurveStepCount: DEFAULT_CURVE_STEP_COUNT, setDrawingCurveStepCount: drawingCurveStepCountSetter }),
  useDrawingPreserveVertices: () => ({ drawingPreserveVertices: DEFAULT_PRESERVE_VERTICES, setDrawingPreserveVertices: drawingPreserveVerticesSetter }),
  useDrawingDisableMultiStroke: () => ({ drawingDisableMultiStroke: DEFAULT_DISABLE_MULTI_STROKE, setDrawingDisableMultiStroke: drawingDisableMultiStrokeSetter }),
  useDrawingDisableMultiStrokeFill: () => ({ drawingDisableMultiStrokeFill: DEFAULT_DISABLE_MULTI_STROKE_FILL, setDrawingDisableMultiStrokeFill: drawingDisableMultiStrokeFillSetter }),
  useDrawingText: () => ({ drawingText: '', setDrawingText: drawingTextSetter }),
  useDrawingFontFamily: () => ({ drawingFontFamily: 'Excalifont', setDrawingFontFamily: drawingFontFamilySetter }),
  useDrawingFontSize: () => ({ drawingFontSize: 24, setDrawingFontSize: drawingFontSizeSetter }),
  useDrawingTextAlign: () => ({ drawingTextAlign: 'left', setDrawingTextAlign: drawingTextAlignSetter }),
  useDrawingBlur: () => ({ drawingBlur: 0, setDrawingBlur: drawingBlurSetter }),
  useDrawingShadowEnabled: () => ({ drawingShadowEnabled: false, setDrawingShadowEnabled: drawingShadowEnabledSetter }),
  useDrawingShadowOffsetX: () => ({ drawingShadowOffsetX: 2, setDrawingShadowOffsetX: drawingShadowOffsetXSetter }),
  useDrawingShadowOffsetY: () => ({ drawingShadowOffsetY: 2, setDrawingShadowOffsetY: drawingShadowOffsetYSetter }),
  useDrawingShadowBlur: () => ({ drawingShadowBlur: 4, setDrawingShadowBlur: drawingShadowBlurSetter }),
  useDrawingShadowColor: () => ({ drawingShadowColor: 'rgba(0,0,0,0.5)', setDrawingShadowColor: drawingShadowColorSetter }),
}));

const setToolMock = vi.fn();
const setSelectionModeMock = vi.fn();
let currentTool: 'brush' | 'selection' | 'pen' | 'rectangle' | 'polygon' | 'ellipse' | 'line' | 'arc' | 'text' | 'frame' = 'brush';
let currentSelectionMode: 'move' | 'edit' | 'lasso' = 'move';
const useToolManagementMock = vi.fn(() => ({
  tool: currentTool,
  setTool: setToolMock,
  selectionMode: currentSelectionMode,
  setSelectionMode: setSelectionModeMock,
}));

vi.mock('@/hooks/toolbar-state/useToolManagement', () => ({
  useToolManagement: (...args: unknown[]) => useToolManagementMock(...args),
}));

const pathActions = { beginSimplify: vi.fn(), setSimplify: vi.fn(), endSimplify: vi.fn(), isSimplifiable: false };
const usePathActionsMock = vi.fn(() => pathActions);

vi.mock('@/hooks/toolbar-state/usePathActions', () => ({
  usePathActions: (...args: unknown[]) => usePathActionsMock(...args),
}));

const drawingMocks = vi.hoisted(() => ({
  measureTextMock: vi.fn(() => ({ width: 80, height: 40 })),
}));

vi.mock('@/lib/drawing', () => ({
  measureText: drawingMocks.measureTextMock,
}));

const { measureTextMock } = drawingMocks;

type HookProps = {
  paths: AnyPath[];
  selectedPathIds: string[];
};

describe('useToolbarState', () => {
  const rectangleBase: RectangleData = {
    id: 'rect-1',
    tool: 'rectangle',
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    color: '#00AA00',
    fill: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 0,
    roughness: 0,
    bowing: 0,
    fillWeight: 0,
    hachureAngle: 0,
    hachureGap: 0,
    curveTightness: 0,
    curveStepCount: 0,
  } as RectangleData;

  const textBase: TextData = {
    id: 'text-1',
    tool: 'text',
    text: 'hello',
    fontFamily: 'Excalifont',
    fontSize: 24,
    textAlign: 'left',
    x: 10,
    y: 20,
    width: 60,
    height: 40,
    color: '#000000',
    fill: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    roughness: 0,
    bowing: 0,
    fillWeight: 0,
    hachureAngle: 0,
    hachureGap: 0,
    curveTightness: 0,
    curveStepCount: 0,
  } as TextData;

  let currentPaths: AnyPath[];
  let currentSelectedIds: string[];
  const beginCoalescing = vi.fn();
  const endCoalescing = vi.fn();

  const setPaths: Dispatch<SetStateAction<AnyPath[]>> = updater => {
    currentPaths = typeof updater === 'function' ? (updater as (prev: AnyPath[]) => AnyPath[])(currentPaths) : updater;
  };

  const setSelectedPathIds: Dispatch<SetStateAction<string[]>> = updater => {
    currentSelectedIds = typeof updater === 'function' ? (updater as (prev: string[]) => string[])(currentSelectedIds) : updater;
  };

  const render = (props: HookProps) =>
    renderHook(
      ({ paths, selectedPathIds }: HookProps) =>
        useToolbarState(paths, selectedPathIds, setPaths, setSelectedPathIds, beginCoalescing, endCoalescing),
      { initialProps: props }
    );

  const setterMocks = [
    drawingColorSetter,
    drawingFillSetter,
    drawingFillGradientSetter,
    drawingFillStyleSetter,
    drawingStrokeWidthSetter,
    drawingOpacitySetter,
    drawingSidesSetter,
    drawingBorderRadiusSetter,
    drawingStrokeLineDashSetter,
    drawingStrokeLineCapStartSetter,
    drawingStrokeLineCapEndSetter,
    drawingEndpointSizeSetter,
    drawingEndpointFillSetter,
    drawingIsRoughSetter,
    drawingRoughnessSetter,
    drawingBowingSetter,
    drawingFillWeightSetter,
    drawingHachureAngleSetter,
    drawingHachureGapSetter,
    drawingCurveTightnessSetter,
    drawingCurveStepCountSetter,
    drawingPreserveVerticesSetter,
    drawingDisableMultiStrokeSetter,
    drawingDisableMultiStrokeFillSetter,
    drawingTextSetter,
    drawingFontFamilySetter,
    drawingFontSizeSetter,
    drawingTextAlignSetter,
    drawingBlurSetter,
    drawingShadowEnabledSetter,
    drawingShadowOffsetXSetter,
    drawingShadowOffsetYSetter,
    drawingShadowBlurSetter,
    drawingShadowColorSetter,
  ];

  beforeEach(() => {
    currentPaths = [];
    currentSelectedIds = [];
    currentTool = 'brush';
    currentSelectionMode = 'move';
    measureTextMock.mockReset();
    measureTextMock.mockReturnValue({ width: 80, height: 40 });
    setterMocks.forEach(mock => mock.mockReset());
    setToolMock.mockReset();
    setSelectionModeMock.mockReset();
    useToolManagementMock.mockClear();
    usePathActionsMock.mockClear();
    pathActions.beginSimplify.mockClear();
    pathActions.setSimplify.mockClear();
    pathActions.endSimplify.mockClear();
  });

  it('updates selected paths when setting color and enforces minimum stroke width', () => {
    currentPaths = [structuredClone(rectangleBase)];
    currentSelectedIds = ['rect-1'];
    const { result, rerender } = render({ paths: currentPaths, selectedPathIds: currentSelectedIds });

    act(() => {
      result.current.setColor('#FF0000');
    });

    rerender({ paths: currentPaths, selectedPathIds: currentSelectedIds });

    const updated = currentPaths[0] as RectangleData;
    expect(updated.color).toBe('#FF0000');
    expect(updated.strokeWidth).toBe(1);
    expect(drawingColorSetter).not.toHaveBeenCalled();
    expect(drawingStrokeWidthSetter).not.toHaveBeenCalled();
    expect(result.current.color).toBe('#FF0000');
  });

  it('falls back to drawing defaults when no path is selected', () => {
    currentPaths = [structuredClone(rectangleBase)];
    currentSelectedIds = [];
    currentTool = 'brush';
    const { result } = render({ paths: currentPaths, selectedPathIds: currentSelectedIds });

    act(() => {
      result.current.setColor('#00FF88');
    });

    expect(drawingColorSetter).toHaveBeenCalledWith('#00FF88');
    expect(drawingStrokeWidthSetter).toHaveBeenCalledWith(1);
  });

  it('updates text geometry using measureText for selected text paths', () => {
    currentPaths = [structuredClone(textBase)];
    currentSelectedIds = ['text-1'];
    measureTextMock.mockReturnValueOnce({ width: 120, height: 60 });
    const { result, rerender } = render({ paths: currentPaths, selectedPathIds: currentSelectedIds });

    act(() => {
      result.current.setText('new content');
    });

    rerender({ paths: currentPaths, selectedPathIds: currentSelectedIds });

    const updated = currentPaths[0] as TextData;
    expect(updated.text).toBe('new content');
    expect(updated.width).toBe(120);
    expect(updated.height).toBe(60);
    expect(measureTextMock).toHaveBeenCalledWith('new content', textBase.fontSize, textBase.fontFamily);
    expect(drawingTextSetter).not.toHaveBeenCalled();
  });

  it('resets drawing defaults and tool state', () => {
    currentPaths = [];
    currentSelectedIds = [];
    currentTool = 'selection';
    const { result } = render({ paths: currentPaths, selectedPathIds: currentSelectedIds });

    act(() => {
      result.current.resetState();
    });

    expect(drawingColorSetter).toHaveBeenCalledWith(COLORS[0]);
    expect(drawingFillSetter).toHaveBeenCalledWith('transparent');
    expect(drawingFillStyleSetter).toHaveBeenCalledWith('hachure');
    expect(drawingStrokeWidthSetter).toHaveBeenCalledWith(8);
    expect(drawingOpacitySetter).toHaveBeenCalledWith(1);
    expect(drawingSidesSetter).toHaveBeenCalledWith(6);
    expect(drawingBorderRadiusSetter).toHaveBeenCalledWith(0);
    expect(drawingStrokeLineDashSetter).toHaveBeenCalledWith(undefined);
    expect(drawingStrokeLineCapStartSetter).toHaveBeenCalledWith('round');
    expect(drawingStrokeLineCapEndSetter).toHaveBeenCalledWith('round');
    expect(drawingEndpointSizeSetter).toHaveBeenCalledWith(1);
    expect(drawingEndpointFillSetter).toHaveBeenCalledWith('hollow');
    expect(drawingIsRoughSetter).toHaveBeenCalledWith(true);
    expect(drawingRoughnessSetter).toHaveBeenCalledWith(DEFAULT_ROUGHNESS);
    expect(drawingBowingSetter).toHaveBeenCalledWith(DEFAULT_BOWING);
    expect(drawingFillWeightSetter).toHaveBeenCalledWith(DEFAULT_FILL_WEIGHT);
    expect(drawingHachureAngleSetter).toHaveBeenCalledWith(DEFAULT_HACHURE_ANGLE);
    expect(drawingHachureGapSetter).toHaveBeenCalledWith(DEFAULT_HACHURE_GAP);
    expect(drawingCurveTightnessSetter).toHaveBeenCalledWith(DEFAULT_CURVE_TIGHTNESS);
    expect(drawingCurveStepCountSetter).toHaveBeenCalledWith(DEFAULT_CURVE_STEP_COUNT);
    expect(drawingPreserveVerticesSetter).toHaveBeenCalledWith(DEFAULT_PRESERVE_VERTICES);
    expect(drawingDisableMultiStrokeSetter).toHaveBeenCalledWith(DEFAULT_DISABLE_MULTI_STROKE);
    expect(drawingDisableMultiStrokeFillSetter).toHaveBeenCalledWith(DEFAULT_DISABLE_MULTI_STROKE_FILL);
    expect(drawingTextSetter).toHaveBeenCalledWith('');
    expect(drawingFontFamilySetter).toHaveBeenCalledWith('Excalifont');
    expect(drawingFontSizeSetter).toHaveBeenCalledWith(24);
    expect(drawingTextAlignSetter).toHaveBeenCalledWith('left');
    expect(drawingBlurSetter).toHaveBeenCalledWith(0);
    expect(drawingShadowEnabledSetter).toHaveBeenCalledWith(false);
    expect(drawingShadowOffsetXSetter).toHaveBeenCalledWith(2);
    expect(drawingShadowOffsetYSetter).toHaveBeenCalledWith(2);
    expect(drawingShadowBlurSetter).toHaveBeenCalledWith(4);
    expect(drawingShadowColorSetter).toHaveBeenCalledWith('rgba(0,0,0,0.5)');
    expect(setToolMock).toHaveBeenCalledWith('brush');
  });
});
