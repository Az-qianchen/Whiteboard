/**
 * 本文件是应用的主组件 (App)。
 * 它负责整合所有 UI 组件，如工具栏、白板、菜单等，
 * 并通过组合多个自定义 Hooks 来管理整个应用的状态。
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import type { WhiteboardData, Tool, AnyPath, StyleClipboardData, MaterialData, Alignment } from './types';
import { getPathsBoundingBox } from './lib/drawing';
import { StyleLibraryPopover } from './components/side-toolbar';
import { ICONS } from './constants';

const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = (key: string) => `${isMac ? '⌘' : 'Ctrl+'}${key}`;
const modShiftKey = (key: string) => `${isMac ? '⇧⌘' : 'Ctrl+Shift+'}${key}`;

const App: React.FC = () => {
  // Local UI State
  const [isGridVisible, setIsGridVisible] = useState(() => getLocalStorageItem('whiteboard_isGridVisible', true));
  const [gridSize, setGridSize] = useState(() => getLocalStorageItem('whiteboard_gridSize', 20));
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; worldX: number; worldY: number } | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(() => getLocalStorageItem('whiteboard_backgroundColor', '#17171c'));
  const [styleClipboard, setStyleClipboard] = useState<StyleClipboardData | null>(null);
  const [isStatusBarCollapsed, setIsStatusBarCollapsed] = useState(() => getLocalStorageItem('whiteboard_isStatusBarCollapsed', false));
  const [isSideToolbarCollapsed, setIsSideToolbarCollapsed] = useState(() => getLocalStorageItem('whiteboard_isSideToolbarCollapsed', false));
  const [styleLibrary, setStyleLibrary] = useState<StyleClipboardData[]>(() => getLocalStorageItem('whiteboard_styleLibrary', []));
  const [materialLibrary, setMaterialLibrary] = useState<MaterialData[]>(() => getLocalStorageItem('whiteboard_materialLibrary', []));
  const [isStyleLibraryOpen, setIsStyleLibraryOpen] = useState(() => getLocalStorageItem('whiteboard_isStyleLibraryOpen', false));
  const [styleLibraryPosition, setStyleLibraryPosition] = useState(() => getLocalStorageItem('whiteboard_styleLibraryPosition', { x: window.innerWidth - 400, y: 150 }));


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
            const data: WhiteboardData = JSON.parse(contents);
            if (data?.type === 'whiteboard/shapes' && Array.isArray(data.paths)) {
              pathState.handleLoadFile(data.paths);
              setBackgroundColor(data.backgroundColor ?? '#17171c');
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

  // Save UI settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('whiteboard_isGridVisible', JSON.stringify(isGridVisible));
  }, [isGridVisible]);

  useEffect(() => {
    localStorage.setItem('whiteboard_gridSize', JSON.stringify(gridSize));
  }, [gridSize]);

  useEffect(() => {
    localStorage.setItem('whiteboard_backgroundColor', JSON.stringify(backgroundColor));
  }, [backgroundColor]);

  useEffect(() => {
    localStorage.setItem('whiteboard_isStatusBarCollapsed', JSON.stringify(isStatusBarCollapsed));
  }, [isStatusBarCollapsed]);
  
  useEffect(() => {
    localStorage.setItem('whiteboard_isSideToolbarCollapsed', JSON.stringify(isSideToolbarCollapsed));
  }, [isSideToolbarCollapsed]);
  
  useEffect(() => {
    localStorage.setItem('whiteboard_styleLibrary', JSON.stringify(styleLibrary));
  }, [styleLibrary]);

  useEffect(() => {
    localStorage.setItem('whiteboard_materialLibrary', JSON.stringify(materialLibrary));
  }, [materialLibrary]);
  
  useEffect(() => {
    localStorage.setItem('whiteboard_isStyleLibraryOpen', JSON.stringify(isStyleLibraryOpen));
  }, [isStyleLibraryOpen]);
  
  useEffect(() => {
    localStorage.setItem('whiteboard_styleLibraryPosition', JSON.stringify(styleLibraryPosition));
  }, [styleLibraryPosition]);

  const viewTransform = useViewTransform();
  const { viewTransform: vt, isPanning, handleWheel, getPointerPosition, lastPointerPosition } = viewTransform;

  const toolbarState = useToolbarState(paths, selectedPathIds, pathState.setPaths, pathState.setSelectedPathIds, pathState.beginCoalescing, pathState.endCoalescing);

  // Decoupled Interaction Hooks
  const drawingInteraction = useDrawing({ pathState, toolbarState, viewTransform, isGridVisible, gridSize });
  const selectionInteraction = useSelection({ pathState, toolbarState, viewTransform, isGridVisible, gridSize });

  const pointerInteraction = usePointerInteraction({ 
    tool: toolbarState.tool,
    viewTransform,
    drawingInteraction,
    selectionInteraction
  });
  
  const handleSetTool = useCallback((newTool: Tool) => {
    if (newTool === toolbarState.tool) return;

    // Cancel any in-progress drawing before switching tools.
    if (drawingInteraction.drawingShape) {
        drawingInteraction.cancelDrawingShape();
    }
    if (pathState.currentPenPath) {
        pathState.handleCancelPenPath();
    }
    if (pathState.currentLinePath) {
        pathState.handleCancelLinePath();
    }
    if (pathState.currentBrushPath) {
        // A brush path is only finalized on pointer up. If we switch tools, it should be discarded.
        pathState.setCurrentBrushPath(null);
    }
    
    toolbarState.setTool(newTool);
  }, [toolbarState, pathState, drawingInteraction]);

  const handleToggleStyleLibrary = (event: React.MouseEvent<HTMLButtonElement>) => {
    setIsStyleLibraryOpen(prevIsOpen => {
      const nextIsOpen = !prevIsOpen;
      if (nextIsOpen) {
        const popoverWidth = 288; // w-72 from StyleLibraryPopover
        const estimatedPopoverHeight = 320; // Estimated from StyleLibraryPopover layout
        const gap = 16; // gap from sidebar
        const margin = 16; // viewport margin

        const buttonRect = event.currentTarget.getBoundingClientRect();
        
        const idealX = buttonRect.left - popoverWidth - gap;
        const idealY = buttonRect.top;

        // Clamp position to be within viewport
        const clampedX = Math.max(margin, Math.min(idealX, window.innerWidth - popoverWidth - margin));
        const clampedY = Math.max(margin, Math.min(idealY, window.innerHeight - estimatedPopoverHeight - margin));
        
        setStyleLibraryPosition({ x: clampedX, y: clampedY });
      }
      return nextIsOpen;
    });
  };

  // Encapsulated Action Handlers
  const appActions = useAppActions({ 
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
    materialLibrary,
    setMaterialLibrary,
  });
  const { 
    handleCut, handleCopy, handlePaste, handleFlip, handleCopyAsSvg, handleCopyAsPng, 
    handleSaveFile, handleSaveAs, handleOpen,
    handleImportClick, handleSvgFileChange, importFileRef,
    handleConvertToPath,
    handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack,
    handleExportAsSvg, handleExportAsPng,
    handleGroup, handleUngroup, handleCopyStyle, handlePasteStyle,
    handleAddStyle, handleApplyStyle, handleSaveLibrary, handleLoadLibrary,
    handleAddMaterial, handleApplyMaterial,
    handleAlign, handleDistribute,
  } = appActions;
  
  // Global Event Listeners (Hotkeys, Clipboard)
  useGlobalEventHandlers({
    ...pathState, ...toolbarState, 
    setTool: handleSetTool,
    drawingShape: drawingInteraction.drawingShape, cancelDrawingShape: drawingInteraction.cancelDrawingShape, isGridVisible, setIsGridVisible, 
    handleCut, handleCopy, handlePaste, handleImportClick, handleFileImport: appActions.handleFileImport, 
    handleSaveFile,
    handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack,
    handleGroup, handleUngroup,
    getPointerPosition, viewTransform: vt, lastPointerPosition
  });

  const canClearCanvas = pathState.canClear || !!drawingInteraction.drawingShape;

  const canvasBbox = paths.length > 0 ? getPathsBoundingBox(paths, true) : null;
  const elementCount = paths.length;
  const canvasWidth = canvasBbox ? Math.round(canvasBbox.width) : 0;
  const canvasHeight = canvasBbox ? Math.round(canvasBbox.height) : 0;

  const handleClearCanvas = () => {
    if (!canClearCanvas) return;
    drawingInteraction.cancelDrawingShape();
    pathState.handleClear();
    toolbarState.setTool('selection');
    setBackgroundColor('#17171c');

    setActiveFileHandle(null);
    setActiveFileName(null);
    idb.del('last-active-file-handle').catch(() => {});
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Special handling for canceling arc drawing
    if (toolbarState.tool === 'arc' && drawingInteraction.drawingShape) {
        drawingInteraction.cancelDrawingShape();
        return;
    }

    let pathWasFinished = false;
    if (toolbarState.tool === 'pen' && pathState.currentPenPath) { 
      handleFinishPenPath(); 
      pathWasFinished = true; 
    }
    if (toolbarState.tool === 'line' && pathState.currentLinePath) {
      handleFinishLinePath();
      pathWasFinished = true;
    }
    
    if (pathWasFinished) return;

    const svg = (e.currentTarget as HTMLElement).querySelector('svg');
    if (!svg) return;
    const worldPos = getPointerPosition({ clientX: e.clientX, clientY: e.clientY }, svg);
    
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, worldX: worldPos.x, worldY: worldPos.y });
  };

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    switch (toolbarState.tool) {
      case 'selection': 
        if (toolbarState.selectionMode === 'lasso') return 'crosshair';
        return toolbarState.selectionMode === 'move' ? 'grab' : 'default';
      case 'brush': case 'pen': case 'rectangle': case 'polygon': case 'ellipse': case 'line': case 'arc': return 'crosshair';
      default: return 'default';
    }
  };
  
  const canGroup = selectedPathIds.length > 1;
  const canUngroup = paths.some(p => selectedPathIds.includes(p.id) && p.tool === 'group');

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
    { label: '复制样式', handler: handleCopyStyle, disabled: selectedPathIds.length !== 1 },
    { label: '粘贴样式', handler: handlePasteStyle, disabled: !styleClipboard || selectedPathIds.length === 0 },
    { label: '---' },
    { label: '水平翻转', handler: () => handleFlip('horizontal'), disabled: selectedPathIds.length === 0 },
    { label: '垂直翻转', handler: () => handleFlip('vertical'), disabled: selectedPathIds.length === 0 },
    { label: '---' },
    { label: '编组', handler: handleGroup, disabled: !canGroup, shortcut: modKey('G') },
    { label: '取消编组', handler: handleUngroup, disabled: !canUngroup, shortcut: modShiftKey('G') },
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

  const canConvertToPath = selectedPathIds.length > 0 && paths.some(p => selectedPathIds.includes(p.id) && (p.tool === 'rectangle' || p.tool === 'ellipse' || p.tool === 'polygon' || p.tool === 'line' || p.tool === 'brush' || p.tool === 'arc'));
  if (canConvertToPath) {
    contextMenuActions.splice(15, 0, { label: '转换为路径', handler: handleConvertToPath });
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Handle material drop from style library
    const materialJSON = e.dataTransfer.getData('application/json');
    if (materialJSON) {
        try {
            const material = JSON.parse(materialJSON) as MaterialData;
            const svg = (e.currentTarget as HTMLElement).querySelector('svg');
            if (svg && material.shapes) {
                const dropPoint = getPointerPosition({ clientX: e.clientX, clientY: e.clientY }, svg);
                appActions.handleApplyMaterial(material, dropPoint);
            }
            return;
        } catch (err) {
            console.error("Failed to handle material drop", err);
        }
    }

    // Handle file drop from filesystem
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.type === 'image/svg+xml' || file.name.endsWith('.svg'))) {
        appActions.handleFileImport(file);
    }
  };


  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-gradient)] text-[var(--text-primary)]">
        正在加载...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen font-sans bg-transparent relative overflow-hidden">
      <input type="file" ref={importFileRef} onChange={handleSvgFileChange} accept=".svg,image/svg+xml" className="hidden" />
      
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <MainMenu 
          onSave={handleSaveFile} 
          onSaveAs={handleSaveAs} 
          onOpen={handleOpen} 
          onImport={handleImportClick} 
          onClear={handleClearCanvas} 
          canClear={canClearCanvas}
          onExportSvg={handleExportAsSvg}
          onExportPng={handleExportAsPng}
          canExport={paths.length > 0}
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
        />
        {activeFileName && (
          <div className="bg-[var(--ui-panel-bg)] backdrop-blur-lg text-[var(--text-primary)] text-sm px-3 h-12 flex items-center rounded-lg border border-[var(--ui-panel-border)] shadow-lg">
            {activeFileName}
          </div>
        )}
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20"><Toolbar tool={toolbarState.tool} setTool={handleSetTool} isGridVisible={isGridVisible} setIsGridVisible={setIsGridVisible} gridSize={gridSize} setGridSize={setGridSize} /></div>
      
      <button
        onClick={() => setIsSideToolbarCollapsed(prev => !prev)}
        className="absolute top-4 right-4 z-30 h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-lg border border-[var(--ui-panel-border)] text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        title={isSideToolbarCollapsed ? '展开工具栏' : '折叠工具栏'}
      >
        <div className={`transition-transform duration-300 ${isSideToolbarCollapsed ? '' : 'rotate-180'}`}>
          {ICONS.CHEVRON_LEFT}
        </div>
      </button>

      <div className={`absolute top-1/2 -translate-y-1/2 right-4 z-20 transition-transform duration-300 ease-in-out ${isSideToolbarCollapsed ? 'translate-x-[calc(100%+1rem)]' : 'translate-x-0'}`}>
        <SideToolbar 
            {...toolbarState} 
            beginCoalescing={pathState.beginCoalescing} 
            endCoalescing={pathState.endCoalescing}
            onToggleStyleLibrary={handleToggleStyleLibrary}
            isStyleLibraryOpen={isStyleLibraryOpen}
        />
      </div>
      
      {toolbarState.tool === 'selection' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <SelectionToolbar 
            selectionMode={toolbarState.selectionMode} 
            setSelectionMode={toolbarState.setSelectionMode}
            isSimplifiable={toolbarState.isSimplifiable}
            beginSimplify={toolbarState.beginSimplify}
            setSimplify={toolbarState.setSimplify}
            endSimplify={toolbarState.endSimplify}
            selectedPathIds={selectedPathIds}
            onAlign={handleAlign}
            onDistribute={handleDistribute}
          />
        </div>
      )}
      
       <div className="absolute bottom-4 left-4 z-20">
        <StatusBar 
          zoomLevel={vt.scale} 
          onUndo={pathState.handleUndo} 
          canUndo={pathState.canUndo} 
          onRedo={pathState.handleRedo} 
          canRedo={pathState.canRedo} 
          elementCount={elementCount}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          isCollapsed={isStatusBarCollapsed}
          onToggleCollapse={() => setIsStatusBarCollapsed(prev => !prev)}
        />
       </div>
      
      <div 
        className="w-full h-full"
        style={{ backgroundColor }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
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
          lassoPath={selectionInteraction.lassoPath}
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
      
      <StyleLibraryPopover
        isOpen={isStyleLibraryOpen}
        onClose={() => setIsStyleLibraryOpen(false)}
        position={styleLibraryPosition}
        onPositionChange={setStyleLibraryPosition}
        styleLibrary={styleLibrary}
        setStyleLibrary={setStyleLibrary}
        materialLibrary={materialLibrary}
        setMaterialLibrary={setMaterialLibrary}
        selectedPathIds={selectedPathIds}
        onAddStyle={handleAddStyle}
        onApplyStyle={handleApplyStyle}
        onSaveLibrary={handleSaveLibrary}
        onLoadLibrary={handleLoadLibrary}
        onAddMaterial={handleAddMaterial}
        onApplyMaterial={handleApplyMaterial}
      />
      
      {contextMenu?.isOpen && (<ContextMenu isOpen={contextMenu.isOpen} position={{ x: contextMenu.x, y: contextMenu.y }} actions={contextMenuActions} onClose={() => setContextMenu(null)} />)}
    </div>
  );
};

export default App;