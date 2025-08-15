
import { useState, useMemo, useEffect } from 'react';
import type { Tool, AnyPath } from '../types';
import { COLORS, DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_CURVE_TIGHTNESS, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_STEP_COUNT } from '../constants';

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
  const [tool, setToolInternal] = useState<Tool>('brush');
  
  // 用于绘制新路径的属性
  const [drawingColor, setDrawingColor] = useState<string>(COLORS[0]);
  const [drawingFill, setDrawingFill] = useState<string>('transparent');
  const [drawingFillStyle, setDrawingFillStyle] = useState<string>('hachure');
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState<number>(8);
  
  // RoughJS 属性
  const [drawingRoughness, setDrawingRoughness] = useState<number>(DEFAULT_ROUGHNESS);
  const [drawingBowing, setDrawingBowing] = useState<number>(DEFAULT_BOWING);
  const [drawingFillWeight, setDrawingFillWeight] = useState<number>(DEFAULT_FILL_WEIGHT);
  const [drawingHachureAngle, setDrawingHachureAngle] = useState<number>(DEFAULT_HACHURE_ANGLE);
  const [drawingHachureGap, setDrawingHachureGap] = useState<number>(DEFAULT_HACHURE_GAP);
  const [drawingCurveTightness, setDrawingCurveTightness] = useState<number>(DEFAULT_CURVE_TIGHTNESS);
  const [drawingCurveStepCount, setDrawingCurveStepCount] = useState<number>(DEFAULT_CURVE_STEP_COUNT);


  const selectedPaths = useMemo(() => {
    if (tool !== 'edit' || selectedPathIds.length === 0) return [];
    return paths.filter(p => selectedPathIds.includes(p.id));
  }, [paths, selectedPathIds, tool]);

  const firstSelectedPath = selectedPaths[0] || null;

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
            roughness,
            bowing,
            fillWeight,
            hachureAngle,
            hachureGap,
            curveTightness,
            curveStepCount,
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

  // --- Display Values ---

  const displayValue = <T,>(selectedProp: keyof AnyPath, drawingValue: T): T => {
    return firstSelectedPath ? (firstSelectedPath[selectedProp] as T ?? drawingValue) : drawingValue;
  };
  
  const color = displayValue('color', drawingColor);
  const fill = displayValue('fill', drawingFill);
  const fillStyle = displayValue('fillStyle', drawingFillStyle);
  const strokeWidth = displayValue('strokeWidth', drawingStrokeWidth);
  const roughness = displayValue('roughness', drawingRoughness);
  const bowing = displayValue('bowing', drawingBowing);
  const fillWeight = displayValue('fillWeight', drawingFillWeight);
  const hachureAngle = displayValue('hachureAngle', drawingHachureAngle);
  const hachureGap = displayValue('hachureGap', drawingHachureGap);
  const curveTightness = displayValue('curveTightness', drawingCurveTightness);
  const curveStepCount = displayValue('curveStepCount', drawingCurveStepCount);
  
  const setTool = (newTool: Tool) => {
    if (newTool === tool) return;

    // 当从编辑模式切换走时，如果选中了对象，则将其属性复制到绘图状态。
    if (tool === 'edit' && firstSelectedPath) {
        setDrawingColor(firstSelectedPath.color);
        setDrawingFill(firstSelectedPath.fill ?? 'transparent');
        setDrawingFillStyle(firstSelectedPath.fillStyle ?? 'hachure');
        setDrawingStrokeWidth(firstSelectedPath.strokeWidth);
        setDrawingRoughness(firstSelectedPath.roughness ?? DEFAULT_ROUGHNESS);
        setDrawingBowing(firstSelectedPath.bowing ?? DEFAULT_BOWING);
        setDrawingFillWeight(firstSelectedPath.fillWeight ?? DEFAULT_FILL_WEIGHT);
        setDrawingHachureAngle(firstSelectedPath.hachureAngle ?? DEFAULT_HACHURE_ANGLE);
        setDrawingHachureGap(firstSelectedPath.hachureGap ?? DEFAULT_HACHURE_GAP);
        setDrawingCurveTightness(firstSelectedPath.curveTightness ?? DEFAULT_CURVE_TIGHTNESS);
        setDrawingCurveStepCount(firstSelectedPath.curveStepCount ?? DEFAULT_CURVE_STEP_COUNT);
    }

    if (newTool !== 'edit' && selectedPathIds.length > 0) {
      setSelectedPathIds([]);
    }
    
    setToolInternal(newTool);
  };

  return {
    tool, setTool,
    color, setColor,
    fill, setFill,
    fillStyle, setFillStyle,
    strokeWidth, setStrokeWidth,
    roughness, setRoughness,
    bowing, setBowing,
    fillWeight, setFillWeight,
    hachureAngle, setHachureAngle,
    hachureGap, setHachureGap,
    curveTightness, setCurveTightness,
    curveStepCount, setCurveStepCount,
  };
};