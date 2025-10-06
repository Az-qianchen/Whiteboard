/**
 * 本文件定义了主菜单面板组件。
 * 它包含了主菜单，并管理其宽度调整逻辑。
 */
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MainMenu } from '../MainMenu';
import type { AnyPath } from '@/types';
import { getPathsBoundingBox, getPathBoundingBox } from '@/lib/drawing';
import { collectPathsByIds } from '@/lib/pathTree';
import { DEFAULT_MAIN_MENU_WIDTH } from '@/constants';

export const MainMenuPanel: React.FC = () => {
    const {
        isMainMenuCollapsed,
        mainMenuWidth,
        setMainMenuWidth,
        handleSaveFile,
        handleSaveAs,
        handleOpen,
        handleImportClick,
        handleClear,
        canClear,
        handleClearAllData,
        canClearAllData,
        handleExportAsSvg,
        handleExportAsPng,
        handleExportAnimation,
        handleResetPreferences,
        frames,
        paths,
        selectedPathIds,
        backgroundColor,
        setBackgroundColor,
        hasUnsavedChanges,
        lastSavedDocumentSignature,
        viewTransform,
        isStatusBarCollapsed,
        setIsStatusBarCollapsed,
        pngExportOptions,
        setPngExportOptions,
    } = useAppContext();

    const [isResizing, setIsResizing] = useState(false);
    
    /**
     * 记忆化计算选中对象的信息，用于状态栏显示。
     */
    const selectionInfo = useMemo(() => {
        if (selectedPathIds.length === 1) {
            const selectedPath = paths.find((p: AnyPath) => p.id === selectedPathIds[0]);
            if (selectedPath) {
                if ('width' in selectedPath && 'height' in selectedPath && 'x' in selectedPath && 'y' in selectedPath) {
                    const rotation = selectedPath.rotation ? Math.round((selectedPath.rotation * (180 / Math.PI) + 360)) % 360 : 0;
                    return {
                        type: 'single' as const,
                        x: Math.round(selectedPath.x),
                        y: Math.round(selectedPath.y),
                        width: Math.round(selectedPath.width),
                        height: Math.round(selectedPath.height),
                        rotation: rotation,
                    };
                } else {
                    const bbox = getPathBoundingBox(selectedPath, false);
                    if (bbox) {
                        return {
                            type: 'single-bbox' as const,
                            x: Math.round(bbox.x),
                            y: Math.round(bbox.y),
                            width: Math.round(bbox.width),
                            height: Math.round(bbox.height),
                            rotation: 0,
                        };
                    }
                }
            }
        } else if (selectedPathIds.length > 1) {
            const selectedPaths = collectPathsByIds(paths, selectedPathIds);
            const bbox = getPathsBoundingBox(selectedPaths, false);
            if (bbox) {
                return {
                    type: 'multiple' as const,
                    count: selectedPathIds.length,
                    width: Math.round(bbox.width),
                    height: Math.round(bbox.height),
                };
            }
        }
        return null;
    }, [paths, selectedPathIds]);
    
    const elementCount = useMemo(() => paths.length, [paths]);
    const canvasBbox = useMemo(() => paths.length > 0 ? getPathsBoundingBox(paths, true) : null, [paths]);
    const canvasWidth = useMemo(() => canvasBbox ? Math.round(canvasBbox.width) : 0, [canvasBbox]);
    const canvasHeight = useMemo(() => canvasBbox ? Math.round(canvasBbox.height) : 0, [canvasBbox]);

    const isDocumentUncreated = lastSavedDocumentSignature === null;


    /**
     * 处理主菜单宽度调整的指针按下事件。
     */
    const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;

        setIsResizing(true);
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startWidth = mainMenuWidth ?? DEFAULT_MAIN_MENU_WIDTH;
        const MIN_WIDTH = DEFAULT_MAIN_MENU_WIDTH;
        const MAX_WIDTH = 500;

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startX;
            let newWidth = startWidth + dx;
            newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
            setMainMenuWidth(newWidth);
        };

        const handlePointerUp = () => {
            setIsResizing(false);
            target.releasePointerCapture(e.pointerId);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const effectiveWidth = mainMenuWidth ?? DEFAULT_MAIN_MENU_WIDTH;

    return (
        <div
            className="relative flex-shrink-0 overflow-hidden"
            style={{
                width: isMainMenuCollapsed ? '0px' : `${effectiveWidth}px`,
                transition: isResizing ? 'none' : 'width 300ms ease-in-out'
            }}
        >
            <div
                className="h-full"
                style={{ width: `${effectiveWidth}px` }}
            >
                <MainMenu
                    onSave={handleSaveFile}
                    onSaveAs={handleSaveAs}
                    onOpen={handleOpen}
                    onImport={handleImportClick}
                    onClear={handleClear}
                    canClear={canClear}
                    onClearAllData={handleClearAllData}
                    canClearAllData={canClearAllData}
                    onExportSvg={handleExportAsSvg}
                    onExportPng={handleExportAsPng}
                    onExportAnimation={handleExportAnimation}
                    canExport={paths.length > 0}
                    frameCount={frames.length}
                    backgroundColor={backgroundColor}
                    setBackgroundColor={setBackgroundColor}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isDocumentUncreated={isDocumentUncreated}
                    onResetPreferences={handleResetPreferences}
                    zoomLevel={viewTransform.scale}
                    selectionInfo={selectionInfo}
                    elementCount={elementCount}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    isStatusBarCollapsed={isStatusBarCollapsed}
                    setIsStatusBarCollapsed={setIsStatusBarCollapsed}
                    pngExportOptions={pngExportOptions}
                    setPngExportOptions={setPngExportOptions}
                />
            </div>
            {!isMainMenuCollapsed && (
                <div
                    className="absolute top-0 -right-1 h-full w-2 cursor-col-resize z-40 group"
                    onPointerDown={handleResizePointerDown}
                >
                    <div className="w-px h-full bg-[var(--ui-panel-border)] group-hover:bg-[var(--accent-primary)] transition-colors duration-200 mx-auto"></div>
                </div>
            )}
        </div>
    );
};
