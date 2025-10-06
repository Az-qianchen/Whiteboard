/**
 * 本文件定义了画布的覆盖层组件。
 * 它包含了所有绝对定位在画布上方的UI元素，如工具栏、菜单和对话框。
 */
import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import PanelButton from '@/components/PanelButton';
import { CONTROL_BUTTON_CLASS, getTimelinePanelBottomOffset } from '@/constants';
import { Toolbar } from '../Toolbar';
import { SelectionToolbar } from '../SelectionToolbar';
import { ContextMenu } from '../ContextMenu';
import { StyleLibraryPopover } from '../side-toolbar';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { Breadcrumbs } from '../Breadcrumbs';
import { AboutButton } from './AboutButton';
import { CropToolbar } from '../CropToolbar';
import type { AnyPath, MaterialData, TextData } from '@/types';
import { ICONS } from '@/constants';
import { getPathsBoundingBox, getPathBoundingBox } from '@/lib/drawing';
import { layoutText, resolveLineHeight } from '@/lib/text';
import {
    createTranslationMatrix,
    getShapeTransformMatrix,
    matrixToCssString,
    multiplyMatrices,
} from '@/lib/drawing/transform/matrix';

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
        handleAdjustImageHsv,
        confirmationDialog,
        hideConfirmation,
        croppingState,
        cropTool,
        setCropTool,
        cropMagicWandOptions,
        setCropMagicWandOptions,
        cropSelectionMode,
        setCropSelectionMode,
        cropBrushSize,
        setCropBrushSize,
        cropSelectionOperation,
        setCropSelectionOperation,
        cropSelectionContours,
        invertMagicWandSelection,
        applyMagicWandSelection,
        cutMagicWandSelection,
        confirmCrop,
        trimTransparentEdges,
        cancelCrop,
        undo: handleUndo,
        canUndo,
        redo: handleRedo,
        canRedo,
        isTimelineCollapsed,
        setIsTimelineCollapsed,
        textEditing,
        updateTextEditing,
        commitTextEditing,
        cancelTextEditing,
        viewTransform: camera,
    } = store;

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

    const activeTextPath = useMemo(() => {
        if (!textEditing) return null;
        const target = paths.find((p: AnyPath) => p.id === textEditing.pathId);
        return target && target.tool === 'text' ? target as TextData : null;
    }, [textEditing, paths]);

    const textEditorOverlay = useMemo(() => {
        if (!textEditing || !activeTextPath) return null;
        return (
            <TextEditingOverlay
                key={textEditing.pathId}
                path={activeTextPath}
                draft={textEditing.draft}
                isNew={textEditing.isNew ?? false}
                viewTransform={camera}
                onChange={updateTextEditing}
                onCommit={commitTextEditing}
            />
        );
    }, [textEditing, activeTextPath, camera, updateTextEditing, commitTextEditing]);

    /**
     * 构建上下文菜单的操作列表。
     */
    const contextMenuActions = useMemo(() => {
        const actions = [
            { label: t('contextMenu.cut'), handler: handleCut, disabled: selectedPathIds.length === 0, shortcut: modKey('X') },
            { label: t('contextMenu.copy'), handler: handleCopy, disabled: selectedPathIds.length === 0, shortcut: modKey('C') },
            { label: t('contextMenu.paste'), handler: () => handlePaste({ pasteAt: { x: contextMenu?.worldX ?? 0, y: contextMenu?.worldY ?? 0 } }), shortcut: modKey('V') },
            { label: '---' },
            { label: t('contextMenu.copyStyle'), handler: handleCopyStyle, disabled: selectedPathIds.length !== 1 },
            { label: t('contextMenu.pasteStyle'), handler: handlePasteStyle, disabled: !styleClipboard || selectedPathIds.length === 0 },
            { label: '---' },
            { label: t('contextMenu.flipHorizontal'), handler: () => handleFlip('horizontal'), disabled: selectedPathIds.length === 0 },
            { label: t('contextMenu.flipVertical'), handler: () => handleFlip('vertical'), disabled: selectedPathIds.length === 0 },
            { label: '---' },
            { label: t('contextMenu.group'), handler: handleGroup, disabled: !canGroup, shortcut: modKey('G') },
            { label: t('contextMenu.ungroup'), handler: handleUngroup, disabled: !canUngroup, shortcut: modShiftKey('G') },
            { label: '---' },
            { label: t('contextMenu.bringForward'), handler: handleBringForward, disabled: selectedPathIds.length === 0, shortcut: ']' },
            { label: t('contextMenu.sendBackward'), handler: handleSendBackward, disabled: selectedPathIds.length === 0, shortcut: '[' },
            { label: t('contextMenu.bringToFront'), handler: handleBringToFront, disabled: selectedPathIds.length === 0, shortcut: '⇧]' },
            { label: t('contextMenu.sendToBack'), handler: handleSendToBack, disabled: selectedPathIds.length === 0, shortcut: '⇧[' },
        ];
        if (tool === 'selection' && selectionMode === 'move' && selectedPathIds.length > 0) {
            actions.splice(3, 0,
                { label: '---' },
                { label: t('contextMenu.copyAsSvg'), handler: handleCopyAsSvg, disabled: selectedPathIds.length === 0 },
                { label: t('contextMenu.copyAsPng'), handler: handleCopyAsPng, disabled: selectedPathIds.length === 0 },
            );
        }
        if (canConvertToPath) {
            actions.splice(15, 0, { label: t('contextMenu.convertToPath'), handler: handleConvertToPath, disabled: !canConvertToPath });
        }
        return actions;
    }, [selectedPathIds.length, canGroup, canUngroup, canConvertToPath, styleClipboard, tool, selectionMode, contextMenu, handleCut, handleCopy, handlePaste, handleCopyStyle, handlePasteStyle, handleFlip, handleGroup, handleUngroup, handleBringForward, handleSendBackward, handleBringToFront, handleSendToBack, handleCopyAsSvg, handleCopyAsPng, handleConvertToPath, t]);
    

    const timelineBottomOffset = useMemo(
        () => getTimelinePanelBottomOffset(),
        []
    );

    return (
        <>
            {textEditorOverlay}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                <Toolbar tool={tool} setTool={handleSetTool} isGridVisible={isGridVisible} setIsGridVisible={setIsGridVisible} gridSize={gridSize} setGridSize={setGridSize} gridSubdivisions={gridSubdivisions} setGridSubdivisions={setGridSubdivisions} gridOpacity={gridOpacity} setGridOpacity={setGridOpacity} />
                {groupIsolationPath.length > 0 && <Breadcrumbs path={groupIsolationPath} onJumpTo={handleJumpToGroup} />}
            </div>

            {tool === 'selection' && !croppingState && !textEditing && (
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
                    cropSelectionMode={cropSelectionMode}
                    setCropSelectionMode={setCropSelectionMode}
                    cropBrushSize={cropBrushSize}
                    setCropBrushSize={setCropBrushSize}
                    cropSelectionOperation={cropSelectionOperation}
                    setCropSelectionOperation={setCropSelectionOperation}
                    cropSelectionContours={cropSelectionContours}
                    invertMagicWandSelection={invertMagicWandSelection}
                    applyMagicWandSelection={applyMagicWandSelection}
                    cutMagicWandSelection={cutMagicWandSelection}
                    trimTransparentEdges={trimTransparentEdges}
                    confirmCrop={confirmCrop}
                    cancelCrop={cancelCrop}
                    imageHsvPreview={handleAdjustImageHsv}
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

interface TextEditorOverlayProps {
    path: TextData;
    draft: string;
    isNew: boolean;
    viewTransform: { scale: number; translateX: number; translateY: number };
    onChange: (value: string) => void;
    onCommit: () => void;
}

const TextEditingOverlay: React.FC<TextEditorOverlayProps> = ({
    path,
    draft,
    isNew,
    viewTransform,
    onChange,
    onCommit,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const normalizedDraft = draft.replace(/\r/g, '');
    const baseLineHeight = useMemo(
        () => resolveLineHeight(path.fontSize, path.lineHeight),
        [path.fontSize, path.lineHeight],
    );
    const widthConstraint = useMemo(
        () => (!isNew && path.width > 0 ? path.width : undefined),
        [isNew, path.width],
    );
    const layout = useMemo(
        () => layoutText(
            normalizedDraft,
            path.fontSize,
            path.fontFamily,
            baseLineHeight,
            path.fontWeight,
            widthConstraint,
        ),
        [normalizedDraft, path.fontSize, path.fontFamily, baseLineHeight, path.fontWeight, widthConstraint],
    );

    useEffect(() => {
        const element = textareaRef.current;
        if (!element) {
            return;
        }
        const rafId = requestAnimationFrame(() => {
            element.focus();
            element.select();
        });
        return () => cancelAnimationFrame(rafId);
    }, [path.id]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCommit();
                return;
            }

            const isCommitKey = (event.key === 'Enter' || event.key === 's') && (event.metaKey || event.ctrlKey);
            if (!isCommitKey) {
                return;
            }

            const target = event.target as HTMLElement | null;
            if (target && target.tagName === 'TEXTAREA') {
                return;
            }

            event.preventDefault();
            onCommit();
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onCommit]);

    const draftWidth = !isNew && path.width > 0 ? path.width : layout.width;
    const width = Math.max(draftWidth, layout.width, 1);
    const height = Math.max(path.height, layout.height, 1);
    const leadingTop = layout.leading.top;
    const leadingBottom = layout.leading.bottom;
    const cssHalfLeading = Math.max(layout.lineHeight - path.fontSize, 0) / 2;
    const paddingTop = Math.max(leadingTop - cssHalfLeading, 0);
    const paddingBottom = Math.max(leadingBottom - cssHalfLeading, 0);

    const textareaInlineStyle = useMemo<React.CSSProperties>(() => {
        const style: React.CSSProperties = {
            boxSizing: 'border-box',
            color: path.color,
            fontSize: `${path.fontSize}px`,
            lineHeight: `${layout.lineHeight}px`,
            fontFamily: path.fontFamily,
            fontWeight: path.fontWeight ?? 400,
            textAlign: path.textAlign as React.CSSProperties['textAlign'],
            caretColor: path.color,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
        };

        const formatPx = (value: number) => `${Math.round(value * 1000) / 1000}px`;

        if (paddingTop > 0.0001) {
            style.paddingTop = formatPx(paddingTop);
        }

        if (paddingBottom > 0.0001) {
            style.paddingBottom = formatPx(paddingBottom);
        }

        return style;
    }, [
        path.color,
        path.fontFamily,
        path.fontSize,
        path.fontWeight,
        path.textAlign,
        layout.lineHeight,
        paddingTop,
        paddingBottom,
    ]);

    const transform = useMemo(() => {
        const viewMatrix = {
            a: viewTransform.scale,
            b: 0,
            c: 0,
            d: viewTransform.scale,
            e: viewTransform.translateX,
            f: viewTransform.translateY,
        };
        const translation = createTranslationMatrix(path.x, path.y);
        const shapeMatrix = getShapeTransformMatrix({ ...path, x: 0, y: 0 });
        const localMatrix = multiplyMatrices(translation, shapeMatrix);
        const combined = multiplyMatrices(viewMatrix, localMatrix);
        return matrixToCssString(combined);
    }, [
        viewTransform.scale,
        viewTransform.translateX,
        viewTransform.translateY,
        path.x,
        path.y,
        path.width,
        path.height,
        path.rotation,
        path.scaleX,
        path.scaleY,
        path.skewX,
        path.skewY,
    ]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(event.target.value);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((event.key === 'Enter' || event.key === 's') && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onCommit();
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            onCommit();
        }
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLTextAreaElement>) => {
        event.stopPropagation();
    };

    const handleWheel = (event: React.WheelEvent<HTMLTextAreaElement>) => {
        event.stopPropagation();
    };

    return (
        <div className="absolute inset-0 z-40 pointer-events-none">
            <div
                className="pointer-events-auto"
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width,
                    height,
                    transformOrigin: 'top left',
                    transformBox: 'border-box',
                    transform,
                }}
            >
                <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPointerDown={handlePointerDown}
                    onWheel={handleWheel}
                    spellCheck={false}
                    className="h-full w-full resize-none overflow-hidden border-none bg-transparent p-0 focus:outline-none"
                    style={textareaInlineStyle}
                />
            </div>
        </div>
    );
};
