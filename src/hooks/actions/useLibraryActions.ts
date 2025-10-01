/**
 * 本文件定义了一个自定义 Hook，用于封装样式和素材库操作。
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fileOpen, fileSave } from 'browser-fs-access';
import type { AnyPath, StyleClipboardData, MaterialData, LibraryData, RectangleData, ImageData, PolygonData, Point, GroupData, ArcData, TextData } from '@/types';
import { getPathsBoundingBox, movePath } from '@/lib/drawing';
import { useToolbarStore } from '@/context/toolbarStore';
import type { AppActionsProps } from './useAppActions';

/**
 * 封装样式库和素材库相关操作的 Hook。
 * @param props - 从主状态 Hook 传递的应用状态和操作。
 * @returns 包含所有库管理函数的对象。
 */
export const useLibraryActions = ({
  paths, selectedPathIds, styleClipboard, setStyleClipboard, styleLibrary, setStyleLibrary, materialLibrary, setMaterialLibrary,
  showConfirmation, pathState, toolbarState, getPointerPosition,
}: AppActionsProps) => {
  const { t } = useTranslation();

  /**
   * 从选中的单个图形复制样式。
   */
  const handleCopyStyle = useCallback(() => {
    if (selectedPathIds.length !== 1) return;
    const path = paths.find(p => p.id === selectedPathIds[0]);
    if (!path) return;
    const copiedStyle: StyleClipboardData = {
        color: path.color,
        fill: path.fill,
        fillGradient: path.fillGradient,
        fillStyle: path.fillStyle,
        strokeWidth: path.strokeWidth,
        strokeLineDash: path.strokeLineDash,
        strokeLineCapStart: path.strokeLineCapStart,
        strokeLineCapEnd: path.strokeLineCapEnd,
        strokeLineJoin: path.strokeLineJoin,
        endpointSize: path.endpointSize,
        endpointFill: path.endpointFill,
        isRough: path.isRough,
        opacity: path.opacity,
        roughness: path.roughness,
        bowing: path.bowing,
        fillWeight: path.fillWeight,
        hachureAngle: path.hachureAngle,
        hachureGap: path.hachureGap,
        curveTightness: path.curveTightness,
        curveStepCount: path.curveStepCount,
        preserveVertices: path.preserveVertices,
        disableMultiStroke: path.disableMultiStroke,
        disableMultiStrokeFill: path.disableMultiStrokeFill,
        borderRadius: (path.tool === 'rectangle' || path.tool === 'image' || path.tool === 'polygon') ? (path as RectangleData | ImageData | PolygonData).borderRadius : undefined,
        sides: path.tool === 'polygon' ? (path as PolygonData).sides : undefined,
    };

    if (path.tool === 'text') {
        copiedStyle.fontFamily = path.fontFamily;
        copiedStyle.fontSize = path.fontSize;
        copiedStyle.textAlign = path.textAlign;
        copiedStyle.lineHeight = path.lineHeight;
    }

    setStyleClipboard(copiedStyle);
    const toolbarStore = useToolbarStore.getState() as Record<string, unknown>;
    Object.entries(copiedStyle).forEach(([key, value]) => {
        if (value === undefined) return;
        const setterName = `setDrawing${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const setter = toolbarStore[setterName];
        if (typeof setter === 'function') {
            (setter as (val: unknown) => void)(value);
        }
    });
  }, [paths, selectedPathIds, setStyleClipboard]);
  
  /**
   * 将复制的样式粘贴到选中的图形上。
   */
  const handlePasteStyle = useCallback(() => {
    if (!styleClipboard || selectedPathIds.length === 0) return;
    
    const applyStyleRecursively = (path: AnyPath, style: StyleClipboardData): AnyPath => {
        const styleProps = { ...style };
        switch (path.tool) {
            case 'group': {
                const updatedChildren = path.children.map(child => applyStyleRecursively(child, style));
                return { ...path, ...styleProps, tool: 'group', children: updatedChildren };
            }
            case 'rectangle':
                delete (styleProps as Partial<PolygonData>).sides;
                delete (styleProps as Partial<TextData>).fontFamily;
                delete (styleProps as Partial<TextData>).fontSize;
                delete (styleProps as Partial<TextData>).textAlign;
                delete (styleProps as Partial<TextData>).lineHeight;
                return { ...path, ...styleProps, tool: 'rectangle' };
            case 'polygon':
                delete (styleProps as Partial<TextData>).fontFamily;
                delete (styleProps as Partial<TextData>).fontSize;
                delete (styleProps as Partial<TextData>).textAlign;
                delete (styleProps as Partial<TextData>).lineHeight;
                return { ...path, ...styleProps, tool: 'polygon' };
            case 'image':
                delete (styleProps as Partial<PolygonData>).sides;
                delete (styleProps as Partial<TextData>).fontFamily;
                delete (styleProps as Partial<TextData>).fontSize;
                delete (styleProps as Partial<TextData>).textAlign;
                delete (styleProps as Partial<TextData>).lineHeight;
                return { ...path, ...styleProps, tool: 'image' };
            case 'pen':
            case 'line':
                delete (styleProps as Partial<RectangleData>).borderRadius;
                delete (styleProps as Partial<PolygonData>).sides;
                delete (styleProps as Partial<TextData>).fontFamily;
                delete (styleProps as Partial<TextData>).fontSize;
                delete (styleProps as Partial<TextData>).textAlign;
                delete (styleProps as Partial<TextData>).lineHeight;
                return { ...path, ...styleProps, tool: path.tool };
            case 'brush':
                delete (styleProps as Partial<RectangleData>).borderRadius;
                delete (styleProps as Partial<PolygonData>).sides;
                delete (styleProps as Partial<TextData>).fontFamily;
                delete (styleProps as Partial<TextData>).fontSize;
                delete (styleProps as Partial<TextData>).textAlign;
                delete (styleProps as Partial<TextData>).lineHeight;
                return { ...path, ...styleProps, tool: 'brush' };
            case 'ellipse':
                delete (styleProps as Partial<RectangleData>).borderRadius;
                delete (styleProps as Partial<PolygonData>).sides;
                delete (styleProps as Partial<TextData>).fontFamily;
                delete (styleProps as Partial<TextData>).fontSize;
                delete (styleProps as Partial<TextData>).textAlign;
                delete (styleProps as Partial<TextData>).lineHeight;
                return { ...path, ...styleProps, tool: 'ellipse' };
            case 'arc':
                delete (styleProps as Partial<RectangleData>).borderRadius;
                delete (styleProps as Partial<PolygonData>).sides;
                delete (styleProps as Partial<TextData>).fontFamily;
                delete (styleProps as Partial<TextData>).fontSize;
                delete (styleProps as Partial<TextData>).textAlign;
                delete (styleProps as Partial<TextData>).lineHeight;
                return { ...path, ...styleProps, points: path.points, tool: 'arc' };
            case 'text':
                return { ...path, ...styleProps, tool: 'text' };
        }
    };
    
    pathState.setPaths(prev => prev.map(p => selectedPathIds.includes(p.id) ? applyStyleRecursively(p, styleClipboard) : p));
  }, [styleClipboard, selectedPathIds, pathState]);

  /**
   * 将当前样式添加到样式库。
   */
  const handleAddStyle = useCallback(() => {
      if (selectedPathIds.length !== 1) return;
      const path = paths.find(p => p.id === selectedPathIds[0]);
      if (!path) return;
      
      const newStyle: StyleClipboardData = {
          color: path.color,
          fill: path.fill,
          fillGradient: path.fillGradient,
          fillStyle: path.fillStyle,
          strokeWidth: path.strokeWidth,
      };
      setStyleLibrary(prev => [...prev, newStyle]);
  }, [paths, selectedPathIds, setStyleLibrary]);
  
  /**
   * 应用库中的样式。
   * @param style - 要应用的样式。
   */
  const handleApplyStyle = useCallback((style: StyleClipboardData) => {
      if (selectedPathIds.length > 0) {
          const sanitizeStyleForPath = (path: AnyPath): StyleClipboardData => {
              const sanitized: StyleClipboardData = { ...style };
              if (path.tool !== 'rectangle' && path.tool !== 'image' && path.tool !== 'polygon') {
                  delete sanitized.borderRadius;
              }
              if (path.tool !== 'polygon') {
                  delete sanitized.sides;
              }
              if (path.tool !== 'text') {
                  delete sanitized.fontFamily;
                  delete sanitized.fontSize;
                  delete sanitized.textAlign;
                  delete sanitized.lineHeight;
              }
              return sanitized;
          };

          const applyStyleRecursively = (path: AnyPath): AnyPath => {
              const updates = sanitizeStyleForPath(path);
              let updatedPath: AnyPath = { ...path, ...updates };
              if (updatedPath.tool === 'group') {
                  updatedPath.children = (updatedPath as GroupData).children.map(child => applyStyleRecursively(child));
              }
              return updatedPath;
          };
          pathState.setPaths(prev => prev.map(p => selectedPathIds.includes(p.id) ? applyStyleRecursively(p) : p));
      } else {
          Object.entries(style).forEach(([key, value]) => {
              if (value !== undefined) {
                  const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
                  const setter = (toolbarState as any)[setterName];
                  if (typeof setter === 'function') {
                      setter(value);
                  }
              }
          });
      }
  }, [selectedPathIds, pathState, toolbarState]);

  /**
   * 将选中的图形作为素材添加到素材库。
   */
  const handleAddMaterial = useCallback(() => {
    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const bbox = getPathsBoundingBox(selected);
      if (bbox) {
          const normalizedShapes = selected.map(p => movePath(p, -bbox.x, -bbox.y));
          setMaterialLibrary(prev => [...prev, { shapes: normalizedShapes }]);
      }
    }
  }, [paths, selectedPathIds, setMaterialLibrary]);
  
  /**
   * 将素材库中的素材应用到画布上。
   * @param material - 要应用的素材。
   * @param position - 应用的位置。
   */
  const handleApplyMaterial = useCallback((material: MaterialData, position?: Point) => {
      const newPaths: AnyPath[] = [], newIds: string[] = [];
      const materialBbox = getPathsBoundingBox(material.shapes);
      let dx = 0, dy = 0;

      if (position && materialBbox) {
          dx = position.x - (materialBbox.width / 2);
          dy = position.y - (materialBbox.height / 2);
      } else {
          const svg = document.querySelector('svg');
          if (svg) {
              const center = getPointerPosition({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }, svg);
              dx = center.x - (materialBbox?.width ?? 0) / 2;
              dy = center.y - (materialBbox?.height ?? 0) / 2;
          }
      }

      material.shapes.forEach((path, index) => {
          const newId = `${Date.now()}-mat-${index}`;
          const newPath = { ...movePath(path, dx, dy), id: newId };
          newPaths.push(newPath);
          newIds.push(newId);
      });

      pathState.setPaths((prev: any) => [...prev, ...newPaths]);
      pathState.setSelectedPathIds(newIds);
  }, [pathState, getPointerPosition]);


  /**
   * 保存样式和素材库到文件。
   */
  const handleSaveLibrary = useCallback(async () => {
    const data: LibraryData = { type: 'whiteboard/library', version: 1, styles: styleLibrary, materials: materialLibrary };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/vnd.whiteboard-library+json' });
    try {
        await fileSave(blob, {
            fileName: 'library.wblib',
            extensions: ['.wblib'],
        });
    } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error("Error saving library:", err);
    }
  }, [styleLibrary, materialLibrary]);
  
  /**
   * 从文件加载样式和素材库。
   */
  const handleLoadLibrary = useCallback(async () => {
    try {
        const file = await fileOpen({
            mimeTypes: ['application/vnd.whiteboard-library+json'],
            extensions: ['.wblib'],
        });
        if (!file) return;

        const contents = await file.text();
        const data = JSON.parse(contents);

        if (data?.type === 'whiteboard/library' && Array.isArray(data.styles) && Array.isArray(data.materials)) {
            setStyleLibrary(data.styles);
            setMaterialLibrary(data.materials);
        } else {
            alert(t('sideToolbar.styleLibraryPanel.invalidFile'));
        }
    } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error("Error opening library:", err);
    }
  }, [setStyleLibrary, setMaterialLibrary, t]);

  /**
   * 清空样式和素材库。
   */
  const handleClearLibrary = useCallback(() => {
    showConfirmation(
      t('sideToolbar.styleLibraryPanel.confirmClearTitle'),
      t('sideToolbar.styleLibraryPanel.confirmClearMessage'),
      () => {
        setStyleLibrary(() => []);
        setMaterialLibrary(() => []);
      }
    );
  }, [showConfirmation, setStyleLibrary, setMaterialLibrary, t]);

  return { handleCopyStyle, handlePasteStyle, handleAddStyle, handleApplyStyle, handleAddMaterial, handleApplyMaterial, handleSaveLibrary, handleLoadLibrary, handleClearLibrary };
};
