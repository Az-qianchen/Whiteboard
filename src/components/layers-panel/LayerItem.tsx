/**
 * 本文件定义了图层面板中单个图层条目的展示组件。
 * 它负责渲染图层名称、图标和操作按钮，并处理用户交互。
 */
import React, { useState, useRef, useEffect } from 'react';
import type { AnyPath, GroupData } from '@/types';
import { ICONS } from '@/constants';
import { useLayers } from '@/lib/layers-context';
import { getToolIcon, capitalize, withLayerIconSize } from './constants';
import PanelButton from '@/components/PanelButton';
import { useTranslation } from 'react-i18next';

interface LayerItemProps {
  path: AnyPath;
  level: number;
  isSelected: boolean;
  dropTarget: { id: string; position: 'above' | 'below' | 'inside' } | null;
  groupColorIndex?: number;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onLayerClick: (path: AnyPath, event: React.MouseEvent) => void;
}

export const LayerItem: React.FC<LayerItemProps> = ({
  path,
  level,
  isSelected,
  dropTarget,
  groupColorIndex,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
  onLayerClick,
}) => {
  const {
    togglePathsProperty,
    handleDeletePaths,
    toggleGroupCollapse,
    setPathName,
  } = useLayers();
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(path.name ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const isVisible = path.isVisible !== false;
  const isLocked = path.isLocked === true;
  const isDropTarget = dropTarget?.id === path.id;

  const handleNameCommit = () => {
    setPathName(path.id, nameInput || capitalize(path.tool));
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const style: React.CSSProperties = {
    paddingLeft: `${8 + level * 16}px`,
  };
  let bgClass: string;

  if (isSelected) {
    bgClass = 'bg-[var(--accent-bg)] ring-1 ring-inset ring-[var(--accent-primary-muted)]';
  } else if (groupColorIndex !== undefined) {
    const colorIndex = (groupColorIndex % 5) + 1; // CSS variables are 1-based
    (style as any)['--layer-item-bg'] = `var(--ui-group-layer-bg-${colorIndex})`;
    bgClass = 'bg-[var(--layer-item-bg)] hover:bg-[var(--ui-hover-bg)]';
  } else {
    bgClass = 'hover:bg-[var(--ui-hover-bg)]';
  }

  return (
    <div
      className="relative"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isDropTarget && dropTarget.position !== 'inside' && (
        <div
          className="absolute right-0 h-px bg-[var(--accent-primary)] z-10 pointer-events-none"
          style={{
            top: dropTarget.position === 'above' ? '-2px' : 'auto',
            bottom: dropTarget.position === 'below' ? '-2px' : 'auto',
            left: `${8 + level * 16}px`
          }}
        />
      )}
      <div
        onClick={isEditing ? undefined : (event) => onLayerClick(path, event)}
        style={style}
        className={`group flex h-7 items-center gap-2 pr-2 rounded-md transition-colors cursor-grab select-none ${bgClass} ${isLocked ? 'opacity-60' : ''} ${isDropTarget && dropTarget.position === 'inside' ? 'ring-2 ring-inset ring-[var(--accent-primary)]' : ''}`}
        draggable={!isLocked && !isEditing}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={t('layerItem.tooltipSelectDrag')}
      >
        <div
          className="flex items-center gap-2 flex-grow min-w-0"
        >
          <div className="flex items-center gap-1 flex-shrink-0">
            {path.tool === 'group' && (
              <PanelButton
                variant="unstyled"
                onClick={(e) => { e.stopPropagation(); toggleGroupCollapse(path.id); }}
                className={`p-0.5 rounded-sm text-[var(--text-secondary)] hover:bg-white/10 ${isEditing ? 'invisible' : ''}`}
                title={(path as GroupData).isCollapsed ? t('layerItem.expand') : t('layerItem.collapse')}
                disabled={isEditing}
              >
                <div className={`transition-transform duration-300 ease-in-out ${(path as GroupData).isCollapsed ? '-rotate-90' : ''}`}>
                  {withLayerIconSize(ICONS.CHEVRON_DOWN)}
                </div>
              </PanelButton>
            )}
            <div className="w-4 h-4 text-[var(--text-secondary)]">{getToolIcon(path.tool, path)}</div>
          </div>
          
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={handleNameCommit}
              onKeyDown={e => { if (e.key === 'Enter') handleNameCommit(); if (e.key === 'Escape') setIsEditing(false); }}
              className="flex-grow text-xs truncate bg-transparent ring-1 ring-[var(--accent-primary)] rounded-sm px-1 min-w-0"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="flex-grow text-sm truncate min-w-0" title={path.name || capitalize(path.tool)}>
              {path.name || capitalize(path.tool)}
            </span>
          )}
        </div>

        <div className={`flex items-center gap-2 flex-shrink-0 ${isEditing ? 'invisible' : ''}`}>
          <PanelButton
            variant="unstyled"
            onClick={(e) => { e.stopPropagation(); togglePathsProperty([path.id], 'isLocked'); }}
            className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-white/10 transition-colors"
            title={isLocked ? t('layerItem.unlock') : t('layerItem.lock')}
          >
            {isLocked ? withLayerIconSize(ICONS.LOCK_CLOSED) : withLayerIconSize(ICONS.LOCK_OPEN)}
          </PanelButton>
          <PanelButton
            variant="unstyled"
            onClick={(e) => { e.stopPropagation(); togglePathsProperty([path.id], 'isVisible'); }}
            className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-white/10 transition-colors"
            title={isVisible ? t('layerItem.hide') : t('layerItem.show')}
          >
            {isVisible ? withLayerIconSize(ICONS.EYE_OPEN) : withLayerIconSize(ICONS.EYE_OFF)}
          </PanelButton>
          <PanelButton
            variant="unstyled"
            onClick={(e) => { e.stopPropagation(); handleDeletePaths([path.id]); }}
            className="p-1 rounded-md text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors"
            title={t('layerItem.delete')}
          >
            {withLayerIconSize(ICONS.TRASH)}
          </PanelButton>
        </div>
      </div>
    </div>
  );
};