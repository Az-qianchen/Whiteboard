/**
 * 本文件定义了画布的覆盖层组件。
 * 它包含了所有绝对定位在画布上方的UI元素，如工具栏、菜单和对话框。
 */
import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import PanelButton from '@/components/PanelButton';
import { CONTROL_BUTTON_CLASS, getTimelinePanelBottomOffset } from '@/constants';
import { Toolbar } from '../Toolbar';
import { SelectionToolbar } from '../SelectionToolbar';
import { ContextMenu } from '../ContextMenu';
import { TextEditor } from '../TextEditor';
import { StyleLibraryPopover } from '../side-toolbar';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { Breadcrumbs } from '../Breadcrumbs';
import { AboutButton } from './AboutButton';
import { CropToolbar } from '../CropToolbar';
import type { AnyPath, TextData, MaterialData } from '@/types';
import { ICONS } from '@/constants';
import { getPathsBoundingBox, getPathBoundingBox } from '@/lib/drawing';

// Helper to define context menu actions
const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = (key: string) => `${isMac ? '⌘' : 'Ctrl+'}${key}`;
const modShiftKey = (key: string) => `${isMac ? '⇧⌘' : 'Ctrl+Shift+'}${key}`;

export const CanvasOverlays: React.FC = () => {
    const store = useAppContext();
    const { t } = useTranslation();
    const {
        contextMenu,
        setContextMenu,
        isGridVisible,
        setIsGridVisible,
        gridSize,
        setGridSize,
        gridSubdivisions,
        setGridSubdivisions,
        gridOpacity,
        setGridOpacity,
        paths,
        groupIsolationPath,
        handleJumpToGroup,
        selectedPathIds,
        tool,
        selectionMode,
        handleSetTool,
        isStyleLibraryOpen,
        setIsStyleLibraryOpen,
        styleLibraryPosition,
        setStyleLibraryPosition,
        isSimplifiable,
        beginSimplify,
        setSimplify,
        endSimplify,
        handleCut,
        handleCopy,
        handlePaste,
        handleFlip,
        handleCopyAsSvg,
        handleCopyAsPng,
        handleConvertToPath,
        handleBringForward,
        handleSendBackward,
        handleBringToFront,
        handleSendToBack,
        handleGroup,
        handleUngroup,
        handleMask,
        handleCopyStyle,
        handlePasteStyle,
        styleClipboard,
        styleLibrary,
        setStyleLibrary,
        materialLibrary,
        setMaterialLibrary,
        handleAddStyle,
        handleApplyStyle,
        handleSaveLibrary,
        handleLoadLibrary,
        handleClearLibrary,
        handleAddMaterial,
        handleApplyMaterial,
        handleAlign,
        handleDistribute,
        handleBooleanOperation,
        handleTraceImage,
        confirmationDialog,
        hideConfirmation,
        editingTextPathId: activeEditingTextPathId, // rename to avoid conflict
        handleTextChange,
        handleTextEditCommit,
        croppingState,
        cropTool,
        setCropTool,
        cropMagicWandOptions,
        setCropMagicWandOptions,
        cropSelectionContours,
        applyMagicWandSelection,
        cancelMagicWandSelection,
        confirmCrop,
        trimTransparentEdges,
        cancelCrop,
        undo: handleUndo,
        canUndo,
        redo: handleRedo,
        canRedo,
        isTimelineCollapsed,
        setIsTimelineCollapsed,
    } = store;

    const editingPath = useMemo(() => 
        paths.find((p: AnyPath) => p.id === activeEditingTextPathId && p.tool === 'text') as TextData | undefined,
        [paths, activeEditingTextPathId]
    );

    const canGroup = useMemo(() => selectedPathIds.length > 1, [selectedPathIds]);
    const canUngroup = useMemo(() => paths.some((p: AnyPath) => selectedPathIds.includes(p.id) && p.tool === 'group'), [paths, selectedPathIds]);
    const canConvertToPath = useMemo(() => 
        selectedPathIds.length > 0 && paths.some((p: AnyPath) => selectedPathIds.includes(p.id) && ['rectangle', 'ellipse', 'polygon', 'line', 'brush', 'arc'].includes(p.tool)),
        [paths, selectedPathIds]
    );
    const isTraceable = useMemo(() => {
        if (selectedPathIds.length !== 1) return false;
        const path = paths.find((p: AnyPath) => p.id === selectedPathIds[0]);
        return path?.tool === 'image';
    }, [paths, selectedPathIds]);

    /**
     * 构建上下文菜单的操作列表。
     */
    const contextMenuActions = useMemo(() => {
        const actions = [
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
        ];
        if (tool === 'selection' && selectionMode === 'move' && selectedPathIds.length > 0) {
            actions.splice(3, 0,
                { label: '---' },
                { label: '复制为 SVG', handler: handleCopyAsSvg, disabled: selectedPathIds.length === 0 },
                { label: '复制为 PNG', handler: handleCopyAsPng, disabled: selectedPathIds.length === 0 },
            );
        }
        if (canConvertToPath) {
            actions.splice(15, 0, { label: '转换为路径', handler: handleConvertToPath, disabled: !canConvertToPath });
        }
        return actions;
    }, [selectedPathIds.length, canGroup, canUngroup, canConvertToPath, styleClipboard, tool, selectionMode, contextMenu, handleCut, handleCopy, handlePaste, handleCopyStyle, handlePasteStyle, handleFlip, handleGroup, handleUngroup, handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack, handleCopyAsSvg, handleCopyAsPng, handleConvertToPath]);
    

    const timelineBottomOffset = useMemo(
        () => getTimelinePanelBottomOffset(),
        []
    );

    return (
        <>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                <Toolbar tool={tool} setTool={handleSetTool} isGridVisible={isGridVisible} setIsGridVisible={setIsGridVisible} gridSize={gridSize} setGridSize={setGridSize} gridSubdivisions={gridSubdivisions} setGridSubdivisions={setGridSubdivisions} gridOpacity={gridOpacity} setGridOpacity={setGridOpacity} />
                {groupIsolationPath.length > 0 && <Breadcrumbs path={groupIsolationPath} onJumpTo={handleJumpToGroup} />}
            </div>

            {tool === 'selection' && !croppingState && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 z-30"
                    style={{ bottom: timelineBottomOffset }}
                >
                    <SelectionToolbar
                        selectionMode={selectionMode} setSelectionMode={store.setSelectionMode}
                        isSimplifiable={isSimplifiable} beginSimplify={beginSimplify}
                        setSimplify={setSimplify} endSimplify={endSimplify}
                        selectedPathIds={selectedPathIds} onAlign={handleAlign} onDistribute={handleDistribute}
                        onBooleanOperation={handleBooleanOperation}
                        onMask={handleMask}
                        isTraceable={isTraceable}
                        onTraceImage={handleTraceImage}
                    />
                </div>
            )}
            
            {croppingState && (
                <CropToolbar
                    isTimelineCollapsed={isTimelineCollapsed}
                    cropTool={cropTool}
                    setCropTool={setCropTool}
                    cropMagicWandOptions={cropMagicWandOptions}
                    setCropMagicWandOptions={setCropMagicWandOptions}
                    cropSelectionContours={cropSelectionContours}
                    applyMagicWandSelection={applyMagicWandSelection}
                    cancelMagicWandSelection={cancelMagicWandSelection}
                    trimTransparentEdges={trimTransparentEdges}
                    confirmCrop={confirmCrop}
                    cancelCrop={cancelCrop}
                />
            )}

            {editingPath && (
                <TextEditor
                    path={editingPath} viewTransform={store.viewTransform}
                    onUpdate={(newText) => handleTextChange(editingPath.id, newText)} onCommit={handleTextEditCommit}
                />
            )}
            
            <StyleLibraryPopover
                isOpen={isStyleLibraryOpen} onClose={() => setIsStyleLibraryOpen(false)}
                position={styleLibraryPosition} onPositionChange={setStyleLibraryPosition}
                styleLibrary={styleLibrary} setStyleLibrary={setStyleLibrary}
                materialLibrary={materialLibrary} setMaterialLibrary={setMaterialLibrary}
                selectedPathIds={selectedPathIds} onAddStyle={handleAddStyle} onApplyStyle={handleApplyStyle}
                onSaveLibrary={handleSaveLibrary} onLoadLibrary={handleLoadLibrary} onClearLibrary={handleClearLibrary}
                onAddMaterial={handleAddMaterial} onApplyMaterial={handleApplyMaterial}
            />

            {contextMenu?.isOpen && (<ContextMenu isOpen={contextMenu.isOpen} position={{ x: contextMenu.x, y: contextMenu.y }} actions={contextMenuActions} onClose={() => setContextMenu(null)} />)}

            <div
                className="absolute left-4 z-30 flex items-center gap-2"
                style={{
                    bottom: timelineBottomOffset,
                }}
            >
                <PanelButton
                    onClick={() => setIsTimelineCollapsed(prev => !prev)}
                    title={isTimelineCollapsed ? t('expandTimeline') : t('collapseTimeline')}
                    variant="unstyled"
                    className={CONTROL_BUTTON_CLASS}
                >
                    <div className={`transition-transform duration-300 ${!isTimelineCollapsed ? 'rotate-180' : ''}`}>{ICONS.CHEVRON_UP}</div>
                </PanelButton>
                <PanelButton
                    onClick={handleUndo}
                    disabled={!canUndo}
                    title={t('undo', { shortcut: modKey('Z') })}
                    variant="unstyled"
                    className={`${CONTROL_BUTTON_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {ICONS.UNDO}
                </PanelButton>
                <PanelButton
                    onClick={handleRedo}
                    disabled={!canRedo}
                    title={t('redo', { shortcut: modShiftKey('Z') })}
                    variant="unstyled"
                    className={`${CONTROL_BUTTON_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {ICONS.REDO}
                </PanelButton>
            </div>

            <AboutButton />

            <ConfirmationDialog
                isOpen={!!confirmationDialog?.isOpen}
                onClose={hideConfirmation}
                onConfirm={confirmationDialog?.onConfirm ?? (() => {})}
                title={confirmationDialog?.title ?? ''}
                message={confirmationDialog?.message ?? ''}
                confirmButtonText={confirmationDialog?.confirmButtonText || t('confirm')}
                cancelButtonText={confirmationDialog?.cancelButtonText || t('cancel')}
            />
        </>
    );
};
