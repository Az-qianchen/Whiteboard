/**
 * 本文件定义了一个自定义 Hook，用于封装画布上对象的变换和组织操作。
 */
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { rectangleToVectorPath, ellipseToVectorPath, lineToVectorPath, brushToVectorPath, polygonToVectorPath, arcToVectorPath, flipPath, getPathsBoundingBox, alignPaths, distributePaths, performBooleanOperation, scalePath, movePath } from '@/lib/drawing';
import type { AnyPath, RectangleData, EllipseData, VectorPathData, BrushPathData, PolygonData, ArcData, GroupData, Alignment, DistributeMode, ImageData, TextData, TraceOptions } from '@/types';
import type { AppActionsProps } from './useAppActions';
import { importSvg } from '@/lib/import';
import { removeBackground, adjustHsv, type HsvAdjustment } from '@/lib/image';
import { getImageDataUrl } from '@/lib/imageCache';
import { useFilesStore } from '@/context/filesStore';

type BooleanOperation = 'unite' | 'subtract' | 'intersect' | 'exclude' | 'divide';

/**
 * 封装对象变换和组织相关操作的 Hook。
 * @param props - 从主状态 Hook 传递的应用状态和操作。
 * @returns 包含对象操作处理函数的对象。
 */
export const useObjectActions = ({
  paths,
  selectedPathIds,
  pathState,
  toolbarState,
  getPointerPosition,
}: AppActionsProps) => {
  const { t } = useTranslation();

  /**
   * 沿指定轴翻转选中的图形。
   * @param axis - 'horizontal' 或 'vertical'。
   */
  const handleFlip = useCallback(async (axis: 'horizontal' | 'vertical') => {
      if (selectedPathIds.length === 0) return;
      pathState.beginCoalescing();
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const selectionBbox = getPathsBoundingBox(selected);
      if (!selectionBbox) {
        pathState.endCoalescing();
        return;
      }

      const center = { x: selectionBbox.x + selectionBbox.width / 2, y: selectionBbox.y + selectionBbox.height / 2 };
      
      const newPaths = [...paths];
      const promises: Promise<void>[] = [];
      
      paths.forEach((p, index) => {
          if (selectedPathIds.includes(p.id)) {
              const promise = flipPath(p, center, axis).then(flippedPath => {
                  newPaths[index] = flippedPath;
              });
              promises.push(promise);
          }
      });
      
      await Promise.all(promises);
      
      pathState.setPaths(newPaths);
      pathState.endCoalescing();
  }, [paths, selectedPathIds, pathState]);

  /**
   * 将选中的图形（如矩形、椭圆）转换为可编辑的矢量路径。
   */
  const handleConvertToPath = useCallback(() => {
    if (selectedPathIds.length === 0) return;

    const newSelectedIds: string[] = [];

    const updatedPaths = paths.map((path) => {
        if (selectedPathIds.includes(path.id)) {
            let pathAfterConversion: AnyPath | null = null;
            if (path.tool === 'rectangle') {
                pathAfterConversion = rectangleToVectorPath(path as RectangleData);
            } else if (path.tool === 'ellipse') {
                pathAfterConversion = ellipseToVectorPath(path as EllipseData);
            } else if (path.tool === 'polygon') {
                pathAfterConversion = polygonToVectorPath(path as PolygonData);
            } else if (path.tool === 'line') {
                pathAfterConversion = lineToVectorPath(path as VectorPathData);
            } else if (path.tool === 'brush') {
                pathAfterConversion = brushToVectorPath(path as BrushPathData);
            } else if (path.tool === 'arc') {
                pathAfterConversion = arcToVectorPath(path as ArcData);
            }
            
            if (pathAfterConversion) {
                newSelectedIds.push(pathAfterConversion.id);
                return pathAfterConversion;
            }
        }
        return path;
    });

    pathState.setPaths(updatedPaths.filter((p): p is AnyPath => !!p));
    pathState.setSelectedPathIds(newSelectedIds);
    toolbarState.setTool('selection');
  }, [paths, selectedPathIds, pathState, toolbarState]);

  /**
   * 将选中的图形在层级中上移。
   */
  const handleBringForward = useCallback(() => pathState.handleReorder('forward'), [pathState]);
  /**
   * 将选中的图形在层级中下移。
   */
  const handleSendBackward = useCallback(() => pathState.handleReorder('backward'), [pathState]);
  /**
   * 将选中的图形置于顶层。
   */
  const handleBringToFront = useCallback(() => pathState.handleReorder('front'), [pathState]);
  /**
   * 将选中的图形置于底层。
   */
  const handleSendToBack = useCallback(() => pathState.handleReorder('back'), [pathState]);

  /**
   * 将选中的图形编组。
   */
  const handleGroup = useCallback(() => {
      if (selectedPathIds.length < 2) return;

      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const remaining = paths.filter(p => !selectedPathIds.includes(p.id));
      
      const newGroup: GroupData = {
          id: `${Date.now()}-group`,
          tool: 'group',
          children: selected,
          color: selected[0].color,
          fill: selected[0].fill,
          fillStyle: selected[0].fillStyle,
          strokeWidth: selected[0].strokeWidth,
          roughness: selected[0].roughness,
          bowing: selected[0].bowing,
          fillWeight: selected[0].fillWeight,
          hachureAngle: selected[0].hachureAngle,
          hachureGap: selected[0].hachureGap,
          curveTightness: selected[0].curveTightness,
          curveStepCount: selected[0].curveStepCount,
      };

      pathState.setPaths([...remaining, newGroup]);
      pathState.setSelectedPathIds([newGroup.id]);

  }, [paths, selectedPathIds, pathState]);

  /**
   * 取消编组选中的组。
   */
  const handleUngroup = useCallback(() => {
      const groupsToUngroup = paths.filter(p => selectedPathIds.includes(p.id) && p.tool === 'group') as GroupData[];
      if (groupsToUngroup.length === 0) return;

      const groupIds = new Set(groupsToUngroup.map(g => g.id));
      const remainingPaths = paths.filter(p => !groupIds.has(p.id));
      
      const ungroupedChildren = groupsToUngroup.flatMap(g => g.children);

      pathState.setPaths([...remainingPaths, ...ungroupedChildren]);
      pathState.setSelectedPathIds(ungroupedChildren.map(c => c.id));

  }, [paths, selectedPathIds, pathState]);
  
  /**
   * 对齐选中的图形。
   * @param alignment - 对齐方式。
   */
  const handleAlign = useCallback((alignment: Alignment) => {
    if (selectedPathIds.length < 2) return;
    const selected = paths.filter(p => selectedPathIds.includes(p.id));
    const alignedPaths = alignPaths(selected, alignment);
    const alignedMap = new Map(alignedPaths.map(p => [p.id, p]));
    pathState.setPaths(prev => prev.map(p => alignedMap.get(p.id) || p));
  }, [paths, selectedPathIds, pathState]);

  /**
   * 分布选中的图形。
   * @param axis -分布轴向
   * @param options - 分布选项
   */
  const handleDistribute = useCallback((axis: 'horizontal' | 'vertical', options: { spacing: number | null; mode: DistributeMode }) => {
    if (selectedPathIds.length < 2) return;
    const selected = paths.filter(p => selectedPathIds.includes(p.id));
    const distributedPaths = distributePaths(selected, axis, options);
    const distributedMap = new Map(distributedPaths.map(p => [p.id, p]));
    pathState.setPaths(prev => prev.map(p => distributedMap.get(p.id) || p));
  }, [paths, selectedPathIds, pathState]);

  /**
   * 执行布尔运算。
   * @param operation - 要执行的操作。
   */
  const handleBooleanOperation = useCallback((operation: BooleanOperation) => {
      if (selectedPathIds.length < 2) return;
      if (operation === 'divide' && selectedPathIds.length !== 2) {
          console.warn('修剪操作需要且仅能选中两个图形。');
          return;
      }

      const selectedPaths = [...paths].filter(p => selectedPathIds.includes(p.id));
      const newPaths = performBooleanOperation(selectedPaths, operation);

      if (newPaths && newPaths.length > 0) {
          pathState.setPaths(prev => {
              const remaining = prev.filter(p => !selectedPathIds.includes(p.id));
              return [...remaining, ...newPaths];
          });
          pathState.setSelectedPathIds(newPaths.map(p => p.id));
          toolbarState.setTool('selection');
      } else {
          console.warn(`布尔运算 "${operation}" 产生了一个空形状。`);
      }
  }, [paths, selectedPathIds, pathState, toolbarState]);

  /**
   * 使用顶层对象作为遮罩创建遮罩组。
   */
  const handleMask = useCallback(() => {
    if (selectedPathIds.length < 2) return;
  
    const selectedSet = new Set(selectedPathIds);
    const selectedPathsSorted = paths.filter(p => selectedSet.has(p.id));
  
    if (selectedPathsSorted.length < 2) return;
  
    const maskShape = selectedPathsSorted[selectedPathsSorted.length - 1];
    const maskedContent = selectedPathsSorted.slice(0, -1);
  
    const remainingPaths = paths.filter(p => !selectedSet.has(p.id));
  
    const newMaskGroup: GroupData = {
      id: `${Date.now()}-maskgroup`,
      tool: 'group',
      mask: 'clip',
      children: [...maskedContent, maskShape],
      color: maskShape.color,
      fill: maskShape.fill,
      fillStyle: maskShape.fillStyle,
      strokeWidth: maskShape.strokeWidth,
      roughness: maskShape.roughness,
      bowing: maskShape.bowing,
      fillWeight: maskShape.fillWeight,
      hachureAngle: maskShape.hachureAngle,
      hachureGap: maskShape.hachureGap,
      curveTightness: maskShape.curveTightness,
      curveStepCount: maskShape.curveStepCount,
    };
  
    pathState.setPaths([...remainingPaths, newMaskGroup]);
    pathState.setSelectedPathIds([newMaskGroup.id]);
  }, [paths, selectedPathIds, pathState]);

  /**
   * 抠图模式状态。
   * 保存临时选区、生成的新图像以及点击监听器，
   * 以便在用户确认或取消时进行处理。
   */
  const removeBgRef = useRef<{
    handler?: (e: MouseEvent) => void;
    overlay?: SVGRectElement;
    newFileId?: string;
    targetId?: string;
  } | null>(null);

  /**
   * 开始抠图模式，等待用户在图像上点击选区。
   */
  const beginRemoveBackground = useCallback((opts: { threshold: number; contiguous: boolean }) => {
    if (selectedPathIds.length !== 1) return;
    const imagePath = paths.find(p => p.id === selectedPathIds[0]);
    if (!imagePath || imagePath.tool !== 'image') return;

    // 若已有挂起的抠图操作，先清理
    if (removeBgRef.current?.handler) {
      document.removeEventListener('click', removeBgRef.current.handler);
    }
    removeBgRef.current?.overlay?.remove();
    removeBgRef.current = { targetId: imagePath.id };

    const handler = async (e: MouseEvent) => {
      removeBgRef.current = removeBgRef.current ?? { targetId: imagePath.id };
      removeBgRef.current.handler = undefined;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = await getImageDataUrl(imagePath as ImageData);
      await new Promise(resolve => { img.onload = resolve; });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { return; }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const svg = document.querySelector('svg') as SVGSVGElement;
      const world = getPointerPosition({ clientX: e.clientX, clientY: e.clientY }, svg);
      const imgData = imagePath as ImageData;
      const localX = Math.floor((world.x - imgData.x) / imgData.width * img.width);
      const localY = Math.floor((world.y - imgData.y) / imgData.height * img.height);
      const { image: newData, region } = removeBackground(data, { x: localX, y: localY, threshold: opts.threshold, contiguous: opts.contiguous });
      ctx.putImageData(newData, 0, 0);
      const newSrc = canvas.toDataURL();
      const filesStore = useFilesStore.getState();
      const { fileId } = await filesStore.ingestDataUrl(newSrc);
      removeBgRef.current = { ...removeBgRef.current, newFileId: fileId };

      if (region) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const sx = imgData.x + (region.x / img.width) * imgData.width;
        const sy = imgData.y + (region.y / img.height) * imgData.height;
        const sw = (region.width / img.width) * imgData.width;
        const sh = (region.height / img.height) * imgData.height;
        rect.setAttribute('x', String(sx));
        rect.setAttribute('y', String(sy));
        rect.setAttribute('width', String(sw));
        rect.setAttribute('height', String(sh));
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('class', 'marching-ants');
        rect.setAttribute('vector-effect', 'non-scaling-stroke');
        rect.setAttribute('pointer-events', 'none');
        svg.appendChild(rect);
        removeBgRef.current.overlay = rect;
      }
    };

    removeBgRef.current.handler = handler;
    // 延迟注册以避免立即触发当前点击
    setTimeout(() => {
      document.addEventListener('click', handler, { once: true });
    });
  }, [paths, selectedPathIds, getPointerPosition]);

  /**
   * 确认抠图，应用预览结果。
   */
  const applyRemoveBackground = useCallback(() => {
    const info = removeBgRef.current;
    if (!info?.newFileId || !info.targetId) return;
    pathState.beginCoalescing();
    pathState.setPaths(prev => prev.map(p => p.id === info.targetId ? { ...p, fileId: info.newFileId! } : p));
    pathState.endCoalescing();
    info.overlay?.remove();
    removeBgRef.current = null;
  }, [pathState]);

  /**
   * 取消抠图，移除选区与监听器。
   */
  const cancelRemoveBackground = useCallback(() => {
    const info = removeBgRef.current;
    if (!info) return;
    if (info.handler) {
      document.removeEventListener('click', info.handler);
    }
    info.overlay?.remove();
    removeBgRef.current = null;
  }, []);

  /**
   * 调整选中图片的 HSV，支持跨域图片。
   */
  const handleAdjustImageHsv = useCallback(async (adj: HsvAdjustment) => {
    if (selectedPathIds.length !== 1) return;
    const imagePath = paths.find(p => p.id === selectedPathIds[0]);
    if (!imagePath || imagePath.tool !== 'image') return;

    pathState.beginCoalescing();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = await getImageDataUrl(imagePath as ImageData);
    await new Promise(resolve => { img.onload = resolve; });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { pathState.endCoalescing(); return; }
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newData = adjustHsv(data, adj);
    ctx.putImageData(newData, 0, 0);
    const newSrc = canvas.toDataURL();
    const filesStore = useFilesStore.getState();
    const { fileId } = await filesStore.ingestDataUrl(newSrc);
    pathState.setPaths(prev => prev.map(p => p.id === imagePath.id ? { ...p, fileId } : p));
    pathState.endCoalescing();
  }, [paths, selectedPathIds, pathState]);

  /**
   * 将选中的图片转换为矢量图形。
   * @param options - 矢量化参数选项。
   */
  const handleTraceImage = useCallback(async (options: TraceOptions) => {
    if (selectedPathIds.length !== 1) return;
    const imagePath = paths.find(p => p.id === selectedPathIds[0]);

    if (!imagePath || imagePath.tool !== 'image') return;
    const imagePathData = imagePath as ImageData;

    const ImageTracer = (await import('imagetracerjs')).default;

    const dataUrl = await getImageDataUrl(imagePathData);
    const svgString = await new Promise<string>((resolve) => {
        ImageTracer.imageToSVG(dataUrl, (svgstr: string) => {
            resolve(svgstr);
        }, options);
    });

    const tracedPaths = importSvg(svgString);
    if (tracedPaths.length === 0) {
        alert(t('traceImageNoPath'));
        return;
    }

    const tracedBbox = getPathsBoundingBox(tracedPaths, false);
    if (!tracedBbox || tracedBbox.width === 0 || tracedBbox.height === 0) {
         alert(t('traceImageNoSize'));
         return;
    }

    const scaleX = imagePathData.width / tracedBbox.width;
    const scaleY = imagePathData.height / tracedBbox.height;
    const pivot = { x: tracedBbox.x, y: tracedBbox.y };

    let finalPaths = tracedPaths.map(p => scalePath(p, pivot, scaleX, scaleY));
    const newBbox = getPathsBoundingBox(finalPaths, false);
    
    if (newBbox) {
        const dx = imagePathData.x - newBbox.x;
        const dy = imagePathData.y - newBbox.y;
        finalPaths = finalPaths.map(p => movePath(p, dx, dy));
    }

    const newGroup: GroupData = {
        id: `${Date.now()}-traced-group`,
        name: t('tracedImageGroupName'),
        tool: 'group',
        children: finalPaths,
        color: '#000000',
        fill: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 0,
        bowing: 0,
        fillWeight: -1,
        hachureAngle: -41,
        hachureGap: -1,
        curveTightness: 0,
        curveStepCount: 9,
        isRough: false,
    };

    pathState.setPaths((prev: AnyPath[]) => prev.map(p => p.id === imagePathData.id ? newGroup : p));
    pathState.setSelectedPathIds([newGroup.id]);

  }, [paths, selectedPathIds, pathState, t]);
  
  return { handleFlip, handleConvertToPath, handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack, handleGroup, handleUngroup, handleAlign, handleDistribute, handleBooleanOperation, handleMask, handleTraceImage, beginRemoveBackground, applyRemoveBackground, cancelRemoveBackground, handleAdjustImageHsv };
};
