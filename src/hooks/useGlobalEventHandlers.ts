/**
 * 本文件定义了一个自定义 Hook (useGlobalEventHandlers)，用于集中管理全局事件监听器。
 * 它负责处理整个应用的键盘快捷键（hotkeys）和剪贴板事件（如复制、粘贴、剪切）。
 */

import React, { useEffect, Dispatch, SetStateAction, useRef } from 'react';
import hotkeys from 'hotkeys-js';
import type { AnyPath, DrawingShape, ImageData, Point, Tool, VectorPathData, SelectionMode } from '../types';
import { movePath } from '../lib/drawing';
import { useAppContext } from '../context/AppContext';


const useGlobalEventHandlers = () => {
  const {
    selectedPathIds, setSelectedPathIds,
    currentPenPath, handleCancelPenPath, handleFinishPenPath,
    currentLinePath, handleCancelLinePath, handleFinishLinePath,
    undo: handleUndo, redo: handleRedo, handleDeleteSelected, setPaths,
    beginCoalescing, endCoalescing,
    tool, selectionMode, handleSetTool: setTool, setSelectionMode,
    drawingInteraction,
    isGridVisible, setIsGridVisible,
    handleCut, handleCopy, handlePaste, handleImportClick, handleFileImport, handleSaveFile, 
    handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack,
    handleGroup, handleUngroup,
    getPointerPosition, viewTransform: vt, lastPointerPosition,
    groupIsolationPath, handleExitGroup,
    activePathState,
    croppingState,
    currentCropRect,
    cropTool,
    nudgeCropRect,
    cancelCrop,
  } = useAppContext();

  const { drawingShape, cancelDrawingShape } = drawingInteraction;

  const nudgeTimeoutRef = useRef<number | null>(null);

  // Handle keyboard shortcuts using hotkeys-js library
  useEffect(() => {
    // --- Group 1: Shortcuts that should respect the default input filter ---
    // These will NOT fire when an INPUT, SELECT, or TEXTAREA is focused.
    hotkeys('v,m,b,p,r,o,l,a,escape,enter,backspace,delete,t,f', (event, handler) => {
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
        case 't': setTool('text'); break;
        case 'f': setTool('frame'); break;
        case 'escape':
          if (croppingState) {
            cancelCrop();
          } else if (groupIsolationPath.length > 0) {
            handleExitGroup();
          } else if (selectedPathIds.length > 0) {
            setSelectedPathIds([]);
          } else if (currentPenPath) {
            handleCancelPenPath();
          } else if (currentLinePath) {
            handleCancelLinePath();
          } else if (drawingShape) {
            cancelDrawingShape();
          }
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

    hotkeys('command+g, ctrl+g', (event) => {
      event.preventDefault();
      handleGroup();
    });

    hotkeys('command+shift+g, ctrl+shift+g', (event) => {
      event.preventDefault();
      handleUngroup();
    });

    // --- Group 2: Shortcuts that MUST fire even in input fields ---
    // We temporarily override the filter for these.
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
    
    hotkeys('command+i, ctrl+i', (event) => {
      event.preventDefault();
      handleImportClick();
    });

    hotkeys('command+s, ctrl+s', (event) => {
      event.preventDefault();
      void handleSaveFile();
    });
    
    // --- Group 3: Shortcuts with their own internal input-checking logic ---
    // These can be bound while the filter is off, as they handle it themselves.
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

    // IMPORTANT: Restore the filter immediately after binding the exceptions.
    hotkeys.filter = originalFilter;

    // Cleanup on unmount
    return () => {
      hotkeys.unbind('v,m,b,p,r,o,l,a,escape,enter,backspace,delete,t,f');
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
    setIsGridVisible,
    groupIsolationPath,
    handleExitGroup,
    croppingState,
    cancelCrop,
  ]);

  const { setPaths: updateActivePaths } = activePathState;

  // Nudge selected items with arrow keys using a native event listener for reliability
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, shiftKey, target } = event;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        return;
      }

      const activeElement = target as HTMLElement;
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable) {
        return;
      }

      const amount = shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      switch (key) {
        case 'ArrowUp': dy = -amount; break;
        case 'ArrowDown': dy = amount; break;
        case 'ArrowLeft': dx = -amount; break;
        case 'ArrowRight': dx = amount; break;
      }

      const isCroppingSelection =
        cropTool === 'crop' &&
        Boolean(croppingState && currentCropRect) &&
        selectedPathIds.length === 1 &&
        croppingState?.pathId === selectedPathIds[0];

      if (isCroppingSelection) {
        event.preventDefault();

        if (dx !== 0 || dy !== 0) {
          nudgeCropRect(dx, dy);
        }

        return;
      }

      if (tool === 'selection' && selectionMode === 'move' && selectedPathIds.length > 0) {
        event.preventDefault();

        if (!nudgeTimeoutRef.current) {
          beginCoalescing();
        } else {
          clearTimeout(nudgeTimeoutRef.current);
        }

        if (dx !== 0 || dy !== 0) {
          updateActivePaths((currentPaths: AnyPath[]) =>
            currentPaths.map((p) =>
              selectedPathIds.includes(p.id) ? movePath(p, dx, dy) : p
            )
          );
        }

        nudgeTimeoutRef.current = window.setTimeout(() => {
          endCoalescing();
          nudgeTimeoutRef.current = null;
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (nudgeTimeoutRef.current) {
        clearTimeout(nudgeTimeoutRef.current);
      }
    };
  }, [
    tool,
    selectionMode,
    selectedPathIds,
    updateActivePaths,
    beginCoalescing,
    endCoalescing,
    cropTool,
    croppingState,
    currentCropRect,
    nudgeCropRect,
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

                            let width = img.width;
                            let height = img.height;

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

            // Priority 2: Check for Excalidraw JSON in clipboard items.
            for (const item of items) {
                if (item.type === 'application/vnd.excalidraw+json') {
                    event.preventDefault();
                    item.getAsString((str) => {
                        let pasteAt: Point | undefined;
                        if (lastPointerPosition) {
                            pasteAt = lastPointerPosition;
                        } else {
                            const svg = document.querySelector('svg');
                            if (svg) {
                                pasteAt = getPointerPosition(
                                    { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 },
                                    svg
                                );
                            }
                        }
                        void handlePaste({ pasteAt, clipboardText: str });
                    });
                    return;
                }
            }
        }

        // Priority 3: If no image or Excalidraw data was found, check for our shape data.
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
  }, [handlePaste, getPointerPosition, setPaths, setSelectedPathIds, setTool, vt.scale, lastPointerPosition]);
};

export default useGlobalEventHandlers;
