/**
 * 本文件定义了主菜单组件。
 * 它通常通过一个汉堡图标触发，提供了文件操作（如打开、保存、另存为）、
 * 导入/导出以及清空画布等功能。
 */

import React, { Fragment, useState } from 'react';
import { Popover, Transition, Tab } from '@headlessui/react';
import { ICONS } from '../constants';
import { ColorPicker } from './ColorPicker';
import { StatusBar } from './StatusBar';
import type { AnyPath } from '../types';

// --- 图层面板子组件 ---

const getToolIcon = (tool: AnyPath['tool']) => {
  switch (tool) {
    case 'rectangle': return ICONS.RECTANGLE;
    case 'ellipse': return ICONS.ELLIPSE;
    case 'pen': return ICONS.PEN;
    case 'line': return ICONS.LINE;
    case 'brush': return ICONS.BRUSH;
    case 'polygon': return ICONS.POLYGON;
    case 'arc': return ICONS.ARC;
    case 'image': return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>;
    case 'group': return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="8" y="8" width="12" height="12" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>;
    default: return null;
  }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface LayerItemProps {
  path: AnyPath;
  isSelected: boolean;
  dropTarget: { id: string; position: 'above' | 'below' } | null;
  onClick: (e: React.MouseEvent) => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  draggable?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const LayerItem: React.FC<LayerItemProps> = ({ path, isSelected, dropTarget, onClick, onToggleVisibility, onToggleLock, ...dragHandlers }) => {
  const isVisible = path.isVisible !== false;
  const isLocked = path.isLocked === true;
  const isDropTarget = dropTarget?.id === path.id;

  return (
    <div
      className={`relative rounded-md group ${isDropTarget ? (dropTarget.position === 'above' ? 'border-t-2 border-[var(--accent-primary)]' : 'border-b-2 border-[var(--accent-primary)]') : ''}`}
      {...dragHandlers}
    >
      <div 
        onClick={onClick}
        className={`flex items-center gap-2 p-2 rounded-md transition-colors cursor-pointer ${isSelected ? 'bg-[var(--accent-bg)] ring-1 ring-inset ring-[var(--accent-primary-muted)]' : 'hover:bg-[var(--ui-hover-bg)]'} ${isLocked ? 'opacity-60' : ''}`}
      >
        <div className="flex-shrink-0 w-5 h-5 text-[var(--text-secondary)]">{getToolIcon(path.tool)}</div>
        <span className="flex-grow text-sm truncate">{capitalize(path.tool)}</span>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" title={isLocked ? "解锁" : "锁定"}>
            {isLocked ? ICONS.LOCK_CLOSED : ICONS.LOCK_OPEN}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }} className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-white/10" title={isVisible ? "隐藏" : "显示"}>
            {isVisible ? ICONS.EYE_OPEN : ICONS.EYE_OFF}
          </button>
        </div>
      </div>
    </div>
  );
};


interface LayersPanelProps {
  paths: AnyPath[];
  selectedPathIds: string[];
  setSelectedPathIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  onTogglePathProperty: (pathIds: string[], property: 'isVisible' | 'isLocked') => void;
  onReorderPaths: (draggedId: string, targetId: string, position: 'above' | 'below') => void;
  onDeletePaths: (pathIds: string[]) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ paths, selectedPathIds, setSelectedPathIds, onTogglePathProperty, onReorderPaths, onDeletePaths }) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'above' | 'below' } | null>(null);

  const handleLayerClick = (e: React.MouseEvent, pathId: string) => {
    if (e.shiftKey) {
      setSelectedPathIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(pathId)) newSet.delete(pathId); else newSet.add(pathId);
        return Array.from(newSet);
      });
    } else {
      setSelectedPathIds([pathId]);
    }
  };
  
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };
  
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId === targetId) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const position = e.clientY > rect.top + rect.height / 2 ? 'below' : 'above';
    setDropTarget({ id: targetId, position });
  };
  
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId && dropTarget) {
      onReorderPaths(draggedId, targetId, dropTarget.position);
    }
    setDraggedId(null);
    setDropTarget(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto layers-panel-list pr-1 space-y-1">
        {paths.length === 0 ? (
          <div className="text-center text-sm text-[var(--text-secondary)] py-8">画布为空</div>
        ) : (
          [...paths].reverse().map(path => (
            <LayerItem
              key={path.id}
              path={path}
              isSelected={selectedPathIds.includes(path.id)}
              dropTarget={dropTarget}
              onClick={(e) => handleLayerClick(e, path.id)}
              onToggleVisibility={() => onTogglePathProperty([path.id], 'isVisible')}
              onToggleLock={() => onTogglePathProperty([path.id], 'isLocked')}
              draggable={!path.isLocked}
              onDragStart={(e) => handleDragStart(e, path.id)}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, path.id)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => handleDrop(e, path.id)}
            />
          ))
        )}
      </div>
      {selectedPathIds.length > 0 && (
        <div className="flex-shrink-0 pt-2 mt-2 border-t border-[var(--ui-separator)]">
           <button 
             onClick={() => onDeletePaths(selectedPathIds)} 
             className="w-full flex items-center justify-center gap-2 p-2 rounded-md text-sm text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
           >
             <div className="w-4 h-4">{ICONS.TRASH}</div>
             删除选中
           </button>
        </div>
      )}
    </div>
  );
};


// --- 主菜单组件 ---

interface MainMenuProps {
  onSave: () => Promise<void>;
  onSaveAs: () => Promise<void>;
  onOpen: () => void;
  onImport: () => void;
  onClear: () => void;
  canClear: boolean;
  onExportSvg: () => Promise<void>;
  onExportPng: () => Promise<void>;
  canExport: boolean;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  activeFileName: string | null;
  // StatusBar Props
  zoomLevel: number;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  elementCount: number;
  canvasWidth: number;
  canvasHeight: number;
  isStatusBarCollapsed: boolean;
  onToggleStatusBarCollapse: () => void;
  // LayersPanel Props
  paths: AnyPath[];
  selectedPathIds: string[];
  setSelectedPathIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  onTogglePathProperty: (pathIds: string[], property: 'isVisible' | 'isLocked') => void;
  onReorderPaths: (draggedId: string, targetId: string, position: 'above' | 'below') => void;
  onDeletePaths: (pathIds: string[]) => void;
}

export const MainMenu: React.FC<MainMenuProps> = (props) => { 
  const {
    onSave, onSaveAs, onOpen, onImport, onClear, canClear,
    onExportSvg, onExportPng, canExport,
    backgroundColor, setBackgroundColor,
    activeFileName,
    zoomLevel, onUndo, canUndo, onRedo, canRedo,
    elementCount, canvasWidth, canvasHeight,
    isStatusBarCollapsed, onToggleStatusBarCollapse
  } = props;

  const menuActions = [
    { label: '打开...', handler: onOpen, icon: ICONS.OPEN, disabled: false },
    { label: '保存', handler: onSave, icon: ICONS.SAVE, disabled: false },
    { label: '另存为...', handler: onSaveAs, icon: ICONS.SAVE, disabled: false },
    { label: '导入...', handler: onImport, icon: ICONS.IMPORT, disabled: false },
    { label: '---' },
    { label: '背景', isColorPicker: true }, // Special item for color picker
    { label: '---' },
    { label: '导出为 SVG...', handler: onExportSvg, icon: ICONS.COPY_SVG, disabled: !canExport },
    { label: '导出为 PNG...', handler: onExportPng, icon: ICONS.COPY_PNG, disabled: !canExport },
    { label: '---' },
    { label: '清空画布', handler: onClear, icon: ICONS.CLEAR, isDanger: true, disabled: !canClear },
  ];

  const checkerboardStyle = {
      backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
      backgroundSize: '8px 8px',
  };
  
  const tabs = [
    { name: '菜单', icon: ICONS.MENU },
    { name: '图层', icon: ICONS.LAYERS },
  ];

  return (
    <nav className="w-64 bg-[var(--ui-panel-bg)] border-r border-[var(--ui-panel-border)] flex flex-col h-screen p-3 z-30 flex-shrink-0">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-10 w-10 p-2 rounded-lg flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent-primary)] ring-1 ring-inset ring-[var(--accent-primary-muted)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 5-3-3-6 6 3 3"/><path d="m9 8 3 3"/><path d="M14 4 3 15.25V21h5.75L20 9.75Z"/></svg>
        </div>
        <div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">画板</h1>
            <p className="text-xs text-[var(--text-secondary)] truncate" title={activeFileName ?? '未命名'}>{activeFileName ?? '未命名'}</p>
        </div>
      </div>
      
      <Tab.Group as="div" className="flex flex-col flex-grow min-h-0">
        <Tab.List className="flex-shrink-0 flex space-x-1 rounded-lg bg-[var(--ui-element-bg)] p-1 mb-3">
          {tabs.map(tab => (
            <Tab as={Fragment} key={tab.name}>
              {({ selected }) => (
                <button
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium leading-5 transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 ring-offset-2 ring-offset-[var(--ui-panel-bg)] ring-[var(--accent-primary)] ${
                    selected
                      ? 'bg-[var(--accent-solid-bg)] text-[var(--text-on-accent-solid)] shadow'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
                  }`}
                >
                  <div className="w-4 h-4">{tab.icon}</div>
                  {tab.name}
                </button>
              )}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="flex-grow min-h-0">
          <Tab.Panel className="flex flex-col gap-1 h-full focus:outline-none">
            {menuActions.map((action, index) => {
              if (action.label === '---') {
                return <div key={`sep-${index}`} className="h-px my-2 bg-[var(--ui-separator)]" />;
              }

              if ((action as any).isColorPicker) {
                return (
                  <Popover as="div" className="relative" key="bg-color-picker">
                    <Popover.Button className="w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:outline-none focus-visible:ring-2 ring-[var(--accent-primary)]">
                      <div className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]">{ICONS.BACKGROUND_COLOR}</div>
                      <span className="flex-grow">画布背景...</span>
                      <div 
                        className="w-5 h-5 rounded-sm ring-1 ring-inset ring-white/20"
                        style={{ 
                          backgroundColor: backgroundColor,
                          ...(backgroundColor === 'transparent' && checkerboardStyle)
                        }}
                      />
                    </Popover.Button>
                    <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                      <Popover.Panel 
                        className="absolute top-0 left-full ml-2 z-40"
                        onClickCapture={(e) => e.stopPropagation()}
                      >
                         <ColorPicker color={backgroundColor} onChange={setBackgroundColor} />
                      </Popover.Panel>
                    </Transition>
                  </Popover>
                );
              }

              return (
                <button
                  key={action.label}
                  onClick={() => !(action as any).disabled && (action as any).handler()}
                  disabled={(action as any).disabled}
                  className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    (action as any).isDanger
                      ? 'text-[var(--danger-text)] hover:bg-[var(--danger-bg)] focus:bg-[var(--danger-bg)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:bg-[var(--ui-hover-bg)]'
                  } focus:outline-none focus-visible:ring-2 ring-[var(--accent-primary)]`}
                >
                  <div className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]">{(action as any).icon}</div>
                  <span className="flex-grow">{action.label}</span>
                </button>
              );
            })}
          </Tab.Panel>
          <Tab.Panel className="h-full focus:outline-none">
            <LayersPanel
              paths={props.paths}
              selectedPathIds={props.selectedPathIds}
              setSelectedPathIds={props.setSelectedPathIds}
              onTogglePathProperty={props.onTogglePathProperty}
              onReorderPaths={props.onReorderPaths}
              onDeletePaths={props.onDeletePaths}
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      <div className="mt-auto pt-2 flex-shrink-0">
        <StatusBar 
            zoomLevel={zoomLevel} 
            onUndo={onUndo} 
            canUndo={canUndo} 
            onRedo={onRedo} 
            canRedo={canRedo} 
            elementCount={elementCount}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            isCollapsed={isStatusBarCollapsed}
            onToggleCollapse={onToggleStatusBarCollapse}
        />
      </div>
    </nav>
  );
};