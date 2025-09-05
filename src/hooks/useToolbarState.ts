import { useMemo } from 'react';
import type { AnyPath, ImageData, RectangleData, PolygonData, GroupData, VectorPathData, TextData } from '../types';
import { useToolManagement } from './toolbar-state/useToolManagement';
import { usePathActions } from './toolbar-state/usePathActions';
import * as P from './toolbar-state/property-hooks';
import { measureText } from '../lib/drawing';

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
  const { drawingFillStyle, setDrawingFillStyle } = P.useDrawingFillStyle();
  const { drawingStrokeWidth, setDrawingStrokeWidth } = P.useDrawingStrokeWidth();
  const { drawingOpacity, setDrawingOpacity } = P.useDrawingOpacity();
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
  const { drawingText, setDrawingText } = P.useDrawingText();
  const { drawingFontSize, setDrawingFontSize } = P.useDrawingFontSize();
  const { drawingTextAlign, setDrawingTextAlign } = P.useDrawingTextAlign();
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
      if (path.tool !== 'text') {
          delete (finalProps as any).textAlign;
          delete (finalProps as any).fontSize;
          delete (finalProps as any).fontFamily;
      }
      
      if (path.tool === 'group') {
          const updatedChildren = path.children.map(child => applyRecursiveUpdate(child, propsToUpdate));
          return { ...path, ...finalProps, tool: 'group', children: updatedChildren };
      }
      
      // FIX: Cast the return type to AnyPath to resolve a complex TypeScript inference issue
      // where the spread operator on a union type results in a type that's too wide.
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
            if (p.strokeWidth === 0 && p.tool !== 'text') {
                updates.strokeWidth = 1;
            }
            return updates;
        });
    } else {
        setDrawingColor(newColor);
        if (drawingStrokeWidth === 0 && tool !== 'text') {
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

  const setFill = simpleSetter('fill', setDrawingFill);
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

  const setText = (newText: string) => {
    if (firstSelectedPath?.tool === 'text') {
        updateSelectedPaths((p) => {
            if (p.tool === 'text') {
                const fontFamily = p.fontFamily || 'Excalifont';
                const { width, height } = measureText(newText, p.fontSize, fontFamily);
                return { text: newText, width, height, fontFamily };
            }
            return {};
        });
    } else {
        setDrawingText(newText);
    }
  };

  const setFontSize = (newSize: number) => {
    if (firstSelectedPath?.tool === 'text') {
        updateSelectedPaths((p) => {
            if (p.tool === 'text') {
                const fontFamily = p.fontFamily || 'Excalifont';
                const { width, height } = measureText(p.text, newSize, fontFamily);
                return { fontSize: newSize, width, height, fontFamily };
            }
            return {};
        });
    } else {
        setDrawingFontSize(newSize);
    }
  };

  const setTextAlign = (align: 'left' | 'center' | 'right') => {
    if (firstSelectedPath?.tool === 'text') {
      updateSelectedPaths((p) => {
        if (p.tool === 'text') {
          return { textAlign: align };
        }
        return {};
      });
    } else {
      setDrawingTextAlign(align);
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
    return firstSelectedPath ? (firstSelectedPath[selectedProp] as T ?? drawingValue) : drawingValue;
  };
  
  const color = displayValue('color', drawingColor);
  const fill = displayValue('fill', drawingFill);
  const fillStyle = displayValue('fillStyle', drawingFillStyle);
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
  
  const text = (firstSelectedPath?.tool === 'text') ? ((firstSelectedPath as TextData).text ?? drawingText) : drawingText;
  const fontSize = (firstSelectedPath?.tool === 'text') ? ((firstSelectedPath as TextData).fontSize ?? drawingFontSize) : drawingFontSize;
  const textAlign = (firstSelectedPath?.tool === 'text') ? ((firstSelectedPath as TextData).textAlign ?? drawingTextAlign) : drawingTextAlign;

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

  return {
    tool, setTool,
    selectionMode, setSelectionMode,
    color, setColor,
    fill, setFill,
    fillStyle, setFillStyle,
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
    text, setText,
    fontSize, setFontSize,
    textAlign, setTextAlign,
    ...pathActions,
    firstSelectedPath,
  };
};