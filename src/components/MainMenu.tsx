import React, { Fragment, useState } from 'react';
import { Popover, Transition, Tab } from '@headlessui/react';
import { Paintbrush } from 'lucide-react';
import { ICONS, BUTTON_SIZE } from '@/constants';
import { FloatingColorPicker } from './FloatingColorPicker';
import { StatusBar } from './StatusBar';
import type { PngExportOptions, AnimationExportOptions } from '../types';
import { LayersPanel } from './layers-panel/LayersPanel';
import { FloatingPngExporter } from './FloatingPngExporter';
import { FloatingAnimationExporter } from './FloatingAnimationExporter';

// --- 主菜单组件 ---

interface MainMenuProps {
  onSave: () => Promise<void>;
  onSaveAs: () => Promise<void>;
  onOpen: () => void;
  onImport: () => void;
  onClear: () => void;
  canClear: boolean;
  onClearAllData: () => void;
  canClearAllData: boolean;
  onExportSvg: () => Promise<void>;
  onExportPng: () => Promise<void>;
  onExportAnimation: (options: AnimationExportOptions) => Promise<void>;
  canExport: boolean;
  frameCount: number;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  activeFileName: string | null;
  onResetPreferences: () => void;
  // StatusBar Props
  zoomLevel: number;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  selectionInfo: any;
  elementCount: number;
  canvasWidth: number;
  canvasHeight: number;
  isStatusBarCollapsed: boolean;
  setIsStatusBarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  // PNG Export Options
  pngExportOptions: PngExportOptions;
  setPngExportOptions: (options: PngExportOptions | ((prev: PngExportOptions) => PngExportOptions)) => void;
}

export const MainMenu: React.FC<MainMenuProps> = (props) => { 
  const {
    onSave, onSaveAs, onOpen, onImport, onClear, canClear, onClearAllData, canClearAllData,
    onExportSvg, onExportPng, onExportAnimation, canExport, frameCount,
    backgroundColor, setBackgroundColor,
    activeFileName,
    onResetPreferences,
    zoomLevel, onUndo, canUndo, onRedo, canRedo,
    selectionInfo, elementCount, canvasWidth, canvasHeight,
    isStatusBarCollapsed, setIsStatusBarCollapsed,
    pngExportOptions, setPngExportOptions,
  } = props;

  const legacyMenuActions = [
    { label: '打开...', handler: onOpen, icon: ICONS.OPEN, disabled: false },
    { label: '保存', handler: onSave, icon: ICONS.SAVE, disabled: false },
    { label: '另存为...', handler: onSaveAs, icon: ICONS.SAVE, disabled: false },
    { label: '导入...', handler: onImport, icon: ICONS.IMPORT, disabled: false },
    { label: '---' },
    { label: '背景', isColorPicker: true }, // Special item for color picker
    { label: '---' },
    { label: '导出为 SVG...', handler: onExportSvg, icon: ICONS.COPY_SVG, disabled: !canExport },
    { label: '导出为 PNG...', isPngExporter: true }, // Special item for PNG exporter
    { label: '导出动画...', isAnimationExporter: true },
    { label: '---' },
    { label: '重置偏好设置', handler: onResetPreferences, icon: ICONS.RESET_PREFERENCES, isDanger: false, disabled: false },
    { label: '清空画布', handler: onClear, icon: ICONS.CLEAR, isDanger: true, disabled: !canClear },
  ];

  // New menu items: moved canvas clear to Layers panel; add Clear Data
  const menuActions = [
    { label: '打开…', handler: onOpen, icon: ICONS.OPEN, disabled: false },
    { label: '保存', handler: onSave, icon: ICONS.SAVE, disabled: false },
    { label: '另存为…', handler: onSaveAs, icon: ICONS.SAVE, disabled: false },
    { label: '导入…', handler: onImport, icon: ICONS.IMPORT, disabled: false },
    { label: '---' },
    { label: '背景颜色…', isColorPicker: true },
    { label: '---' },
    { label: '导出为 SVG…', handler: onExportSvg, icon: ICONS.COPY_SVG, disabled: !canExport },
    { label: '导出为 PNG…', isPngExporter: true },
    { label: '导出动画…', isAnimationExporter: true },
    { label: '---' },
    { label: '重置偏好设置', handler: onResetPreferences, icon: ICONS.RESET_PREFERENCES, isDanger: false, disabled: false },
    { label: '清空数据', handler: onClearAllData, icon: ICONS.CLEAR, isDanger: true, disabled: !canClearAllData },
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
    <nav className="w-full h-full bg-[var(--ui-panel-bg)] border-r border-[var(--ui-panel-border)] flex flex-col p-3 z-30">
      <div className="flex items-center gap-2 mb-4">
        <div className={`${BUTTON_SIZE} p-2 rounded-lg flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent-primary)] ring-1 ring-inset ring-[var(--accent-primary-muted)]`}><Paintbrush className="h-[17px] w-[17px]" /></div>
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
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
                  }`}
                >
                  <div className="w-4 h-4 flex items-center justify-center">{tab.icon}</div>
                  {tab.name}
                </button>
              )}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="flex-grow min-h-0 overflow-hidden">
          <Tab.Panel className="flex flex-col gap-1 h-full focus:outline-none overflow-y-auto layers-panel-list pr-1">
            {menuActions.map((action, index) => {
              if (action.label === '---') {
                return <div key={`sep-${index}`} className="border-b border-[var(--ui-separator)] my-2" />;
              }

              if ((action as any).isColorPicker) {
                return (
                  <FloatingColorPicker
                    key="bg-color-picker"
                    color={backgroundColor}
                    onChange={setBackgroundColor}
                    placement="right"
                  >
                    {({ ref, onClick }) => (
                      <button
                        ref={ref}
                        onClick={onClick}
                        className="w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:outline-none focus-visible:ring-2 ring-[var(--accent-primary)]"
                      >
                        <div className="w-4 h-4 flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)]">{ICONS.BACKGROUND_COLOR}</div>
                        <span className="flex-grow">画布背景...</span>
                        <div 
                          className="w-5 h-5 rounded-sm ring-1 ring-inset ring-white/20"
                          style={{ 
                            backgroundColor: backgroundColor,
                            ...(backgroundColor === 'transparent' && checkerboardStyle)
                          }}
                        />
                      </button>
                    )}
                  </FloatingColorPicker>
                );
              }

              if ((action as any).isPngExporter) {
                return (
                  <FloatingPngExporter
                    key="png-exporter"
                    placement="right"
                    pngExportOptions={pngExportOptions}
                    setPngExportOptions={setPngExportOptions}
                    onExportPng={onExportPng}
                    canExport={canExport}
                  >
                    {({ ref, onClick }) => (
                      <button
                        ref={ref}
                        onClick={onClick}
                        disabled={!canExport}
                        className="w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:bg-[var(--ui-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ring-[var(--accent-primary)]"
                      >
                        <div className="w-4 h-4 flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)]">{ICONS.COPY_PNG}</div>
                        <span className="flex-grow">{action.label}</span>
                      </button>
                    )}
                  </FloatingPngExporter>
                );
              }

              if ((action as any).isAnimationExporter) {
                return (
                  <FloatingAnimationExporter
                    key="animation-exporter"
                    placement="right"
                    onExportAnimation={onExportAnimation}
                    canExport={frameCount > 1}
                  >
                    {({ ref, onClick }) => (
                      <button
                        ref={ref}
                        onClick={onClick}
                        disabled={frameCount <= 1}
                        className="w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:bg-[var(--ui-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ring-[var(--accent-primary)]"
                      >
                        <div className="w-4 h-4 flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)]">{ICONS.PLAY}</div>
                        <span className="flex-grow">{action.label}</span>
                      </button>
                    )}
                  </FloatingAnimationExporter>
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
                  <div className="w-4 h-4 flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)]">{(action as any).icon}</div>
                  <span className="flex-grow">{action.label}</span>
                </button>
              );
            })}
          </Tab.Panel>
          <Tab.Panel className="h-full focus:outline-none">
            <LayersPanel />
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
            selectionInfo={selectionInfo}
            elementCount={elementCount}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            isStatusBarCollapsed={isStatusBarCollapsed}
            setIsStatusBarCollapsed={setIsStatusBarCollapsed}
        />
      </div>
    </nav>
  );
};
