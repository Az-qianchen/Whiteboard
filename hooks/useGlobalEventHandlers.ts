/**
 * 本文件定义了一个自定义 Hook (useGlobalEventHandlers)，用于集中管理全局事件监听器。
 * 它负责处理整个应用的键盘快捷键（hotkeys）和剪贴板事件（如复制、粘贴、剪切）。
 */

import React, { useEffect, Dispatch, SetStateAction } from 'react';
import hotkeys from 'hotkeys-js';
import type { AnyPath, DrawingShape, ImageData, Point, Tool, VectorPathData, SelectionMode } from '../types';

// By defining the props interface directly, we break the module import cycle
// that was likely causing type resolution issues in other files.
interface GlobalEventHandlersProps {
  // from usePaths
  selectedPathIds: string[];
  setSelectedPathIds: Dispatch<SetStateAction<string[]>>;
  currentPenPath: VectorPathData | null;
  handleCancelPenPath: () => void;
  handleFinishPenPath: (isClosed?: boolean) => void;
  currentLinePath: VectorPathData | null;
  handleCancelLinePath: () => void;
  handleFinishLinePath: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleDeleteSelected: () => void;
  setPaths: (updater: React.SetStateAction<AnyPath[]>) => void;
  // from useToolbarState
  setTool: (tool: Tool) => void;
  setSelectionMode: Dispatch<SetStateAction<SelectionMode>>;
  // from usePointerInteraction
  drawingShape: DrawingShape | null;
  cancelDrawingShape: () => void;
  // from App
  isGridVisible: boolean;
  setIsGridVisible: Dispatch<SetStateAction<boolean>>;
  handleCut: () => void | Promise<void>;
  handleCopy: () => void | Promise<void>;
  handlePaste: (options?: { pasteAt?: { x: number; y: number }, clipboardText?: string }) => void | Promise<void>;
  handleImportClick: () => void;
  handleFileImport: (file: File) => void | Promise<void>;
  handleSaveFile: () => void | Promise<void>;
  handleBringForward: () => void;
  handleSendBackward: () => void;
  handleBringToFront: () => void;
  handleSendToBack: () => void;
  handleGroup: () => void;
  handleUngroup: () => void;
  getPointerPosition: (e: { clientX: number, clientY: number }, svg: SVGSVGElement) => Point;
  viewTransform: { scale: number };
  lastPointerPosition: Point | null;
}


const useGlobalEventHandlers = ({
  // from usePaths
  selectedPathIds, setSelectedPathIds,
  currentPenPath, handleCancelPenPath, handleFinishPenPath,
  currentLinePath, handleCancelLinePath, handleFinishLinePath,
  handleUndo, handleRedo, handleDeleteSelected, setPaths,
  // from useToolbarState
  setTool, setSelectionMode,
  // from usePointerInteraction
  drawingShape, cancelDrawingShape,
  // from App
  isGridVisible, setIsGridVisible, handleCut, handleCopy, handlePaste, handleImportClick, handleFileImport, handleSaveFile, 
  handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack,
  handleGroup, handleUngroup,
  getPointerPosition, viewTransform, lastPointerPosition
}: GlobalEventHandlersProps) => {

  // Handle keyboard shortcuts using hotkeys-js library
  useEffect(() => {
    // These shortcuts should follow the default filter (not trigger in inputs)
    hotkeys('v,m,b,p,r,o,l,a,escape,enter,backspace,delete', (event, handler) => {
      event.preventDefault();
      switch (handler.key) {
        case 'v': setTool('selection'); setSelectionMode('edit'); break;
        case 'm': setTool('selection'); setSelectionMode('move'); break;
        case 'b': setTool('brush'); break;
        case 'p': setTool('pen'); break;
        case 'r': setTool('rectangle'); break;
        case 'o': setTool('ellipse'); break;
        case 'l': setTool('line'); break;
        case 'a': setTool('arc'); break;
        case 'escape':
          if (selectedPathIds.length > 0) setSelectedPathIds([]);
          if (currentPenPath) handleCancelPenPath();
          if (currentLinePath) handleCancelLinePath();
          if (drawingShape) cancelDrawingShape();
          break;
        case 'enter':
          if (currentPenPath) handleFinishPenPath();
          if (currentLinePath) handleFinishLinePath();
          break;
        case 'backspace':
        case 'delete':
          handleDeleteSelected();
          break;
      }
    });

    hotkeys('g', (event) => {
      event.preventDefault();
      setIsGridVisible(!isGridVisible);
    });

    hotkeys('],[,shift+],shift+[', (event, handler) => {
      event.preventDefault();
      switch (handler.key) {
        case ']': handleBringForward(); break;
        case '[': handleSendBackward(); break;
        case 'shift+]': handleBringToFront(); break;
        case 'shift+[': handleSendToBack(); break;
      }
    });

    // For undo/redo/copy/paste, we want them to work even in input fields.
    const originalFilter = hotkeys.filter;
    hotkeys.filter = () => true;

    hotkeys('command+z, ctrl+z', (event) => {
        event.preventDefault();
        handleUndo();
    });

    hotkeys('command+shift+z, ctrl+shift+z', (event) => {
        event.preventDefault();
        handleRedo();
    });
    
    hotkeys('command+x, ctrl+x', (event) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || (activeElement as HTMLElement)?.isContentEditable;
      if (!isInput) {
        event.preventDefault();
        void handleCut();
      }
    });

    hotkeys('command+c, ctrl+c', (event) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || (activeElement as HTMLElement)?.isContentEditable;
      if (!isInput) {
        event.preventDefault();
        void handleCopy();
      }
    });
    
    hotkeys('command+i, ctrl+i', (event) => {
      event.preventDefault();
      handleImportClick();
    });

    hotkeys('command+s, ctrl+s', (event) => {
      event.preventDefault();
      void handleSaveFile();
    });

    hotkeys('command+g, ctrl+g', (event) => {
      event.preventDefault();
      handleGroup();
    });

    hotkeys('command+shift+g, ctrl+shift+g', (event) => {
      event.preventDefault();
      handleUngroup();
    });

    // Cleanup on unmount
    return () => {
      hotkeys.filter = originalFilter;
      hotkeys.unbind('v,m,b,p,r,o,l,a,escape,enter,backspace,delete');
      hotkeys.unbind('g');
      hotkeys.unbind('],[,shift+],shift+[');
      hotkeys.unbind('command+z, ctrl+z');
      hotkeys.unbind('command+shift+z, ctrl+shift+z');
      hotkeys.unbind('command+x, ctrl+x');
      hotkeys.unbind('command+c, ctrl+c');
      hotkeys.unbind('command+i, ctrl+i');
      hotkeys.unbind('command+s, ctrl+s');
      hotkeys.unbind('command+g, ctrl+g');
      hotkeys.unbind('command+shift+g, ctrl+shift+g');
    };
  }, [
    selectedPathIds,
    setSelectedPathIds,
    setTool,
    setSelectionMode,
    currentPenPath,
    currentLinePath,
    handleCancelPenPath,
    handleFinishPenPath,
    handleCancelLinePath,
    handleFinishLinePath,
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    drawingShape,
    cancelDrawingShape,
    handleCut,
    handleCopy,
    handlePaste,
    handleImportClick,
    handleSaveFile,
    handleBringForward,
    handleSendBackward,
    handleBringToFront,
    handleSendToBack,
    handleGroup,
    handleUngroup,
    isGridVisible,
    setIsGridVisible
  ]);

  // Global paste handler for images and shapes
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
        // Priority 1: Check for an image in the clipboard items.
        const items = event.clipboardData?.items;
        if (items) {
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    event.preventDefault();
                    const blob = item.getAsFile();
                    if (!blob) continue;

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const src = e.target?.result as string;
                        if (!src) return;

                        const img = new Image();
                        img.onload = () => {
                            let pasteAt: Point;
                            if (lastPointerPosition) {
                                pasteAt = lastPointerPosition;
                            } else {
                                const svg = document.querySelector('svg');
                                if (!svg) return;
                                pasteAt = getPointerPosition(
                                    { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 },
                                    svg
                                );
                            }

                            const MAX_DIM = 400 / viewTransform.scale;
                            let width = img.width;
                            let height = img.height;
                            if (width > MAX_DIM || height > MAX_DIM) {
                                const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                                width *= ratio;
                                height *= ratio;
                            }

                            const newImage: ImageData = {
                                id: Date.now().toString(),
                                tool: 'image',
                                src,
                                opacity: 1,
                                x: pasteAt.x - width / 2,
                                y: pasteAt.y - height / 2,
                                width,
                                height,
                                color: 'transparent',
                                fill: 'transparent',
                                fillStyle: 'solid',
                                strokeWidth: 0,
                                roughness: 0, bowing: 0, fillWeight: -1, hachureAngle: -41, hachureGap: -1, curveTightness: 0, curveStepCount: 9,
                            };

                            setPaths((prev: AnyPath[]) => [...prev, newImage]);
                            setSelectedPathIds([newImage.id]);
                            setTool('selection' as Tool);
                        };
                        img.src = src;
                    };
                    reader.readAsDataURL(blob);
                    // Image found and handled, so we can exit.
                    return; 
                }
            }
        }
        
        // Priority 2: If no image was found, check for our shape data.
        const target = event.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        if (!isInput) {
             event.preventDefault();

             const clipboardText = event.clipboardData?.getData('text/plain');
             if (!clipboardText) return;

             // Paste to the last known mouse position, or fallback to viewport center
             if (lastPointerPosition) {
                 void handlePaste({ pasteAt: lastPointerPosition, clipboardText });
             } else {
                 const svg = document.querySelector('svg');
                 if (svg) {
                     const center = getPointerPosition(
                         { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 },
                         svg
                     );
                     void handlePaste({ pasteAt: center, clipboardText });
                 } else {
                     void handlePaste({ clipboardText }); // Fallback if svg isn't found
                 }
             }
        }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
        document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [handlePaste, getPointerPosition, setPaths, setSelectedPathIds, setTool, viewTransform.scale, lastPointerPosition]);
  
  // Global drag-and-drop handler for SVG files
  useEffect(() => {
      const handleDrop = (e: DragEvent) => {
          e.preventDefault();
          const file = e.dataTransfer?.files?.[0];
          if (file && file.type === 'image/svg+xml') {
              void handleFileImport(file);
          }
      };
      const handleDragOver = (e: DragEvent) => {
          e.preventDefault();
      };

      window.addEventListener('drop', handleDrop);
      window.addEventListener('dragover', handleDragOver);

      return () => {
          window.removeEventListener('drop', handleDrop);
          window.removeEventListener('dragover', handleDragOver);
      };
  }, [handleFileImport]);
};

export default useGlobalEventHandlers;