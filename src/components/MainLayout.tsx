/**
 * 本文件是应用的主布局组件。
 * 它负责渲染所有顶层 UI 组件，如工具栏、主菜单和白板，
 * 并从 AppContext 获取所需的状态和操作。
 */
import React, { useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import useGlobalEventHandlers from '../hooks/useGlobalEventHandlers';
import { Whiteboard } from './Whiteboard';
import { LayersProvider } from '../lib/layers-context';
import { ICONS } from '../constants';
import type { MaterialData, AnyPath } from '../types';

// Import new layout components
import { MainMenuPanel } from './layout/MainMenuPanel';
import { SideToolbarPanel } from './layout/SideToolbarPanel';
import { CanvasOverlays } from './layout/CanvasOverlays';
import { TimelinePanel } from './TimelinePanel';
import { CollapseToggleButton } from './layout/CollapseToggleButton';

export const MainLayout: React.FC = () => {
    const store = useAppContext();
    useGlobalEventHandlers();

    // Destructure only the props needed for the core layout and whiteboard
    const {
        isLoading,
        isMainMenuCollapsed,
        setIsMainMenuCollapsed,
        backgroundColor,
        frames,
        currentFrameIndex,
        isOnionSkinEnabled,
        onionSkinPrevFrames,
        onionSkinNextFrames,
        onionSkinOpacity,
        // Whiteboard props
        activePaths,
        backgroundPaths,
        tool,
        selectionMode,
        currentBrushPath,
        drawingInteraction,
        currentPenPath,
        currentLinePath,
        selectedPathIds,
        selectionInteraction,
        pointerInteraction,
        viewTransform,
        isPanning,
        handleWheel,
        setContextMenu,
        isGridVisible,
        gridSize,
        gridSubdivisions,
        gridOpacity,
        editingTextPathId,
        croppingState,
        currentCropRect,
        // Drop handler props
        getPointerPosition,
        handleApplyMaterial,
        handleFileImport,
        // Pen/Line tool finishers for context menu
        handleFinishPenPath,
        handleFinishLinePath,
    } = store;

    const onionSkinPaths = useMemo(() => {
        if (!isOnionSkinEnabled || frames.length <= 1) {
            return [];
        }

        const skinPaths: AnyPath[] = [];
        const maxOpacity = onionSkinOpacity;

        // Previous frames
        for (let i = 1; i <= onionSkinPrevFrames; i++) {
            const frameIndex = currentFrameIndex - i;
            if (frameIndex < 0) break;
            const opacity = maxOpacity * ((onionSkinPrevFrames - i + 1) / (onionSkinPrevFrames + 1));
            const framePaths = frames[frameIndex].paths.map(p => ({
                ...p,
                id: `onion-prev-${i}-${p.id}`,
                opacity: (p.opacity ?? 1) * opacity,
                isLocked: true,
            }));
            skinPaths.push(...framePaths);
        }

        // Next frames
        for (let i = 1; i <= onionSkinNextFrames; i++) {
            const frameIndex = currentFrameIndex + i;
            if (frameIndex >= frames.length) break;
            const opacity = maxOpacity * ((onionSkinNextFrames - i + 1) / (onionSkinNextFrames + 1));
            const framePaths = frames[frameIndex].paths.map(p => ({
                ...p,
                id: `onion-next-${i}-${p.id}`,
                opacity: (p.opacity ?? 1) * opacity,
                isLocked: true,
            }));
            skinPaths.push(...framePaths);
        }

        return skinPaths;
    }, [isOnionSkinEnabled, frames, currentFrameIndex, onionSkinPrevFrames, onionSkinNextFrames, onionSkinOpacity]);

    /**
     * 创建一个处理画布右键菜单的函数。
     */
    const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (tool === 'arc' && drawingInteraction.drawingShape) {
            drawingInteraction.cancelDrawingShape();
            return;
        }
        let pathWasFinished = false;
        if (tool === 'pen' && currentPenPath) { handleFinishPenPath(); pathWasFinished = true; }
        if (tool === 'line' && currentLinePath) { handleFinishLinePath(); pathWasFinished = true; }
        if (pathWasFinished) return;

        const svg = (e.currentTarget as HTMLElement).querySelector('svg');
        if (!svg) return;
        const worldPos = getPointerPosition({ clientX: e.clientX, clientY: e.clientY }, svg);
        setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, worldX: worldPos.x, worldY: worldPos.y });
    }, [tool, drawingInteraction, currentPenPath, currentLinePath, handleFinishPenPath, handleFinishLinePath, getPointerPosition, setContextMenu]);

    /**
     * 根据当前状态决定光标样式。
     */
    const getCursor = useCallback(() => {
        if (isPanning) return 'grabbing';
        if (selectionInteraction.dragState?.type === 'move' || selectionInteraction.dragState?.type === 'rotate') return 'grabbing';
        if (selectionInteraction.dragState?.type === 'crop') return (selectionInteraction.dragState as any).cursor || 'crosshair';
        switch (tool) {
            case 'selection':
                if (selectionMode === 'lasso') return 'crosshair';
                if (selectionMode === 'move') return selectionInteraction.isHoveringMovable ? 'grab' : 'default';
                if (selectionMode === 'edit') return selectionInteraction.isHoveringEditable ? 'pointer' : 'default';
                return 'default';
            case 'brush': case 'pen': case 'rectangle': case 'polygon': case 'ellipse': case 'line': case 'arc': case 'text': return 'crosshair';
            default: return 'default';
        }
    }, [isPanning, tool, selectionMode, selectionInteraction.dragState, selectionInteraction.isHoveringMovable, selectionInteraction.isHoveringEditable]);

    /**
     * 处理画布上的拖放事件，用于素材和文件导入。
     */
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const materialJSON = e.dataTransfer.getData('application/json');
        if (materialJSON) {
            try {
                const material = JSON.parse(materialJSON) as MaterialData;
                const svg = (e.currentTarget as HTMLElement).querySelector('svg');
                if (svg && material.shapes) {
                    const dropPoint = getPointerPosition({ clientX: e.clientX, clientY: e.clientY }, svg);
                    handleApplyMaterial(material, dropPoint);
                }
                return;
            } catch (err) { console.error("Failed to handle material drop", err); }
        }
        const file = e.dataTransfer?.files?.[0];
        if (file && (file.type === 'image/svg+xml' || file.name.endsWith('.svg'))) {
            handleFileImport(file);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[var(--bg-color)] text-[var(--text-primary)]">
                正在加载...
            </div>
        );
    }

    return (
        <div className="h-full w-full max-w-full font-sans bg-transparent flex overflow-hidden">
            <LayersProvider {...store}>
                <MainMenuPanel />

                <main className="flex-grow h-full relative flex flex-col min-w-0">
                    <div className="absolute top-4 left-4 z-30">
                        <CollapseToggleButton
                            isCollapsed={isMainMenuCollapsed}
                            onToggle={() => setIsMainMenuCollapsed(prev => !prev)}
                            collapsedLabel="展开菜单"
                            expandedLabel="折叠菜单"
                            icon={ICONS.CHEVRON_LEFT}
                            rotateWhen="collapsed"
                        />
                    </div>

                    <SideToolbarPanel />

                    <CanvasOverlays />

                    <div
                        className="flex-grow w-full relative min-w-0"
                        style={{ backgroundColor }}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <Whiteboard
                            paths={activePaths}
                            onionSkinPaths={onionSkinPaths}
                            backgroundPaths={backgroundPaths}
                            tool={tool}
                            selectionMode={selectionMode}
                            currentLivePath={currentBrushPath}
                            drawingShape={drawingInteraction.drawingShape}
                            currentPenPath={currentPenPath}
                            currentLinePath={currentLinePath}
                            previewD={drawingInteraction.previewD}
                            selectedPathIds={selectedPathIds}
                            marquee={selectionInteraction.marquee}
                            lassoPath={selectionInteraction.lassoPath}
                            onPointerDown={pointerInteraction.onPointerDown}
                            onPointerMove={pointerInteraction.onPointerMove}
                            onPointerUp={pointerInteraction.onPointerUp}
                            onPointerLeave={pointerInteraction.onPointerLeave}
                            viewTransform={viewTransform}
                            cursor={getCursor()}
                            onWheel={handleWheel}
                            onContextMenu={handleContextMenu}
                            isGridVisible={isGridVisible}
                            gridSize={gridSize}
                            gridSubdivisions={gridSubdivisions}
                            gridOpacity={gridOpacity}
                            dragState={selectionInteraction.dragState}
                            editingTextPathId={editingTextPathId}
                            croppingState={croppingState}
                            currentCropRect={currentCropRect}
                        />
                    </div>
                    <TimelinePanel />
                </main>
            </LayersProvider>
        </div>
    );
};