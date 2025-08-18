import { useState, useMemo, useEffect } from 'react';
import type { Tool, AnyPath, ImageData, SelectionMode, RectangleData, PolygonData, EndpointStyle, GroupData, VectorPathData } from '../types';
import { COLORS, DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_CURVE_TIGHTNESS, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_STEP_COUNT, DEFAULT_PRESERVE_VERTICES, DEFAULT_DISABLE_MULTI_STROKE, DEFAULT_DISABLE_MULTI_STROKE_FILL, ENDPOINT_STYLES } from '../constants';
import { getLocalStorageItem } from '../lib/utils';
import { simplifyPath } from '../lib/drawing';

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
  setSelectedPathIds: React.Dispatch<React.SetStateAction<string[]>>,
  beginCoalescing: () => void,
  endCoalescing: () => void
) => {
  const [tool, setToolInternal] = useState<Tool>(() => getLocalStorageItem('whiteboard_tool', 'brush'));
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('move');
  
  // 用于绘制新路径的属性
  const [drawingColor, setDrawingColor] = useState<string>(() => getLocalStorageItem('whiteboard_drawingColor', COLORS[0]));
  const [drawingFill, setDrawingFill] = useState<string>(() => getLocalStorageItem('whiteboard_drawingFill', 'transparent'));
  const [drawingFillStyle, setDrawingFillStyle] = useState<string>(() => getLocalStorageItem('whiteboard_drawingFillStyle', 'hachure'));
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState<number>(() => getLocalStorageItem('whiteboard_drawingStrokeWidth', 8));
  const [drawingOpacity, setDrawingOpacity] = useState<number>(() => getLocalStorageItem('whiteboard_drawingOpacity', 1));
  const [drawingSides, setDrawingSides] = useState<number>(() => getLocalStorageItem('whiteboard_drawingSides', 6));
  const [drawingBorderRadius, setDrawingBorderRadius] = useState<number>(() => getLocalStorageItem('whiteboard_drawingBorderRadius', 0));
  const [drawingStrokeLineDash, setDrawingStrokeLineDash] = useState<[number, number] | undefined>(() => getLocalStorageItem('whiteboard_drawingStrokeLineDash', undefined));
  const [drawingStrokeLineCapStart, setDrawingStrokeLineCapStart] = useState<EndpointStyle>(() => getLocalStorageItem('whiteboard_drawingStrokeLineCapStart', 'round'));
  const [drawingStrokeLineCapEnd, setDrawingStrokeLineCapEnd] = useState<EndpointStyle>(() => getLocalStorageItem('whiteboard_drawingStrokeLineCapEnd', 'round'));
  const [drawingEndpointSize, setDrawingEndpointSize] = useState<number>(() => getLocalStorageItem('whiteboard_drawingEndpointSize', 1));
  const [drawingEndpointFill, setDrawingEndpointFill] = useState<'solid' | 'hollow'>(() => getLocalStorageItem('whiteboard_drawingEndpointFill', 'hollow'));
  
  const [drawingIsRough, setDrawingIsRough] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingIsRough', true));
  // RoughJS 属性
  const [drawingRoughness, setDrawingRoughness] = useState<number>(() => getLocalStorageItem('whiteboard_drawingRoughness', DEFAULT_ROUGHNESS));
  const [drawingBowing, setDrawingBowing] = useState<number>(() => getLocalStorageItem('whiteboard_drawingBowing', DEFAULT_BOWING));
  const [drawingFillWeight, setDrawingFillWeight] = useState<number>(() => getLocalStorageItem('whiteboard_drawingFillWeight', DEFAULT_FILL_WEIGHT));
  const [drawingHachureAngle, setDrawingHachureAngle] = useState<number>(() => getLocalStorageItem('whiteboard_drawingHachureAngle', DEFAULT_HACHURE_ANGLE));
  const [drawingHachureGap, setDrawingHachureGap] = useState<number>(() => getLocalStorageItem('whiteboard_drawingHachureGap', DEFAULT_HACHURE_GAP));
  const [drawingCurveTightness, setDrawingCurveTightness] = useState<number>(() => getLocalStorageItem('whiteboard_drawingCurveTightness', DEFAULT_CURVE_TIGHTNESS));
  const [drawingCurveStepCount, setDrawingCurveStepCount] = useState<number>(() => getLocalStorageItem('whiteboard_drawingCurveStepCount', DEFAULT_CURVE_STEP_COUNT));
  const [drawingPreserveVertices, setDrawingPreserveVertices] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingPreserveVertices', DEFAULT_PRESERVE_VERTICES));
  const [drawingDisableMultiStroke, setDrawingDisableMultiStroke] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingDisableMultiStroke', DEFAULT_DISABLE_MULTI_STROKE));
  const [drawingDisableMultiStrokeFill, setDrawingDisableMultiStrokeFill] = useState<boolean>(() => getLocalStorageItem('whiteboard_drawingDisableMultiStrokeFill', DEFAULT_DISABLE_MULTI_STROKE_FILL));

  const [originalPathsForSimplify, setOriginalPathsForSimplify] = useState<AnyPath[] | null>(null);

  useEffect(() => { localStorage.setItem('whiteboard_tool', JSON.stringify(tool)); }, [tool]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingColor', JSON.stringify(drawingColor)); }, [drawingColor]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingFill', JSON.stringify(drawingFill)); }, [drawingFill]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingFillStyle', JSON.stringify(drawingFillStyle)); }, [drawingFillStyle]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeWidth', JSON.stringify(drawingStrokeWidth)); }, [drawingStrokeWidth]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingOpacity', JSON.stringify(drawingOpacity)); }, [drawingOpacity]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingSides', JSON.stringify(drawingSides)); }, [drawingSides]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingBorderRadius', JSON.stringify(drawingBorderRadius)); }, [drawingBorderRadius]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineDash', JSON.stringify(drawingStrokeLineDash)); }, [drawingStrokeLineDash]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineCapStart', JSON.stringify(drawingStrokeLineCapStart)); }, [drawingStrokeLineCapStart]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingStrokeLineCapEnd', JSON.stringify(drawingStrokeLineCapEnd)); }, [drawingStrokeLineCapEnd]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingEndpointSize', JSON.stringify(drawingEndpointSize)); }, [drawingEndpointSize]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingEndpointFill', JSON.stringify(drawingEndpointFill)); }, [drawingEndpointFill]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingIsRough', JSON.stringify(drawingIsRough)); }, [drawingIsRough]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingRoughness', JSON.stringify(drawingRoughness)); }, [drawingRoughness]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingBowing', JSON.stringify(drawingBowing)); }, [drawingBowing]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingFillWeight', JSON.stringify(drawingFillWeight)); }, [drawingFillWeight]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingHachureAngle', JSON.stringify(drawingHachureAngle)); }, [drawingHachureAngle]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingHachureGap', JSON.stringify(drawingHachureGap)); }, [drawingHachureGap]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingCurveTightness', JSON.stringify(drawingCurveTightness)); }, [drawingCurveTightness]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingCurveStepCount', JSON.stringify(drawingCurveStepCount)); }, [drawingCurveStepCount]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingPreserveVertices', JSON.stringify(drawingPreserveVertices)); }, [drawingPreserveVertices]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingDisableMultiStroke', JSON.stringify(drawingDisableMultiStroke)); }, [drawingDisableMultiStroke]);
  useEffect(() => { localStorage.setItem('whiteboard_drawingDisableMultiStrokeFill', JSON.stringify(drawingDisableMultiStrokeFill)); }, [drawingDisableMultiStrokeFill]);


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
      const isMarker = (style: EndpointStyle) => ENDPOINT_STYLES.some(s => s.name === style && s.name !== 'none');
      
      setDrawingColor(firstSelectedPath.color);
      setDrawingFill(firstSelectedPath.fill ?? 'transparent');
      setDrawingFillStyle(firstSelectedPath.fillStyle ?? 'hachure');
      setDrawingStrokeWidth(firstSelectedPath.strokeWidth);
      setDrawingOpacity(firstSelectedPath.opacity ?? 1);
      if (firstSelectedPath.tool === 'rectangle' || firstSelectedPath.tool === 'image' || firstSelectedPath.tool === 'polygon') {
        setDrawingBorderRadius((firstSelectedPath as RectangleData | ImageData | PolygonData).borderRadius ?? 0);
      }
      if (firstSelectedPath.tool === 'polygon') {
        setDrawingSides((firstSelectedPath as PolygonData).sides ?? 6);
      }
      setDrawingStrokeLineDash(firstSelectedPath.strokeLineDash ?? undefined);
      
      const startCap = firstSelectedPath.strokeLineCapStart ?? 'round';
      setDrawingStrokeLineCapStart(isMarker(startCap) ? startCap : 'round');
      
      const endCap = firstSelectedPath.strokeLineCapEnd ?? 'round';
      setDrawingStrokeLineCapEnd(isMarker(endCap) ? endCap : 'round');

      setDrawingEndpointSize(firstSelectedPath.endpointSize ?? 1);
      setDrawingEndpointFill(firstSelectedPath.endpointFill ?? 'hollow');
      setDrawingIsRough(firstSelectedPath.isRough ?? true);
      setDrawingRoughness(firstSelectedPath.roughness ?? DEFAULT_ROUGHNESS);
      setDrawingBowing(firstSelectedPath.bowing ?? DEFAULT_BOWING);
      setDrawingFillWeight(firstSelectedPath.fillWeight ?? DEFAULT_FILL_WEIGHT);
      setDrawingHachureAngle(firstSelectedPath.hachureAngle ?? DEFAULT_HACHURE_ANGLE);
      setDrawingHachureGap(firstSelectedPath.hachureGap ?? DEFAULT_HACHURE_GAP);
      setDrawingCurveTightness(firstSelectedPath.curveTightness ?? DEFAULT_CURVE_TIGHTNESS);
      setDrawingCurveStepCount(firstSelectedPath.curveStepCount ?? DEFAULT_CURVE_STEP_COUNT);
      setDrawingPreserveVertices(firstSelectedPath.preserveVertices ?? DEFAULT_PRESERVE_VERTICES);
      setDrawingDisableMultiStroke(firstSelectedPath.disableMultiStroke ?? DEFAULT_DISABLE_MULTI_STROKE);
      setDrawingDisableMultiStrokeFill(firstSelectedPath.disableMultiStrokeFill ?? DEFAULT_DISABLE_MULTI_STROKE_FILL);
    }
  }, [firstSelectedPath]);


  const updateSelectedPaths = (updater: (path: AnyPath) => Partial<AnyPath>) => {
    if (selectedPathIds.length === 0) return;
    
    // Helper to recursively apply updates to a path and its children if it's a group.
    const applyRecursiveUpdate = (path: AnyPath, propsToUpdate: Partial<AnyPath>): AnyPath => {
      if (path.tool === 'group') {
        const updatedChildren = path.children.map(child => applyRecursiveUpdate(child, propsToUpdate));
        return { ...path, ...propsToUpdate, children: updatedChildren } as AnyPath;
      }
      return { ...path, ...propsToUpdate } as AnyPath;
    };

    setPaths(prevPaths =>
      prevPaths.map(p => {
        if (selectedPathIds.includes(p.id)) {
          // The updater provides the specific properties to change, e.g., { strokeWidth: 5 }
          const updatedProps = updater(p);
          return applyRecursiveUpdate(p, updatedProps);
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

  const setEndpointSize = (newSize: number) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ endpointSize: newSize }));
    else setDrawingEndpointSize(newSize);
  };
  
  const setEndpointFill = (newFill: 'solid' | 'hollow') => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ endpointFill: newFill }));
    else setDrawingEndpointFill(newFill);
  };

  const setIsRough = (val: boolean) => {
    if (firstSelectedPath) updateSelectedPaths(() => ({ isRough: val }));
    else setDrawingIsRough(val);
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

  const setOpacity = (newOpacity: number) => {
    if (firstSelectedPath) {
      updateSelectedPaths(() => ({ opacity: newOpacity }));
    } else {
      setDrawingOpacity(newOpacity);
    }
  };

  const setSides = (newSides: number) => {
    if (firstSelectedPath && firstSelectedPath.tool === 'polygon') {
      updateSelectedPaths(() => ({ sides: Math.max(3, newSides) }));
    } else {
      setDrawingSides(Math.max(3, newSides));
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

  const beginSimplify = () => {
    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      setOriginalPathsForSimplify(selected);
      beginCoalescing();
    }
  };

  const setSimplify = (tolerance: number) => {
    if (!originalPathsForSimplify) return;

    const simplifyRecursively = (path: AnyPath): AnyPath => {
      if (path.tool === 'group') {
        return { ...path, children: (path as GroupData).children.map(simplifyRecursively) };
      }
      if ((path.tool === 'pen' || path.tool === 'line') && 'anchors' in path) {
        return simplifyPath(path as VectorPathData, tolerance);
      }
      return path;
    };

    const simplifiedPaths = originalPathsForSimplify.map(simplifyRecursively);

    const simplifiedMap = new Map(simplifiedPaths.map(p => [p.id, p]));
    setPaths(prev => prev.map(p => simplifiedMap.get(p.id) || p));
  };
  
  const endSimplify = () => {
    setOriginalPathsForSimplify(null);
    endCoalescing();
  };

  const isSimplifiable = useMemo(() => {
    if (selectedPaths.length === 0) return false;
    const checkPath = (p: AnyPath): boolean => {
      // Brush paths are converted to vector paths, so they are simplifiable
      if (p.tool === 'pen' || p.tool === 'line' || p.tool === 'brush') return true;
      if (p.tool === 'group') return (p as GroupData).children.some(checkPath);
      return false;
    };
    return selectedPaths.some(checkPath);
  }, [selectedPaths]);


  // --- Rectangle/Image/Polygon Border Radius Logic ---
  const selectedRectsImagesAndPolygons = useMemo(() => {
    if (selectedPathIds.length === 0) return [];
    return paths.filter(p => selectedPathIds.includes(p.id) && (p.tool === 'rectangle' || p.tool === 'image' || p.tool === 'polygon')) as (RectangleData | ImageData | PolygonData)[];
  }, [paths, selectedPathIds]);
  const firstSelectedRectImageOrPolygon = selectedRectsImagesAndPolygons[0] || null;
  const setBorderRadius = (newRadius: number) => {
    if (selectedRectsImagesAndPolygons.length > 0) {
      updateSelectedPaths(() => ({ borderRadius: Math.max(0, newRadius) }));
    } else {
      setDrawingBorderRadius(Math.max(0, newRadius));
    }
  };
  const borderRadius = (firstSelectedRectImageOrPolygon || tool === 'rectangle' || tool === 'polygon')
    ? (firstSelectedRectImageOrPolygon?.borderRadius ?? drawingBorderRadius)
    : null;

  // --- Polygon Sides Logic ---
  const selectedPolygons = useMemo(() => {
    if (selectedPathIds.length === 0) return [];
    return paths.filter(p => selectedPathIds.includes(p.id) && p.tool === 'polygon') as PolygonData[];
  }, [paths, selectedPathIds]);
  const firstSelectedPolygon = selectedPolygons[0] || null;
  const sides = (firstSelectedPolygon || tool === 'polygon')
    ? (firstSelectedPolygon?.sides ?? drawingSides)
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
    beginSimplify,
    setSimplify,
    endSimplify,
    isSimplifiable,
    firstSelectedPath,
  };
};