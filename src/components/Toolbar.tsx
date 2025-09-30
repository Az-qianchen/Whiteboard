/**
 * 本文件定义了应用顶部的工具栏组件。
 * 它提供了用于选择绘图工具（如画笔、矩形）以及控制网格可见性和大小的 UI 控件。
 */

import React, { Fragment } from 'react';
import { Popover, Transition, Switch } from '@headlessui/react';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '../constants';
import type { Tool } from '../types';
import { useTranslation } from 'react-i18next';
import { PANEL_CLASSES } from './panelStyles';

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  isGridVisible: boolean;
  setIsGridVisible: (visible: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  gridSubdivisions: number;
  setGridSubdivisions: (subdivisions: number) => void;
  gridOpacity: number;
  setGridOpacity: (opacity: number) => void;
}


/**
 * 应用顶部的工具栏组件。
 * @param {ToolbarProps} props - 组件的 props，包括当前工具、设置工具的函数以及网格相关的状态和设置函数。
 * @returns {React.ReactElement} 渲染后的工具栏。
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  isGridVisible,
  setIsGridVisible,
  gridSize,
  setGridSize,
  gridSubdivisions,
  setGridSubdivisions,
  gridOpacity,
  setGridOpacity,
}) => {
  const { t } = useTranslation();

  const tools: { name: Tool; title: string; icon: JSX.Element }[] = [
    { name: 'selection', title: t('toolSelect'), icon: ICONS.SELECTION },
    { name: 'pen', title: t('toolPen'), icon: ICONS.PEN },
    { name: 'brush', title: t('toolBrush'), icon: ICONS.BRUSH },
    { name: 'polygon', title: t('toolPolygon'), icon: ICONS.POLYGON },
    { name: 'rectangle', title: t('toolRectangle'), icon: ICONS.RECTANGLE },
    { name: 'ellipse', title: t('toolEllipse'), icon: ICONS.ELLIPSE },
    { name: 'line', title: t('toolLine'), icon: ICONS.LINE },
    { name: 'arc', title: t('toolArc'), icon: ICONS.ARC },
    { name: 'frame', title: t('toolFrame'), icon: ICONS.FRAME },
    { name: 'text', title: t('toolText'), icon: ICONS.TEXT },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 text-[var(--text-primary)]">
      {tools.map((t) => (
        <PanelButton
          key={t.name}
          type="button"
          title={t.title}
          onClick={() => setTool(t.name)}
          variant="unstyled"
          className={`flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors ${
            tool === t.name
              ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
          }`}
        >
          {t.icon}
        </PanelButton>
      ))}

      <div className="h-6 w-px bg-[var(--ui-separator)] mx-1" />

      <Popover className="relative">
        <Popover.Button
          as={PanelButton}
          variant="unstyled"
          title={t('gridSettings')}
          className="flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
        >
          {ICONS.GRID}
        </Popover.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Popover.Panel className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-3">
            <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-2 items-center">
              <label htmlFor="grid-toggle" className={`${PANEL_CLASSES.label} text-[var(--text-primary)] justify-self-start`}>{t('showGrid')}</label>
              <div className="justify-self-end">
                <Switch
                  id="grid-toggle"
                  checked={isGridVisible}
                  onChange={setIsGridVisible}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--ui-panel-bg)] border ${isGridVisible ? 'bg-[var(--accent-bg)] border-[var(--accent-primary)]' : 'bg-black/30 border-transparent'}`}
                >
                  <span className={`${isGridVisible ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </Switch>
              </div>

              <label htmlFor="grid-size" className={`${PANEL_CLASSES.label} text-[var(--text-primary)] justify-self-start`}>{t('gridSize')}</label>
              <div className={`${PANEL_CLASSES.inputWrapper} w-20 justify-self-end`}>
                <input
                  id="grid-size"
                  type="number"
                  min="0"
                  max="200"
                  step="5"
                  value={gridSize}
                  onChange={(e) => {
                    const nextValue = Number(e.target.value);
                    if (Number.isNaN(nextValue)) {
                      setGridSize(0);
                      return;
                    }
                    setGridSize(Math.max(0, Math.min(200, nextValue)));
                  }}
                  className={`${PANEL_CLASSES.input} hide-spinners`}
                  disabled={!isGridVisible}
                />
                <span className={PANEL_CLASSES.inputSuffix}>px</span>
              </div>

              <label htmlFor="grid-subdivisions" className={`${PANEL_CLASSES.label} text-[var(--text-primary)] justify-self-start`}>{t('subdivisions')}</label>
              <div className={`${PANEL_CLASSES.inputWrapper} w-20 justify-self-end`}>
                <input
                  id="grid-subdivisions"
                  type="number"
                  min="0"
                  max="10"
                  step="1"
                  value={gridSubdivisions}
                  onChange={(e) => {
                    const nextValue = Number(e.target.value);
                    if (Number.isNaN(nextValue)) {
                      setGridSubdivisions(0);
                      return;
                    }
                    setGridSubdivisions(Math.max(0, Math.min(10, Math.round(nextValue))));
                  }}
                  className={`${PANEL_CLASSES.input} hide-spinners`}
                  disabled={!isGridVisible}
                />
              </div>

              <label htmlFor="grid-opacity" className={`${PANEL_CLASSES.label} text-[var(--text-primary)] justify-self-start`}>{t('opacity')}</label>
              <div className={`${PANEL_CLASSES.inputWrapper} w-20 justify-self-end`}>
                <input
                  id="grid-opacity"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(gridOpacity * 100)}
                  onChange={(e) => setGridOpacity(Math.max(0, Math.min(100, Number(e.target.value))) / 100)}
                  className={`${PANEL_CLASSES.input} hide-spinners`}
                  disabled={!isGridVisible}
                />
                <span className={PANEL_CLASSES.inputSuffix}>%</span>
              </div>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  );
};