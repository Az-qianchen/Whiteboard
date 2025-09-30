/**
 * 本文件定义了图层面板的容器组件。
 * 它负责管理图层列表的整体状态，如拖放操作，
 * 并使用 Context 获取和操作图层数据。
 */
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { AnyPath, GroupData } from '@/types';
import { ICONS } from '@/constants';
import { useLayers } from '@/lib/layers-context';
import { useAppContext } from '@/context/AppContext';
import { LayerItem } from './LayerItem';
import PanelButton from '@/components/PanelButton';
import { withLayerIconSize } from './constants';
import { findPathById } from '@/lib/pathTree';

export const LayersPanel: React.FC = () => {
  const { paths, selectedPathIds, reorderPaths, handleDeletePaths, setPaths, setSelectedPathIds } = useLayers();
  const { showConfirmation } = useAppContext();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'above' | 'below' | 'inside' } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedPathIds.length === 0) {
      lastSelectedIdRef.current = null;
    }
  }, [selectedPathIds.length]);

  const flattenedLayers = useMemo(() => {
    const result: { path: AnyPath; level: number; groupColorIndex?: number }[] = [];

    const traverse = (layers: AnyPath[], level: number, parentColorIndex?: number) => {
      let groupSiblingIndex = 0;

      [...layers].reverse().forEach(path => {
        let currentColorIndex: number | undefined;

        if (path.tool === 'group') {
          currentColorIndex = ((parentColorIndex ?? -1) + groupSiblingIndex + 1) % 5;
          groupSiblingIndex++;
        } else {
          currentColorIndex = parentColorIndex;
        }

        result.push({ path, level, groupColorIndex: currentColorIndex });

        if (path.tool === 'group' && !(path as GroupData).isCollapsed && (path as GroupData).children.length > 0) {
          traverse((path as GroupData).children, level + 1, currentColorIndex);
        }
      });
    };

    traverse(paths, 0);
    return result;
  }, [paths]);

  const visiblePathIds = useMemo(() => flattenedLayers.map(item => item.path.id), [flattenedLayers]);

  const handleLayerClick = useCallback((path: AnyPath, event: React.MouseEvent) => {
    if (event.shiftKey) {
      const anchorId = lastSelectedIdRef.current ?? selectedPathIds[selectedPathIds.length - 1] ?? path.id;
      const anchorIndex = visiblePathIds.indexOf(anchorId);
      const targetIndex = visiblePathIds.indexOf(path.id);

      if (anchorIndex !== -1 && targetIndex !== -1) {
        const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        const rangeIds = visiblePathIds.slice(start, end + 1);
        setSelectedPathIds(rangeIds);
      } else {
        setSelectedPathIds([path.id]);
      }

      lastSelectedIdRef.current = path.id;
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      setSelectedPathIds(prev => {
        if (prev.includes(path.id)) {
          return prev.filter(id => id !== path.id);
        }
        return [...prev, path.id];
      });
      lastSelectedIdRef.current = path.id;
      return;
    }

    setSelectedPathIds([path.id]);
    lastSelectedIdRef.current = path.id;
  }, [selectedPathIds, setSelectedPathIds, visiblePathIds]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    setDraggedId(id);
  };

  const handleItemDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || draggedId === targetId) return;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const targetPath = findPathById(paths, targetId);
    
    let position: 'above' | 'below' | 'inside';
    const threshold = height * 0.4;

    if (y < threshold) {
        position = 'above';
    } else if (y > height - threshold) {
        position = 'below';
    } else if (targetPath?.tool === 'group' && !(targetPath as GroupData).isCollapsed) {
        position = 'inside';
    } else {
        position = y < height / 2 ? 'above' : 'below';
    }
    
    if (!dropTarget || dropTarget.id !== targetId || dropTarget.position !== position) {
      setDropTarget({ id: targetId, position });
    }
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId || !listRef.current) return;

    const reversedPaths = [...paths].reverse();
    if (reversedPaths.length === 0) {
        setDropTarget(null);
        return;
    }

    const listEl = listRef.current;
    const y = e.clientY;

    const firstChildEl = listEl.firstElementChild as HTMLElement;
    const lastChildEl = listEl.lastElementChild as HTMLElement;

    if (!firstChildEl || !lastChildEl) {
        setDropTarget(null);
        return;
    }

    const firstChildRect = firstChildEl.getBoundingClientRect();
    const lastChildRect = lastChildEl.getBoundingClientRect();

    if (y < firstChildRect.top) {
        const firstItemId = reversedPaths[0]?.id;
        if (firstItemId && draggedId !== firstItemId) {
            setDropTarget({ id: firstItemId, position: 'above' });
        }
    } else if (y > lastChildRect.bottom) {
        // The last item in the DOM corresponds to the first item in the original `paths` array.
        const lastItemId = paths[0]?.id;
        if (lastItemId && draggedId !== lastItemId) {
            setDropTarget({ id: lastItemId, position: 'below' });
        }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && dropTarget && draggedId !== dropTarget.id) {
      reorderPaths(draggedId, dropTarget.id, dropTarget.position);
    }
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={listRef}
        className="flex flex-col flex-grow overflow-y-auto layers-panel-list gap-1"
        onDragOver={handleContainerDragOver}
        onDrop={handleDrop}
      >
        {flattenedLayers.length === 0 ? (
          <div className="text-center text-sm text-[var(--text-secondary)] py-8">画布为空</div>
        ) : (
          flattenedLayers.map(({ path, level, groupColorIndex }) => (
            <LayerItem
              key={path.id}
              path={path}
              level={level}
              isSelected={selectedPathIds.includes(path.id)}
              dropTarget={dropTarget}
              groupColorIndex={groupColorIndex}
              onDragStart={(e) => handleDragStart(e, path.id)}
              onDragOver={(e) => handleItemDragOver(e, path.id)}
              onDragEnter={(e) => handleItemDragOver(e, path.id)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onLayerClick={handleLayerClick}
            />
          ))
        )}
      </div>
      {(paths.length > 0 || selectedPathIds.length > 0) && (
        <div
          className={`flex-shrink-0 pt-2 flex gap-2 ${
            selectedPathIds.length > 0 ? 'mt-2 border-t border-[var(--ui-separator)]' : ''
          }`}
        >
          {paths.length > 0 && (
            <PanelButton
              variant="unstyled"
              onClick={() =>
                showConfirmation(
                  '清空画布',
                  '确定要清空当前画布吗？此操作无法撤销。',
                  () => { setPaths([]); setSelectedPathIds([]); },
                  '清空'
                )
              }
              className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md text-sm text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
            >
              <div className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]">{withLayerIconSize(ICONS.CLEAR)}</div>
              清空画布
            </PanelButton>
          )}
          {selectedPathIds.length > 0 && (
            <PanelButton
              variant="unstyled"
              onClick={() => handleDeletePaths(selectedPathIds)}
              className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md text-sm text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)]"
            >
              <div className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]">{withLayerIconSize(ICONS.TRASH)}</div>
              删除选中
            </PanelButton>
          )}
        </div>
      )}
    </div>
  );
};

