

import React, { useEffect, useState, useCallback } from 'react';
import hotkeys from 'hotkeys-js';
import { Toolbar } from './components/Toolbar';
import { Whiteboard } from './components/Whiteboard';
import { AiModal } from './components/AiModal';
import { ContextMenu } from './components/ContextMenu';
import { usePaths } from './hooks/usePaths';
import { useToolbarState } from './hooks/useToolbarState';
import { useViewTransform } from './hooks/useViewTransform';
import { usePointerInteraction } from './hooks/usePointerInteraction';
import { getPathsBoundingBox } from './lib/geometry';
import { movePath, flipPath } from './lib/utils';
import { pathsToSvgString, pathsToPngBlob } from './lib/export';
import { ICONS } from './constants';
import type { Anchor, VectorPathData, AnyPath, ImageData } from './types';

const App: React.FC = () => {
  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  // Grid State
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  // Clipboard and Context Menu State
  const [clipboardContent, setClipboardContent] = useState<AnyPath[]>([]);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; worldX: number; worldY: number } | null>(null);

  // 管理所有路径相关状态和操作的钩子
  const pathState = usePaths();
  const { paths, selectedPathIds, setSelectedPathIds, handleDeleteSelected, setPaths } = pathState;

  // 管理视图变换（平移/缩放）的钩子
  const viewTransform = useViewTransform();
  const { viewTransform: vt, isPanning, handleWheel, getPointerPosition } = viewTransform;

  // 管理工具栏状态（工具、颜色、描边等）的钩子
  const toolbarState = useToolbarState(paths, selectedPathIds, pathState.setPaths, setSelectedPathIds);

  // 管理所有指针交互（绘图、编辑、平移）的钩子
  const pointerInteraction = usePointerInteraction({
    pathState,
    toolbarState,
    viewTransform,
    getPointerPosition,
    isGridVisible,
    gridSize,
  });
  
  const handleCopy = useCallback(() => {
    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      setClipboardContent(selected);
    }
  }, [paths, selectedPathIds]);

  const handleCopyScene = useCallback(async () => {
    const scene = {
      type: 'whiteboard/json',
      version: 1,
      paths: paths,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(scene));
    } catch (err) {
      console.error("Failed to copy scene:", err);
      alert("Could not copy canvas to clipboard.");
    }
  }, [paths]);

  const handlePaste = useCallback((pasteAt?: {x: number, y: number}) => {
    if (clipboardContent.length === 0) return;

    const newPaths: AnyPath[] = [];
    const newIds: string[] = [];

    const copiedPathsBbox = getPathsBoundingBox(clipboardContent);
    let dx = 20 / viewTransform.viewTransform.scale; // Default offset
    let dy = 20 / viewTransform.viewTransform.scale;

    if (pasteAt && copiedPathsBbox) {
        // Paste at a specific point, aligning the top-left of the bounding box
        dx = pasteAt.x - copiedPathsBbox.x;
        dy = pasteAt.y - copiedPathsBbox.y;
    }

    clipboardContent.forEach((path, index) => {
      const newId = `${Date.now()}-${index}`;
      const moved = movePath(path, dx, dy);
      const newPath = { ...moved, id: newId };
      newPaths.push(newPath);
      newIds.push(newId);
    });

    pathState.setPaths(prev => [...prev, ...newPaths]);
    pathState.setSelectedPathIds(newIds);
    toolbarState.setTool('move');
  }, [clipboardContent, pathState, toolbarState, viewTransform.viewTransform.scale]);

  const handleFlip = useCallback((axis: 'horizontal' | 'vertical') => {
      if (selectedPathIds.length === 0) return;
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const selectionBbox = getPathsBoundingBox(selected);
      if (!selectionBbox) return;

      const center = {
          x: selectionBbox.x + selectionBbox.width / 2,
          y: selectionBbox.y + selectionBbox.height / 2,
      };

      pathState.setPaths(prev =>
          prev.map(p => {
              if (selectedPathIds.includes(p.id)) {
                  return flipPath(p, center, axis);
              }
              return p;
          })
      );
  }, [paths, selectedPathIds, pathState.setPaths]);

  const handleCopyAsSvg = useCallback(async () => {
    if (selectedPathIds.length === 0) return;
    const selected = paths.filter(p => selectedPathIds.includes(p.id));
    
    try {
        const svgString = pathsToSvgString(selected);
        if (svgString) {
          await navigator.clipboard.writeText(svgString);
        }
    } catch (err) {
        console.error("Failed to copy SVG:", err);
        alert("Could not copy SVG to clipboard.");
    }
  }, [paths, selectedPathIds]);

  const handleCopyAsPng = useCallback(async () => {
    if (selectedPathIds.length === 0) return;
    const selected = paths.filter(p => selectedPathIds.includes(p.id));

    try {
        const blob = await pathsToPngBlob(selected);
        if (blob) {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
        }
    } catch (err) {
        console.error("Failed to copy PNG:", err);
        alert("Could not copy PNG to clipboard.");
    }
  }, [paths, selectedPathIds]);


  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    let pathWasFinished = false;
    // Finish pen/line path on right click
    if (toolbarState.tool === 'pen' && pathState.currentPenPath) {
      pathState.handleFinishPenPath();
      pathWasFinished = true;
    } else if (toolbarState.tool === 'line' && pathState.currentLinePath) {
      pathState.handleFinishLinePath();
      pathWasFinished = true;
    }
    
    // If a path was finished by this right-click, don't show the context menu.
    if (pathWasFinished) {
        return;
    }

    const svg = (e.currentTarget as HTMLElement).querySelector('svg');
    if (!svg) return;
    const worldPos = getPointerPosition({ clientX: e.clientX, clientY: e.clientY }, svg);
    
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      worldX: worldPos.x,
      worldY: worldPos.y,
    });
  };

  const handleGenerate = async (prompt: string) => {
    if (!prompt) return;

    // Use a try/catch block to propagate errors to the modal
    try {
      const { generateDrawingFromPrompt } = await import('./lib/ai.ts');
      const anchors = await generateDrawingFromPrompt(prompt);

      // Now, position and scale the anchors to fit the canvas view.
      // 1. Get viewport center in world coordinates
      const svg = document.querySelector('svg');
      if (!svg) throw new Error("SVG element not found");
      const viewportCenter = getPointerPosition(
          { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 },
          svg
      );

      // 2. Calculate bounding box of the generated path (in its 100x100 space)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      anchors.forEach(a => {
          minX = Math.min(minX, a.point.x);
          maxX = Math.max(maxX, a.point.x);
          minY = Math.min(minY, a.point.y);
          maxY = Math.max(maxY, a.point.y);
      });

      const generatedWidth = maxX - minX;
      const generatedHeight = maxY - minY;
      const generatedCenterX = minX + generatedWidth / 2;
      const generatedCenterY = minY + generatedHeight / 2;

      // 3. Determine scale and translation
      const TARGET_SIZE = 300 / viewTransform.viewTransform.scale; // Target size in world space
      const scale = TARGET_SIZE / Math.max(generatedWidth, generatedHeight, 1);
      const translateX = viewportCenter.x - (generatedCenterX * scale);
      const translateY = viewportCenter.y - (generatedCenterY * scale);

      // 4. Apply transformation to all anchor points
      const transformedAnchors: Anchor[] = anchors.map(a => ({
          point: {
              x: a.point.x * scale + translateX,
              y: a.point.y * scale + translateY,
          },
          handleIn: {
              x: a.handleIn.x * scale + translateX,
              y: a.handleIn.y * scale + translateY,
          },
          handleOut: {
              x: a.handleOut.x * scale + translateX,
              y: a.handleOut.y * scale + translateY,
          },
      }));

      // 5. Create the new path object
      const newPath: VectorPathData = {
          id: Date.now().toString(),
          tool: 'pen', // Treat it as a pen path for editing
          anchors: transformedAnchors,
          color: toolbarState.color,
          strokeWidth: toolbarState.strokeWidth,
          fill: toolbarState.fill,
          fillStyle: toolbarState.fillStyle,
          roughness: toolbarState.roughness,
          bowing: toolbarState.bowing,
          fillWeight: toolbarState.fillWeight,
          hachureAngle: toolbarState.hachureAngle,
          hachureGap: toolbarState.hachureGap,
          curveTightness: toolbarState.curveTightness,
          curveStepCount: toolbarState.curveStepCount,
          isClosed: false,
      };

      // 6. Add to canvas and select it, then switch tool to edit
      pathState.setPaths(prev => [...prev, newPath]);
      pathState.setSelectedPathIds([newPath.id]);
      toolbarState.setTool('edit');
    } catch (error) {
        // Re-throw the error to be caught by the modal's handler
        throw error;
    }
  };
  
  // 使用 hotkeys-js 库处理键盘快捷键
  useEffect(() => {
    // These快捷键应遵循默认过滤器（不在输入框中触发）
    hotkeys('v,m,b,p,r,o,l,escape,enter,backspace,delete', (event, handler) => {
      event.preventDefault();
      switch (handler.key) {
        case 'v': toolbarState.setTool('edit'); break;
        case 'm': toolbarState.setTool('move'); break;
        case 'b': toolbarState.setTool('brush'); break;
        case 'p': toolbarState.setTool('pen'); break;
        case 'r': toolbarState.setTool('rectangle'); break;
        case 'o': toolbarState.setTool('ellipse'); break;
        case 'l': toolbarState.setTool('line'); break;
        case 'escape':
          if (selectedPathIds.length > 0) setSelectedPathIds([]);
          if (pathState.currentPenPath) pathState.handleCancelPenPath();
          if (pathState.currentLinePath) pathState.handleCancelLinePath();
          if (pointerInteraction.drawingShape) pointerInteraction.cancelDrawingShape();
          break;
        case 'enter':
          if (pathState.currentPenPath) pathState.handleFinishPenPath();
          if (pathState.currentLinePath) pathState.handleFinishLinePath();
          break;
        case 'backspace':
        case 'delete':
          handleDeleteSelected();
          break;
      }
    });

    hotkeys('a', (event) => {
      event.preventDefault();
      setIsAiModalOpen(true);
    });

    hotkeys('g', (event) => {
      event.preventDefault();
      setIsGridVisible(v => !v);
    });

    // 对于撤销/重做/复制/粘贴，我们希望它们即使在输入字段中也能工作。
    const originalFilter = hotkeys.filter;
    hotkeys.filter = () => true;

    hotkeys('command+z, ctrl+z', (event) => {
        event.preventDefault();
        pathState.handleUndo();
    });

    hotkeys('command+shift+z, ctrl+shift+z', (event) => {
        event.preventDefault();
        pathState.handleRedo();
    });

    hotkeys('command+c, ctrl+c', (event) => {
      event.preventDefault();
      handleCopy();
    });
    
    // 组件卸载时清理
    return () => {
      // 恢复原始过滤器
      hotkeys.filter = originalFilter;
      
      hotkeys.unbind('v,m,b,p,r,o,l,escape,enter,backspace,delete');
      hotkeys.unbind('a');
      hotkeys.unbind('g');
      hotkeys.unbind('command+z, ctrl+z');
      hotkeys.unbind('command+shift+z, ctrl+shift+z');
      hotkeys.unbind('command+c, ctrl+c');
    };
  }, [
    selectedPathIds,
    setSelectedPathIds,
    toolbarState.setTool,
    pathState.currentPenPath,
    pathState.currentLinePath,
    pathState.handleCancelPenPath,
    pathState.handleFinishPenPath,
    pathState.handleCancelLinePath,
    pathState.handleFinishLinePath,
    pathState.handleUndo,
    pathState.handleRedo,
    handleDeleteSelected,
    pointerInteraction.drawingShape,
    pointerInteraction.cancelDrawingShape,
    handleCopy,
    handlePaste,
  ]);

  // Global paste handler for images and shapes
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
        // Priority 1: Check for our scene format in the clipboard text
        const text = event.clipboardData?.getData('text/plain');
        if (text) {
          try {
            const data = JSON.parse(text);
            if (data && data.type === 'whiteboard/json' && Array.isArray(data.paths)) {
              event.preventDefault();
              setPaths(data.paths);
              setSelectedPathIds([]);
              return; // Scene paste handled.
            }
          } catch (e) {
            // Not our JSON, proceed.
          }
        }

        // Priority 2: Check for an image in the clipboard items.
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
                            const svg = document.querySelector('svg');
                            if (!svg) return;
                            const center = getPointerPosition(
                                { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 },
                                svg
                            );

                            const MAX_DIM = 400 / vt.scale;
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
                                x: center.x - width / 2,
                                y: center.y - height / 2,
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
                            toolbarState.setTool('move');
                        };
                        img.src = src;
                    };
                    reader.readAsDataURL(blob);
                    // Image found and handled, so we can exit.
                    return; 
                }
            }
        }
        
        // Priority 3: If we're here, no scene or image was pasted. Handle shape paste.
        const target = event.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        if (!isInput) {
             // It's not an input, so we can safely take over the paste event
             // to paste our internally copied shape.
             event.preventDefault();
             handlePaste();
        }
        // If it IS an input, we do nothing, allowing the default paste behavior (e.g., pasting text).
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
        document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [handlePaste, getPointerPosition, setPaths, setSelectedPathIds, toolbarState, vt.scale]);

  const selectedPaths = paths.filter(p => selectedPathIds.includes(p.id));
  const cursor = isPanning ? 'grabbing' : (toolbarState.tool === 'move' ? 'grab' : (toolbarState.tool === 'edit' ? 'default' : 'crosshair'));
  
  const contextMenuActions = [
    { label: '复制', handler: handleCopy, disabled: selectedPathIds.length === 0, icon: ICONS.COPY },
    { label: '复制画布', handler: handleCopyScene, icon: ICONS.COPY },
    { label: '粘贴', handler: () => handlePaste({ x: contextMenu?.worldX ?? 0, y: contextMenu?.worldY ?? 0 }), disabled: clipboardContent.length === 0, icon: ICONS.PASTE },
    { label: '---' },
    { label: '水平翻转', handler: () => handleFlip('horizontal'), disabled: selectedPathIds.length === 0, icon: ICONS.FLIP_HORIZONTAL },
    { label: '垂直翻转', handler: () => handleFlip('vertical'), disabled: selectedPathIds.length === 0, icon: ICONS.FLIP_VERTICAL },
    { label: '---' },
    { label: '删除', handler: handleDeleteSelected, disabled: selectedPathIds.length === 0, isDanger: true, icon: ICONS.CLEAR },
    { label: '---' },
    { label: '撤销', handler: pathState.handleUndo, disabled: !pathState.canUndo, icon: ICONS.UNDO },
    { label: '重做', handler: pathState.handleRedo, disabled: !pathState.canRedo, icon: ICONS.REDO },
  ];

  if (toolbarState.tool === 'move' && selectedPathIds.length > 0) {
    contextMenuActions.splice(6, 0,
        { label: '---' },
        { label: '复制为 SVG', handler: () => void handleCopyAsSvg(), disabled: selectedPathIds.length === 0, icon: ICONS.COPY_SVG },
        { label: '复制为 PNG', handler: () => void handleCopyAsPng(), disabled: selectedPathIds.length === 0, icon: ICONS.COPY_PNG },
    );
  }

  return (
    <div className="h-screen w-screen font-sans bg-slate-100 dark:bg-[#2A303C] relative">
       <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <Toolbar
          {...toolbarState}
          undo={pathState.handleUndo}
          canUndo={pathState.canUndo}
          redo={pathState.handleRedo}
          canRedo={pathState.canRedo}
          clear={pathState.handleClear}
          canClear={pathState.canClear}
          beginCoalescing={pathState.beginCoalescing}
          endCoalescing={pathState.endCoalescing}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          isGridVisible={isGridVisible}
          setIsGridVisible={setIsGridVisible}
          gridSize={gridSize}
          setGridSize={setGridSize}
        />
       </div>
      <div className="w-full h-full">
        <Whiteboard
          paths={paths}
          tool={toolbarState.tool}
          currentLivePath={pathState.currentBrushPath}
          drawingShape={pointerInteraction.drawingShape}
          currentPenPath={pathState.currentPenPath}
          currentLinePath={pathState.currentLinePath}
          previewD={pointerInteraction.previewD}
          selectedPathIds={selectedPathIds}
          marquee={pointerInteraction.marquee}
          onPointerDown={pointerInteraction.onPointerDown}
          onPointerMove={pointerInteraction.onPointerMove}
  
          onPointerUp={pointerInteraction.onPointerUp}
          onPointerLeave={pointerInteraction.onPointerLeave}
          viewTransform={vt}
          cursor={cursor}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          isGridVisible={isGridVisible}
          gridSize={gridSize}
          dragState={pointerInteraction.dragState}
        />
      </div>
      <AiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerate={handleGenerate}
      />
      {contextMenu?.isOpen && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          actions={contextMenuActions}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default App;
