
import { useState, useMemo, useEffect } from 'react';
import type { Tool, AnyPath, ImageData, SelectionMode, RectangleData, EndpointStyle } from '../types';
import { COLORS, DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_CURVE_TIGHTNESS, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_STEP_COUNT, DEFAULT_CURVE_FITTING, DEFAULT_PRESERVE_VERTICES, DEFAULT_DISABLE_MULTI_STROKE, DEFAULT_DISABLE_MULTI_STROKE_FILL, DEFAULT_SIMPLIFICATION } from '../constants';
import { getLocalStorageItem } from '../lib/utils';

/**
 * 自定义钩子，用于管理所有与工具栏相关的状态。
 * @param paths - 当前所有路径的数组。
 * @param selectedPathIds - 当前选中的路径ID数组。
 * @param setPaths - 更新路径数组的函数。
 * @param setSelectedPathIds - 更新所选路径ID数组的函数。
 */
export const useToolbarState = (
  paths: AnyPath[], 
  selectedPathIds: string[], 
  setPaths: React.Dispatch<React.SetStateAction<AnyPath[]>>,
  setSelectedPathIds: React.Dispatch<React.SetStateAction<string[]>>
) => {
  const [tool, setToolInternal] = useState<Tool>(() => getLocalStorageItem('whiteboard_tool', 'brush'));
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('move');
  
  // 用于绘制新路径的属性
  const [drawingColor, setDrawingColor] = useState<string>(() => getLocalStorageItem('whiteboard_drawingColor', COLORS[0]));
  const [drawingFill, setDrawingFill] = useState<string>(() => getLocalStorageItem('whiteboard_drawingFill', 'transparent'));
  const [drawingFillStyle, setDrawingFillStyle] = useState<string>(() => getLocalStorageItem('whiteboard_drawingFillStyle', 'hachure'));
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState<number>(() => getLocalStorageItem('whiteboard_drawingStrokeWidth', 8));
  const [drawingOpacity, setDrawingOpacity] = useState<number>(() => getLocalStorageItem('whiteboard_drawingOpacity', 1));
  const [drawingBorderRadius, setDrawingBorderRadius] = useState<number>(() => getLocalStorageItem('whiteboard_drawingBorderRadius', 0));
  const [drawingStrokeLineDash, setDrawingStrokeLineDash] = useState<[number, number] | undefined>(() => getLocalStorageItem('whiteboard_drawingStrokeLineDash', undefined));
  const [drawingStrokeLineCapStart, setDrawingStrokeLineCapStart] = useState<EndpointStyle>(() => getLocalStorageItem('whiteboard_drawingStrokeLineCapStart', 'round'));
  const [drawingStrokeLineCapEnd, setDrawingStrokeLineCapEnd] = useState<EndpointStyle>(() => getLocalStorageItem('whiteboard_drawingStrokeLineCapEnd', 'round'));
  const [drawingStrokeLineJoin, setDrawingStrokeLineJoin] = useState<'miter' | 'round' | 'bevel'>(() => getLocalStorageItem('whiteboard_drawingStrokeLineJoin', 'round'));
  const [drawingEndpointSize, setDrawingEndpointSize] = useState<number>(() => getLocalStorageItem('whiteboard_drawingEndpointSize', 1));
  const [drawingEndpointFill, setDrawingEndpointFill] = useState<'solid' | 'hollow'>(() => getLocalStorageItem('whiteboard_drawingEndpointFill', 'hollow'));
  
  // RoughJS 属性
  const [drawingRoughness, setDrawingRoughness] = useState<number>(() => getLocalStorageItem('whiteboard_drawingRoughness', DEFAULT_ROUGHNESS));
  const [drawingBowing, setDrawingBowing] = useState<number>(() => getLocalStorageItem('whiteboard_drawingBowing', DEFAULT_BOWING));
  const [drawingFillWeight, setDrawingFillWeight] = useState<number>(() => getLocalStorageItem('whiteboard_drawingFillWeight', DEFAULT_FILL_WEIGHT));
  const [drawingHachureAngle, setDrawingHachureAngle] = useState<number>(() => getLocalStorageItem('whiteboard_drawingHachureAngle', DEFAULT_HACHURE_ANGLE));
  const [drawingHachureGap, setDrawingHachureGap] = useState<number>(() => getLocalStorageItem('whiteboard_drawingHachureGap', DEFAULT_HACHURE_GAP));
  const [drawingCurveTightness, setDrawingCurveTightness] = useState<number>(() => getLocalStorageItem('whiteboard_drawingCurveTightness', DEFAULT_CURVE_TIGHTNESS));
  const [drawingCurveStepCount, setDrawingCurveStepCount] = useState<number>(() => getLocalStorageItem('whiteboard_drawingCurveStepCount', DEFAULT_CURVE_STEP_COUNT));
  const [drawingCurveFitting, setDrawingCurveFitting] = useState<number>(() => getLocalStorageItem('whiteboard_drawingCurveFitting', DEFAULT_CURVE_FITTING));
  const [drawingPreserveVertices, setDrawingPreserveVertices] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingPreserveVertices', DEFAULT_PRESERVE_VERTICES));
  const [drawingDisableMultiStroke, setDrawingDisableMultiStroke] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingDisableMultiStroke', DEFAULT_DISABLE_MULTI_STROKE));
  const [drawingDisableMultiStrokeFill, setDrawingDisableMultiStrokeFill] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingDisableMultiStrokeFill', DEFAULT_DISABLE_MULTI_STROKE_FILL));
  const [drawingSimplification, setDrawingSimplification] = useState<number>(() => getLocalStorageItem('whiteboard_drawingSimplification', DEFAULT_SIMPLIFICATION));

  useEffect(() => { localStorage.setItem('whiteboard_tool', JSON.stringify(tool)); }, [tool]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingColor', JSON.stringify(drawingColor)); }, [drawingColor]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingFill', JSON.stringify(drawingFill)); }, [drawingFill]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingFillStyle', JSON.stringify(drawingFillStyle)); }, [drawingFillStyle]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeWidth', JSON.stringify(drawingStrokeWidth)); }, [drawingStrokeWidth]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingOpacity', JSON.stringify(drawingOpacity)); }, [drawingOpacity]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingBorderRadius', JSON.stringify(drawingBorderRadius)); }, [drawingBorderRadius]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineDash', JSON.stringify(drawingStrokeLineDash)); }, [drawingStrokeLineDash]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineCapStart', JSON.stringify(drawingStrokeLineCapStart)); }, [drawingStrokeLineCapStart]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineCapEnd', JSON.stringify(drawingStrokeLineCapEnd)); }, [drawingStrokeLineCapEnd]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineJoin', JSON.stringify(drawingStrokeLineJoin)); }, [drawingStrokeLineJoin]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingEndpointSize', JSON.stringify(drawingEndpointSize)); }, [drawingEndpointSize]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingEndpointFill', JSON.stringify(drawingEndpointFill)); }, [drawingEndpointFill]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingRoughness', JSON.stringify(drawingRoughness)); }, [drawingRoughness]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingBowing', JSON.stringify(drawingBowing)); }, [drawingBowing]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingFillWeight', JSON.stringify(drawingFillWeight)); }, [drawingFillWeight]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingHachureAngle', JSON.stringify(drawingHachureAngle)); }, [drawingHachureAngle]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingHachureGap', JSON.stringify(drawingHachureGap)); }, [drawingHachureGap]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingCurveTightness', JSON.stringify(drawingCurveTightness)); }, [drawingCurveTightness]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingCurveStepCount', JSON.stringify(drawingCurveStepCount)); }, [drawingCurveStepCount]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingCurveFitting', JSON.stringify(drawingCurveFitting)); }, [drawingCurveFitting]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingPreserveVertices', JSON.stringify(drawingPreserveVertices)); }, [drawingPreserveVertices]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingDisableMultiStroke', JSON.stringify(drawingDisableMultiStroke)); }, [drawingDisableMultiStroke]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingDisableMultiStrokeFill', JSON.stringify(drawingDisableMultiStrokeFill)); }, [drawingDisableMultiStrokeFill]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingSimplification', JSON.stringify(drawingSimplification)); }, [drawingSimplification]);


  const selectedPaths = useMemo(() => {
    // We check selectedPathIds instead of tool, so the sidebar can show properties
    // even if the tool is not 'selection', as long as something is selected.
    if (selectedPathIds.length === 0) return [];
    return paths.filter(p => selectedPathIds.includes(p.id));
  }, [paths, selectedPathIds]);

  const firstSelectedPath = selectedPaths[0] || null;

  // Effect to adopt the style of a selected object as the new drawing default.
  useEffect(() => {
    if (firstSelectedPath) {
      setDrawingColor(firstSelectedPath.color);
      setDrawingFill(firstSelectedPath.fill ?? 'transparent');
      setDrawingFillStyle(firstSelectedPath.fillStyle ?? 'hachure');
      setDrawingStrokeWidth(firstSelectedPath.strokeWidth);
      setDrawingOpacity(firstSelectedPath.opacity ?? 1);
      if (firstSelectedPath.tool === 'rectangle' || firstSelectedPath.tool === 'image') {
        setDrawingBorderRadius((firstSelectedPath as RectangleData | ImageData).borderRadius ?? 0);
      }
      setDrawingStrokeLineDash(firstSelectedPath.strokeLineDash ?? undefined);
      setDrawingStrokeLineCapStart(firstSelectedPath.strokeLineCapStart ?? 'round');
      setDrawingStrokeLineCapEnd(firstSelectedPath.strokeLineCapEnd ?? 'round');
      setDrawingStrokeLineJoin(firstSelectedPath.strokeLineJoin ?? 'round');
      setDrawingEndpointSize(firstSelectedPath.endpointSize ?? 1);
      setDrawingEndpointFill(firstSelectedPath.endpointFill ?? 'hollow');
      setDrawingRoughness(firstSelectedPath.roughness ?? DEFAULT_ROUGHNESS);
      setDrawingBowing(firstSelectedPath.bowing ?? DEFAULT_BOWING);
      setDrawingFillWeight(firstSelectedPath.fillWeight ?? DEFAULT_FILL_WEIGHT);
      setDrawingHachureAngle(firstSelectedPath.hachureAngle ?? DEFAULT_HACHURE_ANGLE);
      setDrawingHachureGap(firstSelectedPath.hachureGap ?? DEFAULT_HACHURE_GAP);
      setDrawingCurveTightness(firstSelectedPath.curveTightness ?? DEFAULT_CURVE_TIGHTNESS);
      setDrawingCurveStepCount(firstSelectedPath.curveStepCount ?? DEFAULT_CURVE_STEP_COUNT);
      setDrawingCurveFitting(firstSelectedPath.curveFitting ?? DEFAULT_CURVE_FITTING);
      setDrawingPreserveVertices(firstSelectedPath.preserveVertices ?? DEFAULT_PRESERVE_VERTICES);
      setDrawingDisableMultiStroke(firstSelectedPath.disableMultiStroke ?? DEFAULT_DISABLE_MULTI_STROKE);
      setDrawingDisableMultiStrokeFill(firstSelectedPath.disableMultiStrokeFill ?? DEFAULT_DISABLE_MULTI_STROKE_FILL);
      setDrawingSimplification(firstSelectedPath.simplification ?? DEFAULT_SIMPLIFICATION);
    }
  }, [firstSelectedPath]);


  const updateSelectedPaths = (updater: (path: AnyPath) => Partial<AnyPath>) => {
    if (selectedPathIds.length === 0) return;
    
    setPaths(prevPaths =>
      prevPaths.map(p => {
        if (selectedPathIds.includes(p.id)) {
          // 获取当前在工具栏中显示的所有属性。
          // 这确保了当用户编辑一个旧图形时，任何缺失的现代属性
          // (如 curveStepCount) 都会以当前工具栏的设置为准被添加进去。
          const currentToolbarProps = {
            color,
            fill,
            fillStyle,
            strokeWidth,
            strokeLineDash,
            strokeLineCapStart,
            strokeLineCapEnd,
            strokeLineJoin,
            endpointSize,
            endpointFill,
            opacity,
            roughness,
            bowing,
            fillWeight,
            hachureAngle,
            hachureGap,
            curveTightness,
            curveStepCount,
            curveFitting,
            preserveVertices,
            disableMultiStroke,
            disableMultiStrokeFill,
            simplification,
          };
          const updatedProps = updater(p);

          // Spread 顺序很重要:
          // 1. 从路径 p 本身开始
          // 2. 使用当前工具栏的值覆盖，以 "升级" 缺失的属性
          // 3. 使用 updater 返回的特定更新覆盖
          return { ...p, ...currentToolbarProps, ...updatedProps } as AnyPath;
        }
        return p;
      })
    );
  };
  
  // --- Setter Functions ---
  
  const setColor = (newColor: string) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ color: newColor }));
    else setDrawingColor(newColor);
  };

  const setFill = (newFill: string) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ fill: newFill }));
    else setDrawingFill(newFill);
  };

  const setFillStyle = (newFillStyle: string) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ fillStyle: newFillStyle }));
    else setDrawingFillStyle(newFillStyle);
  };

  const setStrokeWidth = (newWidth: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ strokeWidth: newWidth }));
    else setDrawingStrokeWidth(newWidth);
  };

  const setStrokeLineDash = (newDash: [number, number] | undefined) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ strokeLineDash: newDash }));
    else setDrawingStrokeLineDash(newDash);
  };

  const setStrokeLineCapStart = (newCap: EndpointStyle) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ strokeLineCapStart: newCap }));
    else setDrawingStrokeLineCapStart(newCap);
  };

  const setStrokeLineCapEnd = (newCap: EndpointStyle) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ strokeLineCapEnd: newCap }));
    else setDrawingStrokeLineCapEnd(newCap);
  };

  const setStrokeLineJoin = (newJoin: 'miter' | 'round' | 'bevel') => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ strokeLineJoin: newJoin }));
    else setDrawingStrokeLineJoin(newJoin);
  };

  const setEndpointSize = (newSize: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ endpointSize: newSize }));
    else setDrawingEndpointSize(newSize);
  };
  
  const setEndpointFill = (newFill: 'solid' | 'hollow') => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ endpointFill: newFill }));
    else setDrawingEndpointFill(newFill);
  };

  const setRoughness = (val: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ roughness: val }));
    else setDrawingRoughness(val);
  };

  const setBowing = (val: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ bowing: val }));
    else setDrawingBowing(val);
  };
  
  const setFillWeight = (val: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ fillWeight: val }));
    else setDrawingFillWeight(val);
  };
  
  const setHachureAngle = (val: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ hachureAngle: val }));
    else setDrawingHachureAngle(val);
  };
  
  const setHachureGap = (val: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ hachureGap: val }));
    else setDrawingHachureGap(val);
  };
  
  const setCurveTightness = (val: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ curveTightness: val }));
    else setDrawingCurveTightness(val);
  };

  const setCurveStepCount = (val: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ curveStepCount: val }));
    else setDrawingCurveStepCount(val);
  };

  const setCurveFitting = (val: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ curveFitting: val }));
    else setDrawingCurveFitting(val);
  };
  
  const setOpacity = (newOpacity: number) => {
    if (firstSelectedPath) {
      updateSelectedPaths(() => ({ opacity: newOpacity }));
    } else {
      setDrawingOpacity(newOpacity);
    }
  };

  const setPreserveVertices = (val: boolean) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ preserveVertices: val }));
    else setDrawingPreserveVertices(val);
  };

  const setDisableMultiStroke = (val: boolean) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ disableMultiStroke: val }));
    else setDrawingDisableMultiStroke(val);
  };

  const setDisableMultiStrokeFill = (val: boolean) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ disableMultiStrokeFill: val }));
    else setDrawingDisableMultiStrokeFill(val);
  };

  const setSimplification = (val: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ simplification: val }));
    else setDrawingSimplification(val);
  };


  // --- Rectangle/Image Border Radius Logic ---
  const selectedRectsAndImages = useMemo(() => {
    if (selectedPathIds.length === 0) return [];
    return paths.filter(p => selectedPathIds.includes(p.id) && (p.tool === 'rectangle' || p.tool === 'image')) as (RectangleData | ImageData)[];
  }, [paths, selectedPathIds]);
  const firstSelectedRectOrImage = selectedRectsAndImages[0] || null;
  const setBorderRadius = (newRadius: number) => {
    if (selectedRectsAndImages.length > 0) {
      updateSelectedPaths(() => ({ borderRadius: Math.max(0, newRadius) }));
    } else {
      setDrawingBorderRadius(Math.max(0, newRadius));
    }
  };
  const borderRadius = (firstSelectedRectOrImage || tool === 'rectangle')
    ? (firstSelectedRectOrImage?.borderRadius ?? drawingBorderRadius)
    : null;

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
  const strokeLineJoin = displayValue('strokeLineJoin', drawingStrokeLineJoin);
  const endpointSize = displayValue('endpointSize', drawingEndpointSize);
  const endpointFill = displayValue('endpointFill', drawingEndpointFill);
  const opacity = displayValue('opacity', drawingOpacity);
  const roughness = displayValue('roughness', drawingRoughness);
  const bowing = displayValue('bowing', drawingBowing);
  const fillWeight = displayValue('fillWeight', drawingFillWeight);
  const hachureAngle = displayValue('hachureAngle', drawingHachureAngle);
  const hachureGap = displayValue('hachureGap', drawingHachureGap);
  const curveTightness = displayValue('curveTightness', drawingCurveTightness);
  const curveStepCount = displayValue('curveStepCount', drawingCurveStepCount);
  const curveFitting = displayValue('curveFitting', drawingCurveFitting);
  const preserveVertices = displayValue('preserveVertices', drawingPreserveVertices);
  const disableMultiStroke = displayValue('disableMultiStroke', drawingDisableMultiStroke);
  const disableMultiStrokeFill = displayValue('disableMultiStrokeFill', drawingDisableMultiStrokeFill);
  const simplification = displayValue('simplification', drawingSimplification);
  
  const setTool = (newTool: Tool) => {
    if (newTool === tool) return;

    // When switching to a non-selection tool, clear the selection.
    if (newTool !== 'selection' && selectedPathIds.length > 0) {
      setSelectedPathIds([]);
    }
    
    setToolInternal(newTool);
  };

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
    firstSelectedPath,
  };
};