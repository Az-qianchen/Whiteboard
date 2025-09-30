import { useMemo, useCallback } from 'react';
import type { AnyPath, ImageData, RectangleData, PolygonData, GroupData, VectorPathData, GradientFill } from '../types';
import { useToolManagement } from './toolbar-state/useToolManagement';
import { usePathActions } from './toolbar-state/usePathActions';
import * as P from './toolbar-state/property-hooks';
import { COLORS, DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_CURVE_TIGHTNESS, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_STEP_COUNT, DEFAULT_PRESERVE_VERTICES, DEFAULT_DISABLE_MULTI_STROKE, DEFAULT_DISABLE_MULTI_STROKE_FILL } from '../constants';
import { updateGradientStopColor } from '@/lib/gradient';

/**
 * 自定义钩子，用于管理所有与工具栏相关的状态。
 * 这个重构后的版本作为一个协调器，组合了多个更小的、功能独立的 Hooks。
 * @param paths - 当前所有路径的数组。
 * @param selectedPathIds - 当前选中的路径ID数组。
 * @param setPaths - 更新路径数组的函数。
 * @param setSelectedPathIds - 更新所选路径ID数组的函数。
 * @param beginCoalescing - 开始合并历史记录操作。
 * @param endCoalescing - 结束合并历史记录操作。
 * @returns 返回一个包含所有工具栏状态和设置函数的对象。
 */
export const useToolbarState = (
  paths: AnyPath[], 
  selectedPathIds: string[], 
  setPaths: React.Dispatch<React.SetStateAction<AnyPath[]>>,
  setSelectedPathIds: React.Dispatch<React.SetStateAction<string[]>>,
  beginCoalescing: () => void,
  endCoalescing: () => void
) => {
  const { tool, setTool, selectionMode, setSelectionMode } = useToolManagement(setSelectedPathIds);

  // --- 状态 Hooks ---
  const { drawingColor, setDrawingColor } = P.useDrawingColor();
  const { drawingFill, setDrawingFill } = P.useDrawingFill();
  const { drawingFillGradient, setDrawingFillGradient } = P.useDrawingFillGradient();
  const { drawingFillStyle, setDrawingFillStyle } = P.useDrawingFillStyle();
  const { drawingStrokeWidth, setDrawingStrokeWidth } = P.useDrawingStrokeWidth();
  const { drawingOpacity, setDrawingOpacity } = P.useDrawingOpacity();
  const { drawingFontFamily, setDrawingFontFamily } = P.useDrawingFontFamily();
  const { drawingFontSize, setDrawingFontSize } = P.useDrawingFontSize();
  const { drawingTextAlign, setDrawingTextAlign } = P.useDrawingTextAlign();
  const { drawingLineHeight, setDrawingLineHeight } = P.useDrawingLineHeight();
  const { drawingSides, setDrawingSides } = P.useDrawingSides();
  const { drawingBorderRadius, setDrawingBorderRadius } = P.useDrawingBorderRadius();
  const { drawingStrokeLineDash, setDrawingStrokeLineDash } = P.useDrawingStrokeLineDash();
  const { drawingStrokeLineCapStart, setDrawingStrokeLineCapStart } = P.useDrawingStrokeLineCapStart();
  const { drawingStrokeLineCapEnd, setDrawingStrokeLineCapEnd } = P.useDrawingStrokeLineCapEnd();
  const { drawingEndpointSize, setDrawingEndpointSize } = P.useDrawingEndpointSize();
  const { drawingEndpointFill, setDrawingEndpointFill } = P.useDrawingEndpointFill();
  const { drawingIsRough, setDrawingIsRough } = P.useDrawingIsRough();
  const { drawingRoughness, setDrawingRoughness } = P.useDrawingRoughness();
  const { drawingBowing, setDrawingBowing } = P.useDrawingBowing();
  const { drawingFillWeight, setDrawingFillWeight } = P.useDrawingFillWeight();
  const { drawingHachureAngle, setDrawingHachureAngle } = P.useDrawingHachureAngle();
  const { drawingHachureGap, setDrawingHachureGap } = P.useDrawingHachureGap();
  const { drawingCurveTightness, setDrawingCurveTightness } = P.useDrawingCurveTightness();
  const { drawingCurveStepCount, setDrawingCurveStepCount } = P.useDrawingCurveStepCount();
  const { drawingPreserveVertices, setDrawingPreserveVertices } = P.useDrawingPreserveVertices();
  const { drawingDisableMultiStroke, setDrawingDisableMultiStroke } = P.useDrawingDisableMultiStroke();
  const { drawingDisableMultiStrokeFill, setDrawingDisableMultiStrokeFill } = P.useDrawingDisableMultiStrokeFill();
  const { drawingBlur, setDrawingBlur } = P.useDrawingBlur();
  const { drawingShadowEnabled, setDrawingShadowEnabled } = P.useDrawingShadowEnabled();
  const { drawingShadowOffsetX, setDrawingShadowOffsetX } = P.useDrawingShadowOffsetX();
  const { drawingShadowOffsetY, setDrawingShadowOffsetY } = P.useDrawingShadowOffsetY();
  const { drawingShadowBlur, setDrawingShadowBlur } = P.useDrawingShadowBlur();
  const { drawingShadowColor, setDrawingShadowColor } = P.useDrawingShadowColor();

  const pathActions = usePathActions({ paths, selectedPathIds, setPaths, beginCoalescing, endCoalescing });

  const selectedPaths = useMemo(() => {
    if (selectedPathIds.length === 0) return [];
    return paths.filter(p => selectedPathIds.includes(p.id));
  }, [paths, selectedPathIds]);

  const firstSelectedPath = selectedPaths[0] || null;

  const updateSelectedPaths = (updater: (path: AnyPath) => Partial<AnyPath>) => {
    if (selectedPathIds.length === 0) return;
    
    const applyRecursiveUpdate = (path: AnyPath, propsToUpdate: Partial<AnyPath>): AnyPath => {
      let finalProps = { ...propsToUpdate };
      // Prevent applying non-applicable props to certain shapes
      if (path.tool !== 'rectangle' && path.tool !== 'image' && path.tool !== 'polygon') {
          delete (finalProps as any).borderRadius;
      }
      if (path.tool !== 'polygon') {
          delete (finalProps as any).sides;
      }
      if (path.tool === 'group') {
          const updatedChildren = path.children.map(child => applyRecursiveUpdate(child, propsToUpdate));
          return { ...path, ...finalProps, tool: 'group', children: updatedChildren };
      }
      
      // Cast the return type to AnyPath to avoid union type widening from the spread operator.
      return { ...path, ...finalProps } as AnyPath;
    };

    setPaths(prevPaths =>
      prevPaths.map(p => {
        if (selectedPathIds.includes(p.id)) {
          const updatedProps = updater(p);
          return applyRecursiveUpdate(p, updatedProps);
        }
        return p;
      })
    );
  };
  
  // --- Setter Functions ---
  
  const setColor = (newColor: string) => {
    if (firstSelectedPath) {
        updateSelectedPaths(p => {
            const updates: Partial<AnyPath> = { color: newColor };
            if (p.strokeWidth === 0) {
                updates.strokeWidth = 1;
            }
            return updates;
        });
    } else {
        setDrawingColor(newColor);
        if (drawingStrokeWidth === 0) {
            setDrawingStrokeWidth(1);
        }
    }
  };

  const simpleSetter = <T, K extends keyof AnyPath>(propName: K, setDrawingProp: (val: T) => void) => {
    return (newValue: T) => {
      if (firstSelectedPath) updateSelectedPaths(() => ({ [propName]: newValue }));
      else setDrawingProp(newValue);
    };
  };

  const setFill = (newValue: string) => {
    if (firstSelectedPath) {
      updateSelectedPaths((path) => {
        const updates: Partial<AnyPath> = { fill: newValue };
        if (path.fillGradient) {
          updates.fillGradient = updateGradientStopColor(path.fillGradient, 0, newValue);
        }
        return updates;
      });
    } else {
      setDrawingFill(newValue);
      if (drawingFillGradient) {
        setDrawingFillGradient(updateGradientStopColor(drawingFillGradient, 0, newValue));
      }
    }
  };

  const setFillGradient = (gradient: GradientFill | null) => {
    if (firstSelectedPath) {
      updateSelectedPaths(() => {
        const updates: Partial<AnyPath> = { fillGradient: gradient };
        if (gradient && gradient.stops.length > 0) {
          updates.fill = gradient.stops[0].color;
        }
        return updates;
      });
    } else {
      setDrawingFillGradient(gradient);
      if (gradient && gradient.stops.length > 0) {
        setDrawingFill(gradient.stops[0].color);
      }
    }
  };
  const setFontFamily = (newFamily: string) => {
    if (selectedPathIds.length > 0) {
      updateSelectedPaths((path) => (path.tool === 'text' ? { fontFamily: newFamily } : {}));
    } else {
      setDrawingFontFamily(newFamily);
    }
  };
  const setFontSize = (newSize: number) => {
    const clamped = Math.max(1, Math.round(newSize));
    if (selectedPathIds.length > 0) {
      updateSelectedPaths((path) => (path.tool === 'text' ? { fontSize: clamped } : {}));
    } else {
      setDrawingFontSize(clamped);
    }
  };
  const setTextAlign = (align: 'left' | 'center' | 'right') => {
    if (selectedPathIds.length > 0) {
      updateSelectedPaths((path) => (path.tool === 'text' ? { textAlign: align } : {}));
    } else {
      setDrawingTextAlign(align);
    }
  };
  const setLineHeight = (newLineHeight: number) => {
    const clamped = Math.max(1, Math.round(newLineHeight));
    if (selectedPathIds.length > 0) {
      updateSelectedPaths((path) => (path.tool === 'text' ? { lineHeight: clamped } : {}));
    } else {
      setDrawingLineHeight(clamped);
    }
  };
  const setFillStyle = simpleSetter('fillStyle', setDrawingFillStyle);
  const setStrokeWidth = simpleSetter('strokeWidth', setDrawingStrokeWidth);
  const setStrokeLineDash = simpleSetter('strokeLineDash', setDrawingStrokeLineDash);
  const setStrokeLineCapStart = simpleSetter('strokeLineCapStart', setDrawingStrokeLineCapStart);
  const setStrokeLineCapEnd = simpleSetter('strokeLineCapEnd', setDrawingStrokeLineCapEnd);
  const setEndpointSize = simpleSetter('endpointSize', setDrawingEndpointSize);
  const setEndpointFill = simpleSetter('endpointFill', setDrawingEndpointFill);
  const setIsRough = simpleSetter('isRough', setDrawingIsRough);
  const setRoughness = simpleSetter('roughness', setDrawingRoughness);
  const setBowing = simpleSetter('bowing', setDrawingBowing);
  const setFillWeight = simpleSetter('fillWeight', setDrawingFillWeight);
  const setHachureAngle = simpleSetter('hachureAngle', setDrawingHachureAngle);
  const setHachureGap = simpleSetter('hachureGap', setDrawingHachureGap);
  const setCurveTightness = simpleSetter('curveTightness', setDrawingCurveTightness);
  const setCurveStepCount = simpleSetter('curveStepCount', setDrawingCurveStepCount);
  const setOpacity = simpleSetter('opacity', setDrawingOpacity);
  const setPreserveVertices = simpleSetter('preserveVertices', setDrawingPreserveVertices);
  const setDisableMultiStroke = simpleSetter('disableMultiStroke', setDrawingDisableMultiStroke);
  const setDisableMultiStrokeFill = simpleSetter('disableMultiStrokeFill', setDrawingDisableMultiStrokeFill);
  const setBlur = simpleSetter('blur', setDrawingBlur);
  const setShadowEnabled = simpleSetter('shadowEnabled', setDrawingShadowEnabled);
  const setShadowOffsetX = simpleSetter('shadowOffsetX', setDrawingShadowOffsetX);
  const setShadowOffsetY = simpleSetter('shadowOffsetY', setDrawingShadowOffsetY);
  const setShadowBlur = simpleSetter('shadowBlur', setDrawingShadowBlur);
  const setShadowColor = simpleSetter('shadowColor', setDrawingShadowColor);

  const setSides = (newSides: number) => {
    if (firstSelectedPath && firstSelectedPath.tool === 'polygon') {
      updateSelectedPaths(() => ({ sides: Math.max(3, newSides) }));
    } else {
      setDrawingSides(Math.max(3, newSides));
    }
  };

  const setBorderRadius = (newRadius: number) => {
    if (selectedPaths.some(p => p.tool === 'rectangle' || p.tool === 'image' || p.tool === 'polygon')) {
      updateSelectedPaths(() => ({ borderRadius: Math.max(0, newRadius) }));
    } else {
      setDrawingBorderRadius(Math.max(0, newRadius));
    }
  };

  // --- Display Values ---
  const displayValue = <T,>(selectedProp: keyof AnyPath, drawingValue: T): T => {
    if (!firstSelectedPath) {
      return drawingValue;
    }

    const selectedValue = firstSelectedPath[selectedProp] as T | undefined;
    return selectedValue === undefined ? drawingValue : selectedValue;
  };
  
  const color = displayValue('color', drawingColor);
  const fill = displayValue('fill', drawingFill);
  const fillStyle = displayValue('fillStyle', drawingFillStyle);
  const fontFamily = displayValue('fontFamily', drawingFontFamily);
  const fontSize = displayValue('fontSize', drawingFontSize);
  const textAlign = displayValue('textAlign', drawingTextAlign);
  const lineHeight = displayValue('lineHeight', drawingLineHeight);
  const fillGradient = displayValue('fillGradient', drawingFillGradient);
  const strokeWidth = displayValue('strokeWidth', drawingStrokeWidth);
  const strokeLineDash = displayValue('strokeLineDash', drawingStrokeLineDash);
  const strokeLineCapStart = displayValue('strokeLineCapStart', drawingStrokeLineCapStart);
  const strokeLineCapEnd = displayValue('strokeLineCapEnd', drawingStrokeLineCapEnd);
  const strokeLineJoin = 'round'; // Always round
  const endpointSize = displayValue('endpointSize', drawingEndpointSize);
  const endpointFill = displayValue('endpointFill', drawingEndpointFill);
  const opacity = displayValue('opacity', drawingOpacity);
  const isRough = displayValue('isRough', drawingIsRough);
  const roughness = displayValue('roughness', drawingRoughness);
  const bowing = displayValue('bowing', drawingBowing);
  const fillWeight = displayValue('fillWeight', drawingFillWeight);
  const hachureAngle = displayValue('hachureAngle', drawingHachureAngle);
  const hachureGap = displayValue('hachureGap', drawingHachureGap);
  const curveTightness = displayValue('curveTightness', drawingCurveTightness);
  const curveStepCount = displayValue('curveStepCount', drawingCurveStepCount);
  const preserveVertices = displayValue('preserveVertices', drawingPreserveVertices);
  const disableMultiStroke = displayValue('disableMultiStroke', drawingDisableMultiStroke);
  const disableMultiStrokeFill = displayValue('disableMultiStrokeFill', drawingDisableMultiStrokeFill);
  const blur = displayValue('blur', drawingBlur);
  const shadowEnabled = displayValue('shadowEnabled', drawingShadowEnabled);
  const shadowOffsetX = displayValue('shadowOffsetX', drawingShadowOffsetX);
  const shadowOffsetY = displayValue('shadowOffsetY', drawingShadowOffsetY);
  const shadowBlur = displayValue('shadowBlur', drawingShadowBlur);
  const shadowColor = displayValue('shadowColor', drawingShadowColor);
  
  const firstSelectedRectImageOrPolygon = useMemo(() => {
    if (selectedPathIds.length !== 1) return null;
    const path = paths.find(p => p.id === selectedPathIds[0] && (p.tool === 'rectangle' || p.tool === 'image' || p.tool === 'polygon'));
    return path as (RectangleData | ImageData | PolygonData) | undefined;
  }, [paths, selectedPathIds]);

  const borderRadius = (firstSelectedRectImageOrPolygon || tool === 'rectangle' || tool === 'polygon')
    ? (firstSelectedRectImageOrPolygon?.borderRadius ?? drawingBorderRadius)
    : null;
    
  const sides = (firstSelectedPath?.tool === 'polygon' || tool === 'polygon')
    ? ((firstSelectedPath as PolygonData)?.sides ?? drawingSides)
    : null;

  const resetState = useCallback(() => {
    setDrawingColor(COLORS[0]);
    setDrawingFill('transparent');
    setDrawingFillGradient(null);
    setDrawingFillStyle('hachure');
    setDrawingStrokeWidth(8);
    setDrawingOpacity(1);
    setDrawingFontFamily('Virgil, Segoe UI, sans-serif');
    setDrawingFontSize(32);
    setDrawingTextAlign('left');
    setDrawingLineHeight(40);
    setDrawingSides(6);
    setDrawingBorderRadius(0);
    setDrawingStrokeLineDash(undefined);
    setDrawingStrokeLineCapStart('round');
    setDrawingStrokeLineCapEnd('round');
    setDrawingEndpointSize(1);
    setDrawingEndpointFill('hollow');
    setDrawingIsRough(true);
    setDrawingRoughness(DEFAULT_ROUGHNESS);
    setDrawingBowing(DEFAULT_BOWING);
    setDrawingFillWeight(DEFAULT_FILL_WEIGHT);
    setDrawingHachureAngle(DEFAULT_HACHURE_ANGLE);
    setDrawingHachureGap(DEFAULT_HACHURE_GAP);
    setDrawingCurveTightness(DEFAULT_CURVE_TIGHTNESS);
    setDrawingCurveStepCount(DEFAULT_CURVE_STEP_COUNT);
    setDrawingPreserveVertices(DEFAULT_PRESERVE_VERTICES);
    setDrawingDisableMultiStroke(DEFAULT_DISABLE_MULTI_STROKE);
    setDrawingDisableMultiStrokeFill(DEFAULT_DISABLE_MULTI_STROKE_FILL);
    setDrawingBlur(0);
    setDrawingShadowEnabled(false);
    setDrawingShadowOffsetX(2);
    setDrawingShadowOffsetY(2);
    setDrawingShadowBlur(4);
    setDrawingShadowColor('rgba(0,0,0,0.5)');
    setTool('brush');
  }, [
    setDrawingColor, setDrawingFill, setDrawingFillGradient, setDrawingFillStyle, setDrawingStrokeWidth, setDrawingOpacity,
    setDrawingFontFamily, setDrawingFontSize, setDrawingTextAlign, setDrawingLineHeight,
    setDrawingSides, setDrawingBorderRadius, setDrawingStrokeLineDash, setDrawingStrokeLineCapStart,
    setDrawingStrokeLineCapEnd, setDrawingEndpointSize, setDrawingEndpointFill, setDrawingIsRough,
    setDrawingRoughness, setDrawingBowing, setDrawingFillWeight, setDrawingHachureAngle,
    setDrawingHachureGap, setDrawingCurveTightness, setDrawingCurveStepCount, setDrawingPreserveVertices,
    setDrawingDisableMultiStroke, setDrawingDisableMultiStrokeFill, setDrawingBlur, setDrawingShadowEnabled, setDrawingShadowOffsetX,
    setDrawingShadowOffsetY, setDrawingShadowBlur, setDrawingShadowColor, setTool
  ]);

  return {
    tool, setTool,
    selectionMode, setSelectionMode,
    color, setColor,
    fill, setFill,
    fillGradient, setFillGradient,
    fillStyle, setFillStyle,
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    textAlign, setTextAlign,
    lineHeight, setLineHeight,
    strokeWidth, setStrokeWidth,
    strokeLineDash, setStrokeLineDash,
    strokeLineCapStart, setStrokeLineCapStart,
    strokeLineCapEnd, setStrokeLineCapEnd,
    strokeLineJoin,
    endpointSize, setEndpointSize,
    endpointFill, setEndpointFill,
    opacity, setOpacity,
    sides, setSides,
    borderRadius, setBorderRadius,
    isRough, setIsRough,
    roughness, setRoughness,
    bowing, setBowing,
    fillWeight, setFillWeight,
    hachureAngle, setHachureAngle,
    hachureGap, setHachureGap,
    curveTightness, setCurveTightness,
    curveStepCount, setCurveStepCount,
    preserveVertices, setPreserveVertices,
    disableMultiStroke, setDisableMultiStroke,
    disableMultiStrokeFill, setDisableMultiStrokeFill,
    blur, setBlur,
    shadowEnabled, setShadowEnabled,
    shadowOffsetX, setShadowOffsetX,
    shadowOffsetY, setShadowOffsetY,
    shadowBlur, setShadowBlur,
    shadowColor, setShadowColor,
    ...pathActions,
    firstSelectedPath,
    resetState,
  };
};

