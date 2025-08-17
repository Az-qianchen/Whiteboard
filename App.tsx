

import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { SideToolbar } from './components/SideToolbar';
import { SelectionToolbar } from './components/SelectionToolbar';
import { Whiteboard } from './components/Whiteboard';
import { ContextMenu } from './components/ContextMenu';
import { MainMenu } from './components/MainMenu';
import { StatusBar } from './components/StatusBar';
import { usePaths } from './hooks/usePaths';
import { useToolbarState } from './hooks/useToolbarState';
import { useViewTransform } from './hooks/useViewTransform';
import { useDrawing } from './hooks/useDrawing';
import { useSelection } from './hooks/useSelection';
import { usePointerInteraction } from './hooks/usePointerInteraction';
import useGlobalEventHandlers from './hooks/useGlobalEventHandlers';
import { useAppActions } from './hooks/useAppActions';
import { getLocalStorageItem } from './lib/utils';
import * as idb from './lib/indexedDB';
import type { FileSystemFileHandle } from 'wicg-file-system-access';

const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = (key: string) => `${isMac ? '⌘' : 'Ctrl+'}${key}`;
const modShiftKey = (key: string) => `${isMac ? '⇧⌘' : 'Ctrl+Shift+'}${key}`;

const App: React.FC = () => {
  // Local UI State
  const [isGridVisible, setIsGridVisible] = useState(() => getLocalStorageItem('whiteboard_isGridVisible', true));
  const [gridSize, setGridSize] = useState(() => getLocalStorageItem('whiteboard_gridSize', 20));
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; worldX: number; worldY: number } | null>(null);

  // New state for file handling
  const [activeFileHandle, setActiveFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Core Hooks for State Management
  const pathState = usePaths();
  const { paths, selectedPathIds, handleDeleteSelected, handleFinishPenPath, handleFinishLinePath } = pathState;

  // Auto-load last file on startup
  useEffect(() => {
    const loadLastFile = async () => {
      try {
        const handle = await idb.get<FileSystemFileHandle>('last-active-file-handle');
        if (!handle) {
          setIsLoading(false);
          return;
        }

        // Check if we have permission to read the file.
        // We use queryPermission to check silently without prompting the user.
        if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
          const file = await handle.getFile();
          const contents = await file.text();
          if (contents) {
            const data = JSON.parse(contents);
            if (data?.type === 'whiteboard/shapes' && Array.isArray(data.paths)) {
              pathState.handleLoadFile(data.paths);
              setActiveFileHandle(handle);
              setActiveFileName(handle.name);
            }
          }
        } else {
          // If permission is not granted, remove the handle from storage so we don't ask again.
          await idb.del('last-active-file-handle');
          setActiveFileName(null);
        }
      } catch (error) {
        // This can happen if the file was deleted or moved.
        console.error("Failed to load last session:", error);
        // Clean up the stale handle from storage.
        await idb.del('last-active-file-handle').catch(() => {});
        setActiveFileName(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadLastFile();
  }, [pathState.handleLoadFile]);

  // Save grid settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('whiteboard_isGridVisible', JSON.stringify(isGridVisible));
  }, [isGridVisible]);

  useEffect(() => {
    localStorage.setItem('whiteboard_gridSize', JSON.stringify(gridSize));
  }, [gridSize]);

  const viewTransform = useViewTransform();
  const { viewTransform: vt, isPanning, handleWheel, getPointerPosition, lastPointerPosition } = viewTransform;

  const toolbarState = useToolbarState(paths, selectedPathIds, pathState.setPaths, pathState.setSelectedPathIds);

  // Decoupled Interaction Hooks
  const drawingInteraction = useDrawing({ pathState, toolbarState, viewTransform, isGridVisible, gridSize });
  const selectionInteraction = useSelection({ pathState, toolbarState, viewTransform, isGridVisible, gridSize });

  const pointerInteraction = usePointerInteraction({ 
    tool: toolbarState.tool,
    viewTransform,
    drawingInteraction,
    selectionInteraction
  });
  
  // Encapsulated Action Handlers
  const appActions = useAppActions({ 
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
  });
  const { 
    handleCut, handleCopy, handlePaste, handleFlip, handleCopyAsSvg, handleCopyAsPng, 
    handleSaveFile, handleSaveAs, handleOpen,
    handleImportClick, handleSvgFileChange, importFileRef,
    handleConvertToPath,
    handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack,
  } = appActions;
  
  // Global Event Listeners (Hotkeys, Clipboard)
  useGlobalEventHandlers({
    ...pathState, ...toolbarState, drawingShape: drawingInteraction.drawingShape, cancelDrawingShape: drawingInteraction.cancelDrawingShape, isGridVisible, setIsGridVisible, 
    handleCut, handleCopy, handlePaste, handleImportClick, handleFileImport: appActions.handleFileImport, 
    handleSaveFile,
    handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack,
    getPointerPosition, viewTransform: vt, lastPointerPosition
  });

  const handleClearCanvas = () => {
    if (!pathState.canClear) return;
    if (window.confirm('您确定要清空画布吗？这将创建一个新的空白文档。')) {
      pathState.handleClear();
      setActiveFileHandle(null);
      setActiveFileName(null);
      idb.del('last-active-file-handle').catch(() => {});
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    let pathWasFinished = false;
    if (toolbarState.tool === 'pen' && pathState.currentPenPath) { handleFinishPenPath(); pathWasFinished = true; } 
    else if (toolbarState.tool === 'line' && pathState.currentLinePath) { handleFinishLinePath(); pathWasFinished = true; }
    
    if (pathWasFinished) return;

    const svg = (e.currentTarget as HTMLElement).querySelector('svg');
    if (!svg) return;
    const worldPos = getPointerPosition({ clientX: e.clientX, clientY: e.clientY }, svg);
    
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, worldX: worldPos.x, worldY: worldPos.y });
  };

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    switch (toolbarState.tool) {
      case 'selection': return toolbarState.selectionMode === 'move' ? 'grab' : 'default';
      case 'brush': case 'pen': case 'rectangle': case 'ellipse': case 'line': return 'crosshair';
      default: return 'default';
    }
  };
  
  const contextMenuActions: {
    label: string;
    handler?: () => void | Promise<void>;
    disabled?: boolean;
    isDanger?: boolean;
    shortcut?: string;
  }[] = [
    { label: '剪切', handler: handleCut, disabled: selectedPathIds.length === 0, shortcut: modKey('X') },
    { label: '复制', handler: handleCopy, disabled: selectedPathIds.length === 0, shortcut: modKey('C') },
    { label: '粘贴', handler: () => handlePaste({ pasteAt: { x: contextMenu?.worldX ?? 0, y: contextMenu?.worldY ?? 0 } }), shortcut: modKey('V') },
    { label: '---' },
    { label: '水平翻转', handler: () => handleFlip('horizontal'), disabled: selectedPathIds.length === 0 },
    { label: '垂直翻转', handler: () => handleFlip('vertical'), disabled: selectedPathIds.length === 0 },
    { label: '---' },
    { label: '上移一层', handler: handleBringForward, disabled: selectedPathIds.length === 0, shortcut: ']' },
    { label: '下移一层', handler: handleSendBackward, disabled: selectedPathIds.length === 0, shortcut: '[' },
    { label: '置于顶层', handler: handleBringToFront, disabled: selectedPathIds.length === 0, shortcut: '⇧]' },
    { label: '置于底层', handler: handleSendToBack, disabled: selectedPathIds.length === 0, shortcut: '⇧[' },
    { label: '---' },
    { label: '删除', handler: handleDeleteSelected, disabled: selectedPathIds.length === 0, isDanger: true, shortcut: 'Del' },
    { label: '---' },
    { label: '撤销', handler: pathState.handleUndo, disabled: !pathState.canUndo, shortcut: modKey('Z') },
    { label: '重做', handler: pathState.handleRedo, disabled: !pathState.canRedo, shortcut: modShiftKey('Z') },
  ];

  if (toolbarState.tool === 'selection' && toolbarState.selectionMode === 'move' && selectedPathIds.length > 0) {
    contextMenuActions.splice(3, 0,
        { label: '---' },
        { label: '复制为 SVG', handler: handleCopyAsSvg, disabled: selectedPathIds.length === 0 },
        { label: '复制为 PNG', handler: handleCopyAsPng, disabled: selectedPathIds.length === 0 },
    );
  }

  const canConvertToPath = selectedPathIds.length > 0 && paths.some(p => selectedPathIds.includes(p.id) && (p.tool === 'rectangle' || p.tool === 'ellipse'));
  if (canConvertToPath) {
    contextMenuActions.splice(6, 0, { label: '转换为路径', handler: handleConvertToPath });
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-gradient)] text-[var(--text-primary)]">
        正在加载...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen font-sans bg-transparent relative">
      <input type="file" ref={importFileRef} onChange={handleSvgFileChange} accept=".svg,image/svg+xml" className="hidden" />
      
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <MainMenu onSave={handleSaveFile} onSaveAs={handleSaveAs} onOpen={handleOpen} onImport={handleImportClick} onClear={handleClearCanvas} canClear={pathState.canClear} />
        {activeFileName && (
          <div className="bg-[var(--ui-panel-bg)] backdrop-blur-lg text-[var(--text-primary)] text-sm px-3 h-10 flex items-center rounded-lg border border-[var(--ui-panel-border)] shadow-lg">
            {activeFileName}
          </div>
        )}
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20"><Toolbar tool={toolbarState.tool} setTool={toolbarState.setTool} isGridVisible={isGridVisible} setIsGridVisible={setIsGridVisible} gridSize={gridSize} setGridSize={setGridSize} /></div>
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-20"><SideToolbar {...toolbarState} beginCoalescing={pathState.beginCoalescing} endCoalescing={pathState.endCoalescing} /></div>
      
      {toolbarState.tool === 'selection' && selectedPathIds.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <SelectionToolbar selectionMode={toolbarState.selectionMode} setSelectionMode={toolbarState.setSelectionMode} />
        </div>
      )}
      
       <div className="absolute bottom-4 left-4 z-20">
        <StatusBar zoomLevel={vt.scale} onUndo={pathState.handleUndo} canUndo={pathState.canUndo} onRedo={pathState.handleRedo} canRedo={pathState.canRedo} />
       </div>
      
      <div className="w-full h-full">
        <Whiteboard
          paths={paths}
          tool={toolbarState.tool}
          selectionMode={toolbarState.selectionMode}
          currentLivePath={pathState.currentBrushPath}
          drawingShape={drawingInteraction.drawingShape}
          currentPenPath={pathState.currentPenPath}
          currentLinePath={pathState.currentLinePath}
          previewD={drawingInteraction.previewD}
          selectedPathIds={selectedPathIds}
          marquee={selectionInteraction.marquee}
          onPointerDown={pointerInteraction.onPointerDown}
          onPointerMove={pointerInteraction.onPointerMove}
          onPointerUp={pointerInteraction.onPointerUp}
          onPointerLeave={pointerInteraction.onPointerLeave}
          viewTransform={vt}
          cursor={getCursor()}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          isGridVisible={isGridVisible}
          gridSize={gridSize}
          dragState={selectionInteraction.dragState}
        />
      </div>
      {contextMenu?.isOpen && (<ContextMenu isOpen={contextMenu.isOpen} position={{ x: contextMenu.x, y: contextMenu.y }} actions={contextMenuActions} onClose={() => setContextMenu(null)} />)}
    </div>
  );
};

export default App;