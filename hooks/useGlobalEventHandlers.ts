
/**
 * This hook manages all global event listeners for the application,
 * such as keyboard shortcuts and clipboard events.
 */
import { useEffect } from 'react';
import hotkeys from 'hotkeys-js';
import type { AnyPath, ImageData, Point, Tool } from '../types';
import { usePaths } from './usePaths';
import { useToolbarState } from './useToolbarState';
import { usePointerInteraction } from './usePointerInteraction';

// Define the properties this hook will receive.
// It's a combination of the return types of other hooks.
type PathState = ReturnType<typeof usePaths>;
type ToolbarState = ReturnType<typeof useToolbarState>;
type PointerInteraction = ReturnType<typeof usePointerInteraction>;

interface GlobalEventHandlersProps extends PathState, ToolbarState, PointerInteraction {
  isGridVisible: boolean;
  setIsGridVisible: (visible: boolean) => void;
  handleCopy: () => void;
  handlePaste: (options?: { pasteAt?: { x: number; y: number }, clipboardText?: string }) => void;
  getPointerPosition: (e: { clientX: number, clientY: number }, svg: SVGSVGElement) => Point;
  viewTransform: { scale: number };
  lastPointerPosition: Point | null;
}


export const useGlobalEventHandlers = ({
  // from usePaths
  selectedPathIds, setSelectedPathIds,
  currentPenPath, handleCancelPenPath, handleFinishPenPath,
  currentLinePath, handleCancelLinePath, handleFinishLinePath,
  handleUndo, handleRedo, handleDeleteSelected, setPaths,
  // from useToolbarState
  setTool,
  // from usePointerInteraction
  drawingShape, cancelDrawingShape,
  // from App
  isGridVisible, setIsGridVisible, handleCopy, handlePaste, getPointerPosition, viewTransform, lastPointerPosition
}: GlobalEventHandlersProps) => {

  // Handle keyboard shortcuts using hotkeys-js library
  useEffect(() => {
    // These shortcuts should follow the default filter (not trigger in inputs)
    hotkeys('v,m,b,p,r,o,l,escape,enter,backspace,delete', (event, handler) => {
      event.preventDefault();
      switch (handler.key) {
        case 'v': setTool('edit'); break;
        case 'm': setTool('move'); break;
        case 'b': setTool('brush'); break;
        case 'p': setTool('pen'); break;
        case 'r': setTool('rectangle'); break;
        case 'o': setTool('ellipse'); break;
        case 'l': setTool('line'); break;
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
    
    hotkeys('command+c, ctrl+c', (event) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || (activeElement as HTMLElement)?.isContentEditable;
      if (!isInput) {
        event.preventDefault();
        void handleCopy();
      }
    });

    // Cleanup on unmount
    return () => {
      hotkeys.filter = originalFilter;
      hotkeys.unbind('v,m,b,p,r,o,l,escape,enter,backspace,delete');
      hotkeys.unbind('g');
      hotkeys.unbind('command+z, ctrl+z');
      hotkeys.unbind('command+shift+z, ctrl+shift+z');
      hotkeys.unbind('command+c, ctrl+c');
    };
  }, [
    selectedPathIds,
    setSelectedPathIds,
    setTool,
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
    handleCopy,
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
                            setTool('move' as Tool);
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
};
