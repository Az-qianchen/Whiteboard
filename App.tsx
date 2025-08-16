
import React, { useEffect, useState, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { Whiteboard } from './components/Whiteboard';
import { ContextMenu } from './components/ContextMenu';
import { usePaths } from './hooks/usePaths';
import { useToolbarState } from './hooks/useToolbarState';
import { useViewTransform } from './hooks/useViewTransform';
import { usePointerInteraction } from './hooks/usePointerInteraction';
import { useGlobalEventHandlers } from './hooks/useGlobalEventHandlers';
import { getPathsBoundingBox } from './lib/geometry';
import { movePath, flipPath } from './lib/utils';
import { pathsToSvgString, pathsToPngBlob } from './lib/export';
import { ICONS } from './constants';
import type { AnyPath, ImageData } from './types';

const App: React.FC = () => {
  // Grid State
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; worldX: number; worldY: number } | null>(null);

  // Manages all path-related state and actions
  const pathState = usePaths();
  const { paths, selectedPathIds, setPaths, setSelectedPathIds, handleDeleteSelected } = pathState;

  // Manages view transformations (pan/zoom)
  const viewTransform = useViewTransform();
  const { viewTransform: vt, isPanning, handleWheel, getPointerPosition, lastPointerPosition } = viewTransform;

  // Manages toolbar state (tool, colors, strokes, etc.)
  const toolbarState = useToolbarState(paths, selectedPathIds, pathState.setPaths, setSelectedPathIds);

  // Manages all pointer interactions (drawing, editing, panning)
  const pointerInteraction = usePointerInteraction({
    pathState,
    toolbarState,
    viewTransform,
    getPointerPosition,
    isGridVisible,
    gridSize,
  });
  
  const handleCopy = useCallback(async () => {
    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const clipboardData = {
        type: 'whiteboard/shapes',
        version: 1,
        paths: selected,
      };
      try {
        await navigator.clipboard.writeText(JSON.stringify(clipboardData));
      } catch (err) {
        console.error("Failed to copy shapes:", err);
        alert("Could not copy shapes to clipboard.");
      }
    }
  }, [paths, selectedPathIds]);

  const handlePaste = useCallback(async (options?: { pasteAt?: { x: number; y: number }, clipboardText?: string }) => {
    let pathsToPaste: AnyPath[] = [];
    let text = options?.clipboardText;

    // If text wasn't passed directly (e.g., from context menu), try reading from the clipboard API
    if (typeof text !== 'string') {
        try {
            text = await navigator.clipboard.readText();
        } catch (err) {
            console.error("Failed to read clipboard text:", err);
            // Don't alert here, let the global paste handler manage images first.
            return;
        }
    }

    if (!text) return; // Nothing to paste

    try {
      const data = JSON.parse(text);
      if (data && data.type === 'whiteboard/shapes' && Array.isArray(data.paths)) {
        pathsToPaste = data.paths;
      } else {
        // Silently ignore if it's not our format, as it might be plain text the user wants to paste elsewhere.
        return; 
      }
    } catch (err) {
      // Silently ignore parse errors for the same reason.
      return;
    }

    if (pathsToPaste.length === 0) return;

    const newPaths: AnyPath[] = [];
    const newIds: string[] = [];

    const copiedPathsBbox = getPathsBoundingBox(pathsToPaste);
    let dx = 20 / viewTransform.viewTransform.scale; // Default offset
    let dy = 20 / viewTransform.viewTransform.scale;

    if (options?.pasteAt && copiedPathsBbox) {
        // Paste at a specific point, aligning the center of the bounding box
        const selectionCenterX = copiedPathsBbox.x + copiedPathsBbox.width / 2;
        const selectionCenterY = copiedPathsBbox.y + copiedPathsBbox.height / 2;
        dx = options.pasteAt.x - selectionCenterX;
        dy = options.pasteAt.y - selectionCenterY;
    }

    pathsToPaste.forEach((path, index) => {
      const newId = `${Date.now()}-${index}`;
      const moved = movePath(path, dx, dy);
      const newPath = { ...moved, id: newId };
      newPaths.push(newPath);
      newIds.push(newId);
    });

    pathState.setPaths(prev => [...prev, ...newPaths]);
    pathState.setSelectedPathIds(newIds);
    toolbarState.setTool('move');
  }, [pathState, toolbarState, viewTransform.viewTransform.scale]);

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

  // Use a dedicated hook for all global event listeners (hotkeys, paste, etc.)
  useGlobalEventHandlers({
    ...pathState,
    ...toolbarState,
    ...pointerInteraction,
    isGridVisible,
    setIsGridVisible,
    handleCopy,
    handlePaste,
    getPointerPosition,
    viewTransform: vt,
    lastPointerPosition,
  });

  const cursor = isPanning ? 'grabbing' : (toolbarState.tool === 'move' ? 'grab' : (toolbarState.tool === 'edit' ? 'default' : 'crosshair'));
  
  const contextMenuActions = [
    { label: '复制', handler: () => void handleCopy(), disabled: selectedPathIds.length === 0, icon: ICONS.COPY },
    { label: '粘贴', handler: () => void handlePaste({ pasteAt: { x: contextMenu?.worldX ?? 0, y: contextMenu?.worldY ?? 0 } }), icon: ICONS.PASTE },
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
    contextMenuActions.splice(2, 0,
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
