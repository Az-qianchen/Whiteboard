/**
 * 本文件定义了一个自定义 Hook (useGlobalEventHandlers)，用于集中管理全局事件监听器。
 * 它负责处理整个应用的键盘快捷键（hotkeys）和剪贴板事件（如复制、粘贴、剪切）。
 */

import React, { useEffect, Dispatch, SetStateAction, useRef, useCallback } from 'react';
import hotkeys from 'hotkeys-js';
import type { AnyPath, DrawingShape, ImageData, Point, Tool, VectorPathData, SelectionMode, GroupData } from '../types';
import { movePath, getPathsBoundingBox, scalePathUniformWithStyles } from '@/lib/drawing';
import { useAppContext } from '../context/AppContext';
import { useFilesStore } from '@/context/filesStore';
import { getCachedImage } from '@/lib/imageCache';
import { recursivelyUpdatePaths } from '@/hooks/selection-logic/utils';


type KeyboardScaleState = {
  pathIds: string[];
  originalPaths: AnyPath[];
  pivot: Point;
  initialDistance: number;
  pointerScale: number;
  currentScale: number;
  inputBuffer: string;
  pointerLocked: boolean;
  applyScale: (scale: number, options?: { fromPointer?: boolean }) => void;
  cleanup: () => void;
};


const useGlobalEventHandlers = () => {
  const {
    selectedPathIds, setSelectedPathIds,
    currentPenPath, handleCancelPenPath, handleFinishPenPath,
    currentLinePath, handleCancelLinePath, handleFinishLinePath,
    undo: handleUndo, redo: handleRedo, handleDeleteSelected,
    beginCoalescing, endCoalescing,
    tool, selectionMode, handleSetTool: setTool, setSelectionMode,
    drawingInteraction,
    isGridVisible, setIsGridVisible,
    handleCut, handleCopy, handleCopyAsPng, handlePaste, handleImportClick, handleFileImport, handleSaveFile,
    handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack,
    handleGroup, handleUngroup,
    getPointerPosition, viewTransform: vt,
    groupIsolationPath, handleExitGroup, activePathState,
    croppingState, currentCropRect, setCurrentCropRect, pushCropHistory,
    cancelCrop,
  } = useAppContext();

  const { setPaths: setActivePaths, paths: activePaths } = activePathState;

  const { drawingShape, cancelDrawingShape } = drawingInteraction;

  const nudgeTimeoutRef = useRef<number | null>(null);
  const cropNudgeTimeoutRef = useRef<number | null>(null);
  const cropHistoryPendingRef = useRef(false);
  const keyboardScaleRef = useRef<KeyboardScaleState | null>(null);

  const finishKeyboardScale = useCallback((commit: boolean) => {
    const state = keyboardScaleRef.current;
    if (!state) {
      return;
    }

    keyboardScaleRef.current = null;
    state.cleanup();

    if (!commit) {
      const originalMap = new Map(state.originalPaths.map(path => [path.id, path]));
      setActivePaths((currentPaths: AnyPath[]) =>
        recursivelyUpdatePaths(currentPaths, (path: AnyPath) => originalMap.get(path.id) || null),
      );
    } else {
      state.applyScale(state.currentScale);
    }

    endCoalescing();
  }, [setActivePaths, endCoalescing]);

  const finishKeyboardScaleRef = useRef(finishKeyboardScale);
  useEffect(() => {
    finishKeyboardScaleRef.current = finishKeyboardScale;
  }, [finishKeyboardScale]);

  const startKeyboardScale = useCallback(() => {
    if (keyboardScaleRef.current) {
      return;
    }
    if (tool !== 'selection' || selectionMode !== 'move') {
      return;
    }
    if (croppingState) {
      return;
    }
    if (selectedPathIds.length === 0) {
      return;
    }

    const idSet = new Set(selectedPathIds);
    const collected = new Map<string, AnyPath>();
    const collectPaths = (paths: AnyPath[]) => {
      paths.forEach(path => {
        if (idSet.has(path.id)) {
          collected.set(path.id, path);
        }
        if (path.tool === 'group') {
          collectPaths((path as GroupData).children);
        }
      });
    };
    collectPaths(activePaths);

    const orderedPaths: AnyPath[] = [];
    selectedPathIds.forEach(id => {
      const found = collected.get(id);
      if (found) {
        orderedPaths.push(found);
      }
    });

    if (orderedPaths.length === 0) {
      return;
    }

    const bbox = getPathsBoundingBox(orderedPaths, false);
    if (!bbox) {
      return;
    }

    const pivot = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
    const fallbackRadius = Math.max(bbox.width, bbox.height, 1);
    const pointerFromStore = vt.getLastPointerPosition?.();
    const initialPointer = pointerFromStore ?? { x: pivot.x + fallbackRadius, y: pivot.y };
    let initialDistance = Math.hypot(initialPointer.x - pivot.x, initialPointer.y - pivot.y);
    if (!Number.isFinite(initialDistance) || initialDistance < 1e-6) {
      initialDistance = 1;
    }

    const state: KeyboardScaleState = {
      pathIds: [...selectedPathIds],
      originalPaths: orderedPaths,
      pivot,
      initialDistance,
      pointerScale: 1,
      currentScale: 1,
      inputBuffer: '',
      pointerLocked: false,
      applyScale: () => {},
      cleanup: () => {},
    };

    const applyScale = (scale: number, options?: { fromPointer?: boolean }) => {
      const fromPointer = options?.fromPointer ?? false;
      const magnitude = Math.max(Math.abs(scale), 0.01);
      if (fromPointer) {
        state.pointerScale = magnitude;
      }
      if (Math.abs(magnitude - state.currentScale) < 1e-4) {
        state.currentScale = magnitude;
        return;
      }
      state.currentScale = magnitude;

      const scaledPaths = state.originalPaths.map(path => scalePathUniformWithStyles(path, pivot, magnitude));
      const transformed = new Map(scaledPaths.map(path => [path.id, path]));
      setActivePaths((currentPaths: AnyPath[]) =>
        recursivelyUpdatePaths(currentPaths, (path: AnyPath) => transformed.get(path.id) || null),
      );
    };
    state.applyScale = applyScale;

    const ensureCanvas = (): SVGSVGElement | null => {
      const svg = document.querySelector('svg[data-whiteboard-canvas]');
      return svg instanceof SVGSVGElement ? svg : null;
    };

    const pointerMoveListener = (event: PointerEvent) => {
      if (!keyboardScaleRef.current) {
        return;
      }
      if (state.pointerLocked) {
        return;
      }
      const svg = ensureCanvas();
      if (!svg) {
        return;
      }
      const point = getPointerPosition({ clientX: event.clientX, clientY: event.clientY }, svg);
      const distance = Math.hypot(point.x - pivot.x, point.y - pivot.y);
      const ratio = distance / state.initialDistance;
      state.inputBuffer = '';
      state.applyScale(Number.isFinite(ratio) && ratio > 0 ? ratio : 0.01, { fromPointer: true });
    };

    const pointerDownListener = (event: PointerEvent) => {
      if (!keyboardScaleRef.current) {
        return;
      }
      if (event.button === 0) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        finishKeyboardScale(true);
      } else if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        finishKeyboardScale(false);
      }
    };

    const contextMenuListener = (event: MouseEvent) => {
      if (!keyboardScaleRef.current) {
        return;
      }
      event.preventDefault();
    };

    const updateFromBuffer = () => {
      if (!state.inputBuffer) {
        return;
      }
      const numeric = Number.parseFloat(state.inputBuffer);
      if (Number.isNaN(numeric)) {
        return;
      }
      state.applyScale(numeric);
    };

    const keyDownListener = (event: KeyboardEvent) => {
      if (!keyboardScaleRef.current) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        finishKeyboardScale(false);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        finishKeyboardScale(true);
        return;
      }
      if (event.key === 'Backspace') {
        if (state.inputBuffer.length === 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        state.inputBuffer = state.inputBuffer.slice(0, -1);
        if (state.inputBuffer.length === 0) {
          state.pointerLocked = false;
          state.applyScale(state.pointerScale);
        } else {
          updateFromBuffer();
        }
        return;
      }
      if (event.key === '.' || event.key === ',') {
        if (state.inputBuffer.includes('.')) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        state.inputBuffer += '.';
        state.pointerLocked = true;
        updateFromBuffer();
        return;
      }
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        state.inputBuffer += event.key;
        state.pointerLocked = true;
        updateFromBuffer();
      }
    };

    state.cleanup = () => {
      window.removeEventListener('pointermove', pointerMoveListener);
      window.removeEventListener('pointerdown', pointerDownListener, true);
      window.removeEventListener('keydown', keyDownListener, true);
      window.removeEventListener('contextmenu', contextMenuListener, true);
    };

    window.addEventListener('pointermove', pointerMoveListener);
    window.addEventListener('pointerdown', pointerDownListener, true);
    window.addEventListener('keydown', keyDownListener, true);
    window.addEventListener('contextmenu', contextMenuListener, true);

    keyboardScaleRef.current = state;
    beginCoalescing();
  }, [
    keyboardScaleRef,
    tool,
    selectionMode,
    croppingState,
    selectedPathIds,
    activePaths,
    getPointerPosition,
    setActivePaths,
    finishKeyboardScale,
    beginCoalescing,
  ]);

  // Handle keyboard shortcuts using hotkeys-js library
  useEffect(() => {
    // --- Group 1: Shortcuts that should respect the default input filter ---
    // These will NOT fire when an INPUT, SELECT, or TEXTAREA is focused.
    hotkeys('v,m,b,p,r,o,l,a,escape,enter,backspace,delete,t,f', (event, handler) => {
      event.preventDefault();
      if (keyboardScaleRef.current) {
        if (handler.key === 'escape') {
          finishKeyboardScale(false);
        }
        return;
      }
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
      if (keyboardScaleRef.current) {
        return;
      }
      setIsGridVisible(!isGridVisible);
    });

    hotkeys('s', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      event.preventDefault();
      if (keyboardScaleRef.current) {
        return;
      }
      startKeyboardScale();
    });

    hotkeys('],[,shift+],shift+[', (event, handler) => {
      event.preventDefault();
      if (keyboardScaleRef.current) {
        return;
      }
      switch (handler.key) {
        case ']': handleBringForward(); break;
        case '[': handleSendBackward(); break;
        case 'shift+]': handleBringToFront(); break;
        case 'shift+[': handleSendToBack(); break;
      }
    });

    hotkeys('command+g, ctrl+g', (event) => {
      event.preventDefault();
      if (keyboardScaleRef.current) {
        return;
      }
      handleGroup();
    });

    hotkeys('command+shift+g, ctrl+shift+g', (event) => {
      event.preventDefault();
      if (keyboardScaleRef.current) {
        return;
      }
      handleUngroup();
    });

    hotkeys('command+a, ctrl+a', (event) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isInput =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      if (isInput) {
        return;
      }

      event.preventDefault();

      if (keyboardScaleRef.current) {
        return;
      }

      const unlockedIds = activePaths
        .filter(path => path.isLocked !== true)
        .map(path => path.id);

      if (unlockedIds.length === 0) {
        setSelectedPathIds([]);
        return;
      }

      setSelectedPathIds(unlockedIds);
      setTool('selection');
    });

    // --- Group 2: Shortcuts that MUST fire even in input fields ---
    // We temporarily override the filter for these.
    const originalFilter = hotkeys.filter;
    hotkeys.filter = () => true;

    hotkeys('command+z, ctrl+z', (event) => {
        event.preventDefault();
        if (keyboardScaleRef.current) {
          finishKeyboardScale(false);
          return;
        }
        handleUndo();
    });

    hotkeys('command+shift+z, ctrl+shift+z', (event) => {
        event.preventDefault();
        if (keyboardScaleRef.current) {
          return;
        }
        handleRedo();
    });

    hotkeys('command+i, ctrl+i', (event) => {
      event.preventDefault();
      if (keyboardScaleRef.current) {
        return;
      }
      handleImportClick();
    });

    hotkeys('command+s, ctrl+s', (event) => {
      event.preventDefault();
      if (keyboardScaleRef.current) {
        return;
      }
      void handleSaveFile();
    });
    
    // --- Group 3: Shortcuts with their own internal input-checking logic ---
    // These can be bound while the filter is off, as they handle it themselves.
    hotkeys('command+x, ctrl+x', (event) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || (activeElement as HTMLElement)?.isContentEditable;
      if (!isInput) {
        event.preventDefault();
        if (keyboardScaleRef.current) {
          return;
        }
        void handleCut();
      }
    });

    hotkeys('command+c, ctrl+c', (event) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || (activeElement as HTMLElement)?.isContentEditable;
      if (!isInput) {
        event.preventDefault();
        if (keyboardScaleRef.current) {
          return;
        }
        void handleCopy();
      }
    });

    hotkeys('command+shift+c, ctrl+shift+c', (event) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || (activeElement as HTMLElement)?.isContentEditable;
      if (!isInput) {
        event.preventDefault();
        if (keyboardScaleRef.current) {
          return;
        }
        void handleCopyAsPng();
      }
    });

    // IMPORTANT: Restore the filter immediately after binding the exceptions.
    hotkeys.filter = originalFilter;

    // Cleanup on unmount
    return () => {
      hotkeys.unbind('v,m,b,p,r,o,l,a,escape,enter,backspace,delete,t,f');
      hotkeys.unbind('g');
      hotkeys.unbind('s');
      hotkeys.unbind('],[,shift+],shift+[');
      hotkeys.unbind('command+z, ctrl+z');
      hotkeys.unbind('command+shift+z, ctrl+shift+z');
      hotkeys.unbind('command+x, ctrl+x');
      hotkeys.unbind('command+c, ctrl+c');
      hotkeys.unbind('command+shift+c, ctrl+shift+c');
      hotkeys.unbind('command+i, ctrl+i');
      hotkeys.unbind('command+s, ctrl+s');
      hotkeys.unbind('command+g, ctrl+g');
      hotkeys.unbind('command+shift+g, ctrl+shift+g');
      hotkeys.unbind('command+a, ctrl+a');
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
    handleCopyAsPng,
    handlePaste,
    handleImportClick,
    handleSaveFile,
    startKeyboardScale,
    finishKeyboardScale,
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
    activePaths,
  ]);

  useEffect(() => {
    return () => {
      if (keyboardScaleRef.current) {
        finishKeyboardScaleRef.current(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!keyboardScaleRef.current) {
      return;
    }
    if (tool !== 'selection' || selectionMode !== 'move') {
      finishKeyboardScale(false);
    }
  }, [tool, selectionMode, finishKeyboardScale]);

  useEffect(() => {
    if (!keyboardScaleRef.current) {
      return;
    }
    if (croppingState) {
      finishKeyboardScale(false);
    }
  }, [croppingState, finishKeyboardScale]);

  useEffect(() => {
    const state = keyboardScaleRef.current;
    if (!state) {
      return;
    }
    if (state.pathIds.length !== selectedPathIds.length || !state.pathIds.every(id => selectedPathIds.includes(id))) {
      finishKeyboardScale(false);
    }
  }, [selectedPathIds, finishKeyboardScale]);

  // Nudge selected items with arrow keys using a native event listener for reliability
  useEffect(() => {
    const clamp = (value: number, min: number, max: number) => {
      if (max < min) {
        return min;
      }
      return Math.min(Math.max(value, min), max);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, shiftKey, target } = event;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        return;
      }

      const activeElement = target as HTMLElement;
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable) {
        return;
      }

      if (keyboardScaleRef.current) {
        return;
      }

      const amount = shiftKey ? 10 : 1;

      if (croppingState && currentCropRect) {
        let dx = 0;
        let dy = 0;

        switch (key) {
          case 'ArrowUp': dy = -amount; break;
          case 'ArrowDown': dy = amount; break;
          case 'ArrowLeft': dx = -amount; break;
          case 'ArrowRight': dx = amount; break;
        }

        if (dx !== 0 || dy !== 0) {
          event.preventDefault();

          setCurrentCropRect(prev => {
            if (!prev || !croppingState) {
              return prev;
            }

            const image = croppingState.originalPath;
            const maxX = Math.max(image.x, image.x + image.width - prev.width);
            const maxY = Math.max(image.y, image.y + image.height - prev.height);
            const nextX = clamp(prev.x + dx, image.x, maxX);
            const nextY = clamp(prev.y + dy, image.y, maxY);

            if (nextX === prev.x && nextY === prev.y) {
              return prev;
            }

            if (!cropHistoryPendingRef.current) {
              pushCropHistory(prev);
              cropHistoryPendingRef.current = true;
            }

            return { ...prev, x: nextX, y: nextY };
          });

          if (cropNudgeTimeoutRef.current) {
            clearTimeout(cropNudgeTimeoutRef.current);
          }
          cropNudgeTimeoutRef.current = window.setTimeout(() => {
            cropNudgeTimeoutRef.current = null;
            cropHistoryPendingRef.current = false;
          }, 500);
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

        let dx = 0;
        let dy = 0;

        switch (key) {
          case 'ArrowUp': dy = -amount; break;
          case 'ArrowDown': dy = amount; break;
          case 'ArrowLeft': dx = -amount; break;
          case 'ArrowRight': dx = amount; break;
        }

        if (dx !== 0 || dy !== 0) {
          setActivePaths((currentPaths: AnyPath[]) =>
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
      if (cropNudgeTimeoutRef.current) {
        clearTimeout(cropNudgeTimeoutRef.current);
        cropNudgeTimeoutRef.current = null;
      }
      cropHistoryPendingRef.current = false;
    };
  }, [
    tool,
    selectionMode,
    selectedPathIds,
    setActivePaths,
    beginCoalescing,
    endCoalescing,
    croppingState,
    currentCropRect,
    setCurrentCropRect,
    pushCropHistory,
  ]);

  // Global paste handler for images and shapes
  useEffect(() => {
    const handleGlobalPaste = async (event: ClipboardEvent) => {
        // Priority 1: Check for an image in the clipboard items.
        const items = event.clipboardData?.items;
        if (items) {
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    event.preventDefault();
                    const blob = item.getAsFile();
                    if (!blob) continue;
                    const filesStore = useFilesStore.getState();
                    const metadata = await filesStore.addFile(blob);
                    const cached = await getCachedImage({ fileId: metadata.id });

                    let pasteAt: Point;
                    const pointer = vt.getLastPointerPosition?.();
                    if (pointer) {
                      pasteAt = pointer;
                    } else {
                      const svg = document.querySelector('svg');
                      if (!svg) return;
                      pasteAt = getPointerPosition(
                        { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 },
                        svg
                      );
                    }

                    const width = cached.width;
                    const height = cached.height;

                    const newImage: ImageData = {
                      id: Date.now().toString(),
                      tool: 'image',
                      fileId: metadata.id,
                      opacity: 1,
                      x: pasteAt.x - width / 2,
                      y: pasteAt.y - height / 2,
                      width,
                      height,
                      color: 'transparent',
                      fill: 'transparent',
                      fillStyle: 'solid',
                      strokeWidth: 0,
                      roughness: 0,
                      bowing: 0,
                      fillWeight: -1,
                      hachureAngle: -41,
                      hachureGap: -1,
                      curveTightness: 0,
                      curveStepCount: 9,
                    };

                    setActivePaths((prev: AnyPath[]) => [...prev, newImage]);
                    setSelectedPathIds([newImage.id]);
                    setTool('selection' as Tool);
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
                        const pointer = vt.getLastPointerPosition?.();
                        if (pointer) {
                            pasteAt = pointer;
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
             const pointer = vt.getLastPointerPosition?.();
             if (pointer) {
                 void handlePaste({ pasteAt: pointer, clipboardText });
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
  }, [handlePaste, getPointerPosition, setActivePaths, setSelectedPathIds, setTool, vt.scale, vt.getLastPointerPosition]);
};

export default useGlobalEventHandlers;
