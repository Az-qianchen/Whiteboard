

import React, { useEffect, useState } from 'react';
import hotkeys from 'hotkeys-js';
import { Toolbar } from './components/Toolbar';
import { Whiteboard } from './components/Whiteboard';
import { AiModal } from './components/AiModal';
import { usePaths } from './hooks/usePaths';
import { useToolbarState } from './hooks/useToolbarState';
import { useViewTransform } from './hooks/useViewTransform';
import { usePointerInteraction } from './hooks/usePointerInteraction';
import type { Anchor, VectorPathData } from './types';

const App: React.FC = () => {
  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  // Grid State
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [gridSize, setGridSize] = useState(20);

  // 管理所有路径相关状态和操作的钩子
  const pathState = usePaths();
  const { paths, selectedPathIds, setSelectedPathIds, handleDeleteSelected } = pathState;

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
    hotkeys('v,b,p,r,o,l,escape,enter,backspace,delete', (event, handler) => {
      event.preventDefault();
      switch (handler.key) {
        case 'v': toolbarState.setTool('edit'); break;
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

    // 对于撤销/重做，我们希望它们即使在输入字段中也能工作。
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

    // 恢复原始过滤器
    hotkeys.filter = originalFilter;
    
    // 组件卸载时清理
    return () => {
      hotkeys.unbind('v,b,p,r,o,l,escape,enter,backspace,delete');
      hotkeys.unbind('a');
      hotkeys.unbind('g');
      hotkeys.unbind('command+z, ctrl+z');
      hotkeys.unbind('command+shift+z, ctrl+shift+z');
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
  ]);

  const selectedPaths = paths.filter(p => selectedPathIds.includes(p.id));
  const cursor = isPanning ? 'grabbing' : (toolbarState.tool === 'edit' ? 'default' : 'crosshair');

  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-slate-100 dark:bg-[#2A303C]">
       <div className="p-3 flex justify-center shadow-md bg-slate-100 dark:bg-[#2A303C] z-10">
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
      <div className="flex-grow w-full p-4 pt-0 flex justify-center items-center">
        <Whiteboard
          paths={paths}
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
          isGridVisible={isGridVisible}
          gridSize={gridSize}
        />
      </div>
      <AiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
};

export default App;
