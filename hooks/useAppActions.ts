
import React, { useCallback, useRef } from 'react';
import { getPathsBoundingBox, rectangleToVectorPath, ellipseToVectorPath, movePath, flipPath } from '../lib/geometry';
import { pathsToSvgString, pathsToPngBlob } from '../lib/export';
import { importSvg } from '../lib/import';
import type { AnyPath, Point, Tool, RectangleData, EllipseData, VectorPathData } from '../types';
import * as idb from '../lib/indexedDB';
import type { FileSystemFileHandle, FileSystemHandlePermissionDescriptor } from 'wicg-file-system-access';

const IS_CROSS_ORIGIN_IFRAME = (() => {
  try {
    // Accessing top.location.href will throw a security error in a cross-origin iframe
    return !window.top.location.href;
  } catch (e) {
    return true;
  }
})();

interface AppActionsProps {
  paths: AnyPath[];
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
}

// Define a type for the window object that includes the File System Access API methods.
// This provides type safety for these experimental APIs without polluting the global scope.
interface WindowWithFSA extends Window {
  showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
}

async function verifyPermission(fileHandle: FileSystemFileHandle, readWrite: boolean): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  // Check if permission was already granted
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  // Request permission
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  // The user denied permission
  return false;
}

export const useAppActions = ({
  paths,
  selectedPathIds,
  pathState,
  toolbarState,
  viewTransform,
  getPointerPosition,
  activeFileHandle,
  setActiveFileHandle,
  setActiveFileName,
  activeFileName,
}: AppActionsProps) => {

  const importFileRef = useRef<HTMLInputElement>(null);

  const handleCopy = useCallback(async () => {
    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const clipboardData = { type: 'whiteboard/shapes', version: 1, paths: selected };
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
      const clipboardData = { type: 'whiteboard/shapes', version: 1, paths: selected };
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
      const data = JSON.parse(text);
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
            let convertedPath: VectorPathData | null = null;
            if (path.tool === 'rectangle') {
                convertedPath = rectangleToVectorPath(path as RectangleData);
            } else if (path.tool === 'ellipse') {
                convertedPath = ellipseToVectorPath(path as EllipseData);
            }
            
            if (convertedPath) {
                newSelectedIds.push(convertedPath.id);
                return convertedPath;
            }
        }
        return path;
    });

    pathState.setPaths(updatedPaths);
    pathState.setSelectedPathIds(newSelectedIds);
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
        const blob = await pathsToPngBlob(selected);
        if (blob) await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
    } catch (err) { console.error("Failed to copy PNG:", err); alert("Could not copy PNG to clipboard."); }
  }, [paths, selectedPathIds]);

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
    if (paths.length === 0) {
      alert("画布上没有任何内容可以保存。");
      return;
    }
    const fileData = { type: 'whiteboard/shapes', version: 1, paths };
    const jsonString = JSON.stringify(fileData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    const fallbackSave = () => {
        const suggestedName = activeFileName || 'untitled.whiteboard';
        let fileName = window.prompt("请输入文件名：", suggestedName);

        if (fileName === null) {
            return; // User cancelled
        }

        if (fileName.trim() === '') {
            fileName = 'untitled';
        }
        
        if (!fileName.toLowerCase().endsWith('.whiteboard')) {
            fileName += '.whiteboard';
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if ('showSaveFilePicker' in window && !IS_CROSS_ORIGIN_IFRAME) {
      try {
        const handle = await (window as unknown as WindowWithFSA).showSaveFilePicker({
          suggestedName: activeFileName || 'untitled.whiteboard',
          types: [{ description: 'Whiteboard File', accept: { 'application/json': ['.whiteboard'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        setActiveFileHandle(handle);
        setActiveFileName(handle.name);
        await idb.set('last-active-file-handle', handle);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("File System Access API failed, falling back to legacy save.", err);
          fallbackSave();
        }
      }
    } else {
      fallbackSave();
    }
  }, [paths, setActiveFileHandle, setActiveFileName, activeFileName]);

  const handleSaveFile = useCallback(async () => {
    if (paths.length === 0) {
      alert("画布上没有任何内容可以保存。");
      return;
    }

    if (activeFileHandle) {
      try {
        if (!(await verifyPermission(activeFileHandle, true))) {
          alert("无法获取保存权限。请重试并授予权限，或使用“另存为”保存副本。");
          return;
        }
        const writable = await activeFileHandle.createWritable();
        const fileData = { type: 'whiteboard/shapes', version: 1, paths };
        const jsonString = JSON.stringify(fileData);
        const blob = new Blob([jsonString], { type: 'application/json' });
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        console.error("无法保存文件:", err);
        // Do not clear the file handle or force a "Save As".
        // This allows the user to retry saving if the error was temporary (e.g., a denied permission prompt).
        // The user can manually choose "Save As" if the file was moved or deleted.
        alert("无法保存到原始文件。它可能已被移动、删除或权限已被撤销。请重试或使用“另存为”。");
      }
    } else {
      await handleSaveAs();
    }
  }, [activeFileHandle, paths, handleSaveAs]);

  const handleOpen = useCallback(async () => {
    const fallbackOpen = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.whiteboard,.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const content = await file.text();
          const data = JSON.parse(content);
          if (data?.type === 'whiteboard/shapes' && Array.isArray(data.paths)) {
            pathState.handleLoadFile(data.paths);
            // Clear handle as we can't get one this way
            setActiveFileHandle(null);
            setActiveFileName(file.name);
            await idb.del('last-active-file-handle');
          } else {
            alert('无效的文件格式。');
          }
        } catch (err) {
          console.error("Failed to open file:", err);
          alert('无法打开文件。它可能已损坏或格式不正确。');
        }
      };
      input.click();
    };

    if ('showOpenFilePicker' in window && !IS_CROSS_ORIGIN_IFRAME) {
      try {
        const [handle] = await (window as unknown as WindowWithFSA).showOpenFilePicker({
          types: [{ description: 'Whiteboard File', accept: { 'application/json': ['.whiteboard', '.json'] } }],
          multiple: false,
        });

        if (!(await verifyPermission(handle, false))) {
          alert("无法打开文件，因为未授予读取权限。");
          return;
        }

        const file = await handle.getFile();
        const content = await file.text();
        const data = JSON.parse(content);

        if (data?.type === 'whiteboard/shapes' && Array.isArray(data.paths)) {
          pathState.handleLoadFile(data.paths);
          setActiveFileHandle(handle);
          setActiveFileName(handle.name);
          await idb.set('last-active-file-handle', handle);
        } else {
          alert('无效的文件格式。');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("File System Access API failed, falling back to legacy open.", err);
          fallbackOpen();
        }
      }
    } else {
      fallbackOpen();
    }
  }, [pathState, setActiveFileHandle, setActiveFileName]);

  const handleBringForward = useCallback(() => { pathState.handleReorder('forward'); }, [pathState]);
  const handleSendBackward = useCallback(() => { pathState.handleReorder('backward'); }, [pathState]);
  const handleBringToFront = useCallback(() => { pathState.handleReorder('front'); }, [pathState]);
  const handleSendToBack = useCallback(() => { pathState.handleReorder('back'); }, [pathState]);

  return {
    importFileRef,
    handleCopy,
    handlePaste,
    handleCut,
    handleFlip,
    handleConvertToPath,
    handleCopyAsSvg,
    handleCopyAsPng,
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
  };
};
