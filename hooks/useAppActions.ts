import React, { useCallback, useRef } from 'react';
import { getPathsBoundingBox, rectangleToVectorPath, ellipseToVectorPath, movePath, flipPath, lineToVectorPath, brushToVectorPath, polygonToVectorPath, arcToVectorPath, rotatePath } from '../lib/drawing';
import { pathsToSvgString, pathsToPngBlob } from '../lib/export';
import { importSvg } from '../lib/import';
import type { AnyPath, Point, Tool, RectangleData, EllipseData, VectorPathData, BrushPathData, PolygonData, WhiteboardData, ArcData, GroupData, StyleClipboardData, StyleLibraryData } from '../types';
import * as idb from '../lib/indexedDB';
import type { FileSystemFileHandle } from 'wicg-file-system-access';
import { fileOpen, fileSave } from 'browser-fs-access';

// Type for the file object returned by browser-fs-access when a handle is available
type FileWithHandle = File & { handle: FileSystemFileHandle };

interface AppActionsProps {
  paths: AnyPath[];
  backgroundColor: string;
  selectedPathIds: string[];
  pathState: {
    setPaths: (updater: React.SetStateAction<AnyPath[]>) => void;
    setSelectedPathIds: React.Dispatch<React.SetStateAction<string[]>>;
    handleLoadFile: (newPaths: AnyPath[]) => void;
    handleReorder: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
  };
  toolbarState: {
    setTool: (tool: Tool) => void;
  };
  viewTransform: {
    viewTransform: {
      scale: number;
    }
  };
  getPointerPosition: (e: { clientX: number, clientY: number }, svg: SVGSVGElement) => Point;
  activeFileHandle: FileSystemFileHandle | null;
  setActiveFileHandle: React.Dispatch<React.SetStateAction<FileSystemFileHandle | null>>;
  setActiveFileName: React.Dispatch<React.SetStateAction<string | null>>;
  activeFileName: string | null;
  setBackgroundColor: (color: string) => void;
  styleClipboard: StyleClipboardData | null;
  setStyleClipboard: React.Dispatch<React.SetStateAction<StyleClipboardData | null>>;
  styleLibrary: StyleClipboardData[];
  setStyleLibrary: React.Dispatch<React.SetStateAction<StyleClipboardData[]>>;
}

export const useAppActions = ({
  paths,
  backgroundColor,
  selectedPathIds,
  pathState,
  toolbarState,
  viewTransform,
  getPointerPosition,
  activeFileHandle,
  setActiveFileHandle,
  setActiveFileName,
  activeFileName,
  setBackgroundColor,
  styleClipboard,
  setStyleClipboard,
  styleLibrary,
  setStyleLibrary,
}: AppActionsProps) => {

  const importFileRef = useRef<HTMLInputElement>(null);

  const handleCopy = useCallback(async () => {
    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const clipboardData: WhiteboardData = { type: 'whiteboard/shapes', version: 1, paths: selected };
      try {
        await navigator.clipboard.writeText(JSON.stringify(clipboardData));
      } catch (err) {
        console.error("Failed to copy shapes:", err);
        alert("Could not copy shapes to clipboard.");
      }
    }
  }, [paths, selectedPathIds]);

  const handleCut = useCallback(async () => {
    if (selectedPathIds.length > 0) {
      // First, copy the selected paths to the clipboard
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const clipboardData: WhiteboardData = { type: 'whiteboard/shapes', version: 1, paths: selected };
      try {
        await navigator.clipboard.writeText(JSON.stringify(clipboardData));
        // Then, delete the paths from the canvas
        pathState.setPaths(prev => prev.filter(p => !selectedPathIds.includes(p.id)));
        pathState.setSelectedPathIds([]);
      } catch (err) {
        console.error("Failed to cut shapes:", err);
        alert("无法剪切图形到剪贴板。");
      }
    }
  }, [paths, selectedPathIds, pathState]);

  const handlePaste = useCallback(async (options?: { pasteAt?: { x: number; y: number }, clipboardText?: string }) => {
    let text = options?.clipboardText;
    if (typeof text !== 'string') {
        try { text = await navigator.clipboard.readText(); } catch (err) { return; }
    }
    if (!text) return;

    let pathsToPaste: AnyPath[] = [];
    try {
      const data: WhiteboardData = JSON.parse(text);
      if (data?.type === 'whiteboard/shapes' && Array.isArray(data.paths)) pathsToPaste = data.paths;
    } catch (err) {}

    if (pathsToPaste.length === 0) {
        const trimmedText = text.trim();
        if (trimmedText.startsWith('<svg') && trimmedText.includes('</svg')) {
            try {
                const svgPaths = importSvg(trimmedText);
                if (svgPaths.length > 0) pathsToPaste = svgPaths;
            } catch (err) {
                console.error("Failed to parse pasted SVG:", err);
                alert("粘贴的内容看起来是 SVG，但无法解析。");
                return;
            }
        }
    }
    
    if (pathsToPaste.length === 0) return;

    const newPaths: AnyPath[] = [], newIds: string[] = [];
    const copiedPathsBbox = getPathsBoundingBox(pathsToPaste);
    let dx = 20 / viewTransform.viewTransform.scale, dy = 20 / viewTransform.viewTransform.scale;

    if (options?.pasteAt && copiedPathsBbox) {
        const selectionCenterX = copiedPathsBbox.x + copiedPathsBbox.width / 2;
        const selectionCenterY = copiedPathsBbox.y + copiedPathsBbox.height / 2;
        dx = options.pasteAt.x - selectionCenterX;
        dy = options.pasteAt.y - selectionCenterY;
    }

    pathsToPaste.forEach((path, index) => {
      const newId = `${Date.now()}-${index}`;
      const newPath = { ...movePath(path, dx, dy), id: newId };
      newPaths.push(newPath);
      newIds.push(newId);
    });

    pathState.setPaths((prev: any) => [...prev, ...newPaths]);
    pathState.setSelectedPathIds(newIds);
    toolbarState.setTool('selection');
  }, [pathState, toolbarState, viewTransform.viewTransform.scale]);

  const handleFlip = useCallback((axis: 'horizontal' | 'vertical') => {
      if (selectedPathIds.length === 0) return;
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const selectionBbox = getPathsBoundingBox(selected);
      if (!selectionBbox) return;

      const center = { x: selectionBbox.x + selectionBbox.width / 2, y: selectionBbox.y + selectionBbox.height / 2 };

      pathState.setPaths((prev: any) => prev.map((p: any) => selectedPathIds.includes(p.id) ? flipPath(p, center, axis) : p));
  }, [paths, selectedPathIds, pathState.setPaths]);

  const handleConvertToPath = useCallback(() => {
    if (selectedPathIds.length === 0) return;

    const newSelectedIds: string[] = [];

    const updatedPaths = paths.map(path => {
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

    // Only update if something was actually converted.
    if (newSelectedIds.length > 0) {
      pathState.setPaths(updatedPaths);
      pathState.setSelectedPathIds(newSelectedIds);
    }
  }, [paths, selectedPathIds, pathState]);


  const handleCopyAsSvg = useCallback(async () => {
    if (selectedPathIds.length === 0) return;
    const selected = paths.filter(p => selectedPathIds.includes(p.id));
    try {
        const svgString = pathsToSvgString(selected);
        if (svgString) await navigator.clipboard.writeText(svgString);
    } catch (err) { console.error("Failed to copy SVG:", err); alert("Could not copy SVG to clipboard."); }
  }, [paths, selectedPathIds]);

  const handleCopyAsPng = useCallback(async () => {
    if (selectedPathIds.length === 0) return;
    const selected = paths.filter(p => selectedPathIds.includes(p.id));
    try {
        const blob = await pathsToPngBlob(selected, backgroundColor);
        if (blob) await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
    } catch (err) { console.error("Failed to copy PNG:", err); alert("Could not copy PNG to clipboard."); }
  }, [paths, selectedPathIds, backgroundColor]);

  const handleExportAsSvg = useCallback(async () => {
    if (paths.length === 0) {
      alert("画布为空，无法导出。");
      return;
    }
    const svgString = pathsToSvgString(paths);
    if (!svgString) {
      alert("生成 SVG 失败。");
      return;
    }
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const baseFileName = activeFileName ? activeFileName.replace(/\.whiteboard$/, '') : 'untitled';
    try {
      await fileSave(blob, {
        fileName: `${baseFileName}.svg`,
        extensions: ['.svg'],
        description: 'SVG Image',
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Failed to save SVG file:", err);
        alert("无法保存 SVG 文件。");
      }
    }
  }, [paths, activeFileName]);

  const handleExportAsPng = useCallback(async () => {
    if (paths.length === 0) {
      alert("画布为空，无法导出。");
      return;
    }
    const blob = await pathsToPngBlob(paths, backgroundColor);
    if (!blob) {
      alert("生成 PNG 失败。");
      return;
    }
    const baseFileName = activeFileName ? activeFileName.replace(/\.whiteboard$/, '') : 'untitled';
    try {
      await fileSave(blob, {
        fileName: `${baseFileName}.png`,
        extensions: ['.png'],
        description: 'PNG Image',
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Failed to save PNG file:", err);
        alert("无法保存 PNG 文件。");
      }
    }
  }, [paths, activeFileName, backgroundColor]);

  const handleImportClick = () => importFileRef.current?.click();

  const handleFileImport = useCallback(async (file: File) => {
      if (file.type !== 'image/svg+xml') { alert('Please select an SVG file.'); return; }
      try {
          const svgString = await file.text();
          const importedPaths = importSvg(svgString);
          if (importedPaths.length === 0) { alert('No editable paths found in the SVG.'); return; }
          
          const bbox = getPathsBoundingBox(importedPaths);
          const svgEl = document.querySelector('svg');
          if (bbox && svgEl) {
              const { clientWidth, clientHeight } = svgEl;
              const center = getPointerPosition({ clientX: clientWidth / 2, clientY: clientHeight / 2 }, svgEl);
              const importedCenter = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
              const dx = center.x - importedCenter.x, dy = center.y - importedCenter.y;
              const movedPaths = importedPaths.map(p => movePath(p, dx, dy));
              pathState.setPaths((prev: any) => [...prev, ...movedPaths]);
              pathState.setSelectedPathIds(movedPaths.map(p => p.id));
          } else {
               pathState.setPaths((prev: any) => [...prev, ...importedPaths]);
               pathState.setSelectedPathIds(importedPaths.map((p: any) => p.id));
          }
          toolbarState.setTool('selection');
      } catch (err) { console.error("Failed to import SVG:", err); alert("Could not import the SVG file. It might be invalid."); }
  }, [pathState, toolbarState, getPointerPosition]);

  const handleSvgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileImport(file);
      e.target.value = '';
  };

  const handleSaveAs = useCallback(async () => {
    if (paths.length === 0 && backgroundColor === '#17171c') {
      alert("画布上没有任何内容可以保存。");
      return;
    }
    const fileData: WhiteboardData = { type: 'whiteboard/shapes', version: 1, paths, backgroundColor };
    const jsonString = JSON.stringify(fileData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    try {
      const handle = await fileSave(blob, {
        fileName: activeFileName || 'untitled.whiteboard',
        extensions: ['.whiteboard'],
        description: 'Whiteboard File',
      });

      if (handle) {
        setActiveFileHandle(handle);
        setActiveFileName(handle.name);
        await idb.set('last-active-file-handle', handle);
      } else {
        // Fallback for browsers without FSA support
        setActiveFileHandle(null);
        setActiveFileName(null);
        await idb.del('last-active-file-handle');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Failed to save file:", err);
        alert("Could not save the file.");
      }
    }
  }, [paths, backgroundColor, activeFileName, setActiveFileHandle, setActiveFileName]);

  const handleSaveFile = useCallback(async () => {
    if (paths.length === 0 && backgroundColor === '#17171c') {
      alert("画布上没有任何内容可以保存。");
      return;
    }

    if (activeFileHandle) {
      const fileData: WhiteboardData = { type: 'whiteboard/shapes', version: 1, paths, backgroundColor };
      const jsonString = JSON.stringify(fileData);
      const blob = new Blob([jsonString], { type: 'application/json' });
      try {
        await fileSave(blob, undefined, activeFileHandle);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("无法保存文件:", err);
          alert("无法保存到原始文件。它可能已被移动、删除或权限已被撤销。请使用“另存为”。");
        }
      }
    } else {
      await handleSaveAs();
    }
  }, [activeFileHandle, paths, backgroundColor, handleSaveAs]);

  const handleOpen = useCallback(async () => {
    try {
      const file = await fileOpen({
        description: 'Whiteboard File',
        extensions: ['.whiteboard', '.json'],
        multiple: false,
      }) as FileWithHandle;

      const content = await file.text();
      const data: WhiteboardData = JSON.parse(content);

      if (data?.type === 'whiteboard/shapes' && Array.isArray(data.paths)) {
        pathState.handleLoadFile(data.paths);
        setBackgroundColor(data.backgroundColor ?? '#17171c');
        const handle = file.handle; // FileWithHandle has a .handle property
        setActiveFileHandle(handle || null);
        setActiveFileName(file.name);
        if (handle) {
          await idb.set('last-active-file-handle', handle);
        } else {
          await idb.del('last-active-file-handle');
        }
      } else {
        alert('无效的文件格式。');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Failed to open file:", err);
        alert('无法打开文件。它可能已损坏或格式不正确。');
      }
    }
  }, [pathState, setActiveFileHandle, setActiveFileName, setBackgroundColor]);

  const handleBringForward = useCallback(() => { pathState.handleReorder('forward'); }, [pathState]);
  const handleSendBackward = useCallback(() => { pathState.handleReorder('backward'); }, [pathState]);
  const handleBringToFront = useCallback(() => { pathState.handleReorder('front'); }, [pathState]);
  const handleSendToBack = useCallback(() => { pathState.handleReorder('back'); }, [pathState]);

  const handleGroup = useCallback(() => {
    if (selectedPathIds.length < 2) return;

    const selectedPaths = paths.filter(p => selectedPathIds.includes(p.id));
    const styleSource = selectedPaths[0];
    if (!styleSource) return;

    // Flatten any selected groups
    const childrenToGroup: AnyPath[] = [];
    selectedPaths.forEach(p => {
        if (p.tool === 'group') {
            childrenToGroup.push(...(p as GroupData).children);
        } else {
            childrenToGroup.push(p);
        }
    });

    // Extract all style properties from the source path
    const {
        color, fill, fillStyle, strokeWidth, strokeLineDash,
        strokeLineCapStart, strokeLineCapEnd, strokeLineJoin,
        endpointSize, endpointFill, isRough, opacity,
        roughness, bowing, fillWeight, hachureAngle, hachureGap,
        curveTightness, curveStepCount, preserveVertices,
        disableMultiStroke, disableMultiStrokeFill,
    } = styleSource;

    const newGroup: GroupData = {
      id: `${Date.now()}`,
      tool: 'group',
      children: childrenToGroup,
      // Group's own rotation is independent, start at 0.
      rotation: 0,
      // Copy all style properties from the first selected item
      color, fill, fillStyle, strokeWidth, strokeLineDash,
      strokeLineCapStart, strokeLineCapEnd, strokeLineJoin,
      endpointSize, endpointFill, isRough, opacity,
      roughness, bowing, fillWeight, hachureAngle, hachureGap,
      curveTightness, curveStepCount, preserveVertices,
      disableMultiStroke, disableMultiStrokeFill,
    };

    const idsToRemove = new Set(selectedPathIds);
    const newPaths = paths.filter(p => !idsToRemove.has(p.id));
    newPaths.push(newGroup);

    pathState.setPaths(newPaths);
    pathState.setSelectedPathIds([newGroup.id]);
  }, [paths, selectedPathIds, pathState]);

  const handleUngroup = useCallback(() => {
    const groupsToUngroup = paths.filter(p => selectedPathIds.includes(p.id) && p.tool === 'group') as GroupData[];
    if (groupsToUngroup.length === 0) return;

    const groupIdsToUngroup = new Set(groupsToUngroup.map(g => g.id));
    
    const remainingPaths = paths.filter(p => !groupIdsToUngroup.has(p.id));
    const childrenOfUngrouped = groupsToUngroup.flatMap(g => g.children);
    
    pathState.setPaths([...remainingPaths, ...childrenOfUngrouped]);
    pathState.setSelectedPathIds(childrenOfUngrouped.map(c => c.id));
  }, [paths, selectedPathIds, pathState]);

  const handleCopyStyle = useCallback(() => {
    if (selectedPathIds.length !== 1) return;
    const selectedPath = paths.find(p => p.id === selectedPathIds[0]);
    if (!selectedPath || selectedPath.tool === 'group') return;

    const {
      color, fill, fillStyle, strokeWidth, strokeLineDash,
      strokeLineCapStart, strokeLineCapEnd, strokeLineJoin,
      endpointSize, endpointFill, isRough, opacity,
      roughness, bowing, fillWeight, hachureAngle, hachureGap,
      curveTightness, curveStepCount, preserveVertices,
      disableMultiStroke, disableMultiStrokeFill, borderRadius, sides
    } = selectedPath as any;

    const style: StyleClipboardData = {
      color, fill, fillStyle, strokeWidth, strokeLineDash,
      strokeLineCapStart, strokeLineCapEnd, strokeLineJoin,
      endpointSize, endpointFill, isRough, opacity,
      roughness, bowing, fillWeight, hachureAngle, hachureGap,
      curveTightness, curveStepCount, preserveVertices,
      disableMultiStroke, disableMultiStrokeFill, borderRadius, sides
    };

    Object.keys(style).forEach(key => (style as any)[key] === undefined && delete (style as any)[key]);
    
    setStyleClipboard(style);
  }, [paths, selectedPathIds, setStyleClipboard]);

  const handleApplyStyle = useCallback((styleToApply: StyleClipboardData) => {
    if (!styleToApply || selectedPathIds.length === 0) return;
    
    pathState.setPaths(prevPaths =>
      prevPaths.map(p => {
        if (selectedPathIds.includes(p.id) && p.tool !== 'group') {
          const newPath = { ...p };
          for (const key in styleToApply) {
              const styleKey = key as keyof StyleClipboardData;
              if (styleKey === 'borderRadius' && (p.tool === 'rectangle' || p.tool === 'polygon' || p.tool === 'image')) {
                  (newPath as any)[styleKey] = styleToApply[styleKey];
              } else if (styleKey === 'sides' && p.tool === 'polygon') {
                  (newPath as any)[styleKey] = styleToApply[styleKey];
              } else if (styleKey !== 'borderRadius' && styleKey !== 'sides') {
                  (newPath as any)[styleKey] = styleToApply[styleKey];
              }
          }
          return newPath;
        }
        return p;
      })
    );
  }, [selectedPathIds, pathState]);
  
  const handlePasteStyle = useCallback(() => {
    if (styleClipboard) {
        handleApplyStyle(styleClipboard);
    }
  }, [styleClipboard, handleApplyStyle]);

  // --- Style Library Actions ---

  const handleAddStyle = useCallback(() => {
    if (selectedPathIds.length !== 1) return;
    const selectedPath = paths.find(p => p.id === selectedPathIds[0]);
    if (!selectedPath || selectedPath.tool === 'group') return;
  
    const {
      color, fill, fillStyle, strokeWidth, strokeLineDash,
      strokeLineCapStart, strokeLineCapEnd, strokeLineJoin,
      endpointSize, endpointFill, isRough, opacity,
      roughness, bowing, fillWeight, hachureAngle, hachureGap,
      curveTightness, curveStepCount, preserveVertices,
      disableMultiStroke, disableMultiStrokeFill, borderRadius, sides
    } = selectedPath as any;
  
    const style: StyleClipboardData = {
      color, fill, fillStyle, strokeWidth, strokeLineDash,
      strokeLineCapStart, strokeLineCapEnd, strokeLineJoin,
      endpointSize, endpointFill, isRough, opacity,
      roughness, bowing, fillWeight, hachureAngle, hachureGap,
      curveTightness, curveStepCount, preserveVertices,
      disableMultiStroke, disableMultiStrokeFill, borderRadius, sides
    };
  
    Object.keys(style).forEach(key => (style as any)[key] === undefined && delete (style as any)[key]);
    
    setStyleLibrary(prev => [...prev, style]);
  }, [paths, selectedPathIds, setStyleLibrary]);

  const handleSaveStyleLibrary = useCallback(async () => {
    if (styleLibrary.length === 0) {
        alert("样式库为空，无需保存。");
        return;
    }
    const fileData: StyleLibraryData = { type: 'whiteboard/style-library', version: 1, styles: styleLibrary };
    const jsonString = JSON.stringify(fileData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    try {
        await fileSave(blob, {
            fileName: 'styles.stylelib',
            extensions: ['.stylelib'],
            description: 'Whiteboard Style Library',
        });
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error("Failed to save style library:", err);
            alert("无法保存样式库。");
        }
    }
  }, [styleLibrary]);

  const handleLoadStyleLibrary = useCallback(async () => {
      try {
          const file = await fileOpen({
              description: 'Whiteboard Style Library',
              extensions: ['.stylelib'],
              multiple: false,
          });

          const content = await file.text();
          const data: StyleLibraryData = JSON.parse(content);

          if (data?.type === 'whiteboard/style-library' && Array.isArray(data.styles)) {
              if (styleLibrary.length > 0 && !window.confirm("这将替换您当前的样式库。要继续吗？")) {
                  return;
              }
              setStyleLibrary(data.styles);
          } else {
              alert('无效的样式库文件格式。');
          }
      } catch (err: any) {
          if (err.name !== 'AbortError') {
              console.error("Failed to load style library:", err);
              alert("无法加载样式库。文件可能已损坏。");
          }
      }
  }, [styleLibrary.length, setStyleLibrary]);


  return {
    importFileRef,
    handleCopy,
    handlePaste,
    handleCut,
    handleFlip,
    handleConvertToPath,
    handleCopyAsSvg,
    handleCopyAsPng,
    handleExportAsSvg,
    handleExportAsPng,
    handleImportClick,
    handleFileImport,
    handleSvgFileChange,
    handleSaveFile,
    handleSaveAs,
    handleOpen,
    handleBringForward,
    handleSendBackward,
    handleBringToFront,
    handleSendToBack,
    handleGroup,
    handleUngroup,
    handleCopyStyle,
    handlePasteStyle,
    handleApplyStyle,
    handleAddStyle,
    handleSaveStyleLibrary,
    handleLoadStyleLibrary,
  };
};
