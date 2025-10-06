/** 主菜单组件，包含基本操作面板 */
import React, { Fragment } from 'react';
import { Popover, Transition, Tab } from '@headlessui/react';
import { Paintbrush } from 'lucide-react';
import { ICONS } from '../constants';
import PanelButton from '@/components/PanelButton';
import { FloatingColorPicker } from './FloatingColorPicker';
import { StatusBar } from './StatusBar';
import type { PngExportOptions, AnimationExportOptions } from '../types';
import { LayersPanel } from './layers-panel/LayersPanel';
import { FloatingPngExporter } from './FloatingPngExporter';
import { FloatingAnimationExporter } from './FloatingAnimationExporter';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from 'react-i18next';
import { FilesPanel } from './files-panel/FilesPanel';
import { useAppContext } from '@/context/AppContext';

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
  hasUnsavedChanges: boolean;
  isDocumentUncreated: boolean;
  onResetPreferences: () => void;
  // StatusBar Props
  zoomLevel: number;
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

/** 主菜单组件入口 */
export const MainMenu: React.FC<MainMenuProps> = (props) => {
  const {
    onSave, onSaveAs, onOpen, onImport, onClear, canClear, onClearAllData, canClearAllData,
    onExportSvg, onExportPng, onExportAnimation, canExport, frameCount,
    backgroundColor, setBackgroundColor,
    hasUnsavedChanges, isDocumentUncreated,
    onResetPreferences,
    zoomLevel,
    selectionInfo, elementCount, canvasWidth, canvasHeight,
    isStatusBarCollapsed, setIsStatusBarCollapsed,
    pngExportOptions, setPngExportOptions,
  } = props;

  const { t } = useTranslation();
  const { directoryHandle } = useAppContext();
  const menuTitle = directoryHandle?.name ?? t('appTitle');

  type MenuAction = {
    label?: string;
    handler?: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    isColorPicker?: boolean;
    isPngExporter?: boolean;
    isAnimationExporter?: boolean;
    isLanguageSelector?: boolean;
    isDanger?: boolean;
    status?: { label: string; tone: 'warning' | 'success' | 'inactive' };
  };

  // New menu items: moved canvas clear to Layers panel; add Clear Data
  const saveStatus = isDocumentUncreated
    ? { label: t('documentStatusUncreated'), tone: 'inactive' as const }
    : hasUnsavedChanges
      ? { label: t('documentStatusUnsaved'), tone: 'warning' as const }
      : { label: t('documentStatusSaved'), tone: 'success' as const };

  const menuActions: MenuAction[] = [
    { label: t('open'), handler: onOpen, icon: ICONS.OPEN, disabled: false },
    {
      label: t('save'),
      handler: onSave,
      icon: ICONS.SAVE,
      disabled: false,
      status: saveStatus,
    },
    { label: t('saveAs'), handler: onSaveAs, icon: ICONS.SAVE, disabled: false },
    { label: t('import'), handler: onImport, icon: ICONS.IMPORT, disabled: false },
    { label: '---' },
    { label: t('backgroundColor'), isColorPicker: true },
    { label: '---' },
    { label: t('exportSvg'), handler: onExportSvg, icon: ICONS.COPY_SVG, disabled: !canExport },
    { label: t('exportPng'), isPngExporter: true },
    { label: t('exportAnimation'), isAnimationExporter: true },
    { label: '---' },
    { isLanguageSelector: true },
    { label: '---' },
    { label: t('resetPreferences'), handler: onResetPreferences, icon: ICONS.RESET_PREFERENCES, isDanger: false, disabled: false },
    { label: t('clearData'), handler: onClearAllData, icon: ICONS.CLEAR, isDanger: true, disabled: !canClearAllData },
  ];

  const checkerboardStyle = {
      backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
      backgroundSize: '8px 8px',
  };
  
  const tabs = [
    { name: t('menu'), icon: ICONS.MENU },
    { name: t('layers'), icon: ICONS.LAYERS },
    { name: t('files'), icon: ICONS.OPEN },
  ];

  return (
    <nav className="w-full h-full bg-[var(--ui-panel-bg)] border-r border-[var(--ui-panel-border)] flex flex-col p-3 z-30">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-10 w-10 p-2 rounded-lg flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent-primary)] ring-1 ring-inset ring-[var(--accent-primary-muted)]"><Paintbrush className="h-6 w-6" /></div>
        <div>
          <h1 className="text-base font-bold text-[var(--text-primary)]" title={menuTitle}>
            {menuTitle}
          </h1>
        </div>
      </div>
      
      <Tab.Group as="div" className="flex flex-col flex-grow min-h-0">
        <Tab.List className="flex-shrink-0 flex space-x-1 rounded-lg bg-[var(--ui-element-bg)] p-1 mb-3">
          {tabs.map(tab => (
            <Tab as={Fragment} key={tab.name}>
              {({ selected }) => (
                <PanelButton
                  variant="unstyled"
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium leading-5 transition-colors duration-150 ease-in-out ring-offset-2 ring-offset-[var(--ui-panel-bg)] ring-[var(--accent-primary)] ${
                    selected
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
                  }`}
                >
                  <div className="w-4 h-4 flex items-center justify-center">{tab.icon}</div>
                  {tab.name}
                </PanelButton>
              )}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="flex-grow min-h-0 overflow-hidden">
          <Tab.Panel className="flex flex-col gap-1 h-full focus:outline-none overflow-y-auto layers-panel-list">
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
                      <PanelButton
                        variant="unstyled"
                        ref={ref as any}
                        onClick={onClick}
                        className="w-full h-7 flex items-center gap-2 px-2 rounded-md text-left text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus-visible:ring-2 ring-[var(--accent-primary)]"
                      >
                        <div className="w-4 h-4 flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)]">{ICONS.BACKGROUND_COLOR}</div>
                        <span className="flex-grow">{t('canvasBackground')}</span>
                        <div
                          className="w-5 h-5 rounded-sm ring-1 ring-inset ring-white/20"
                          style={{
                            backgroundColor: backgroundColor,
                            ...(backgroundColor === 'transparent' && checkerboardStyle)
                          }}
                        />
                      </PanelButton>
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
                      <PanelButton
                        variant="unstyled"
                        ref={ref as any}
                        onClick={onClick}
                        disabled={!canExport}
                        className="w-full h-7 flex items-center gap-2 px-2 rounded-md text-left text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:bg-[var(--ui-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 ring-[var(--accent-primary)]"
                      >
                        <div className="w-4 h-4 flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)]">{ICONS.COPY_PNG}</div>
                        <span className="flex-grow">{action.label}</span>
                      </PanelButton>
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
                          className="w-full h-7 flex items-center gap-2 px-2 rounded-md text-left text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:bg-[var(--ui-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ring-[var(--accent-primary)]"
                        >
                          <div className="w-4 h-4 flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)]">{ICONS.PLAY}</div>
                          <span className="flex-grow">{action.label}</span>
                        </button>
                      )}
                    </FloatingAnimationExporter>
                  );
                }

                  if ((action as any).isLanguageSelector) {
                    return <LanguageSelector key="language-selector" />;
                  }

              const isDisabled = Boolean(action.disabled);
              const statusTone = action.status?.tone;
              const statusTextClass = statusTone === 'warning'
                ? 'text-[var(--danger-text)]'
                : statusTone === 'success'
                  ? 'text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)]';
              const statusDotClass = statusTone === 'warning'
                ? 'bg-[var(--danger-text)]'
                : statusTone === 'success'
                  ? 'bg-[var(--accent-primary)]'
                  : 'bg-[var(--text-secondary)]';
            return (
              <PanelButton
                variant="unstyled"
                key={action.label}
                onClick={() => {
                  if (!isDisabled && action.handler) {
                    action.handler();
                  }
                }}
                disabled={isDisabled}
                className={`w-full h-7 flex items-center gap-2 px-2 rounded-md text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  action.isDanger
                    ? 'text-[var(--danger-text)] hover:bg-[var(--danger-bg)] focus:bg-[var(--danger-bg)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:bg-[var(--ui-hover-bg)]'
                } focus-visible:ring-2 ring-[var(--accent-primary)]`}
              >
                <div className="w-4 h-4 flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)]">{action.icon}</div>
                <span className="flex-grow">{action.label}</span>
                  {action.status && (
                    <span
                      className={`flex items-center gap-1 text-xs font-medium ${statusTextClass}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`}
                      />
                      {action.status.label}
                    </span>
                  )}
              </PanelButton>
              );
            })}
          </Tab.Panel>
          <Tab.Panel className="h-full focus:outline-none">
            <LayersPanel />
          </Tab.Panel>
          <Tab.Panel className="h-full focus:outline-none overflow-hidden">
            <FilesPanel />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      <div className="mt-auto pt-2 flex-shrink-0">
        <StatusBar
            zoomLevel={zoomLevel}
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

