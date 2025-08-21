/**
 * 本文件定义了应用顶部的工具栏组件。
 * 它提供了用于选择绘图工具（如画笔、矩形）以及控制网格可见性和大小的 UI 控件。
 */

import React, { Fragment } from 'react';
import { Popover, Transition, RadioGroup, Switch } from '@headlessui/react';
import { ICONS } from '../constants';
import type { Tool } from '../types';

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  isGridVisible: boolean;
  setIsGridVisible: (visible: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
}

const ALL_TOOL_BUTTONS = [
  { name: 'selection', title: '选择 (V)', icon: ICONS.EDIT },
  { name: 'brush', title: '画笔 (B)', icon: ICONS.BRUSH },
  { name: 'pen', title: '钢笔 (P)', icon: ICONS.PEN },
  { name: 'polygon', title: '多边形', icon: ICONS.POLYGON },
  { name: 'rectangle', title: '矩形 (R)', icon: ICONS.RECTANGLE },
  { name: 'ellipse', title: '椭圆 (O)', icon: ICONS.ELLIPSE },
  { name: 'arc', title: '圆弧 (A)', icon: ICONS.ARC },
  { name: 'line', title: '线条 (L)', icon: ICONS.LINE },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool, setTool,
  isGridVisible, setIsGridVisible,
  gridSize, setGridSize,
}) => {

  return (
    <RadioGroup
      value={tool}
      onChange={setTool}
      className="w-full max-w-5xl bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl px-2 py-2 flex items-center justify-center gap-x-1 text-[var(--text-primary)]"
    >
      
      {ALL_TOOL_BUTTONS.map((toolItem) => (
        <RadioGroup.Option
          key={toolItem.name}
          value={toolItem.name as Tool}
          as="button"
          title={toolItem.title}
          className={({ checked }) => `p-2 rounded-lg flex items-center justify-center w-9 h-9 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 ${
            checked
              ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
          }`}
        >
          {toolItem.icon}
        </RadioGroup.Option>
      ))}
      
      <Separator />

      <Popover className="relative">
        <Popover.Button className={`p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors ring-1 ring-inset ring-[var(--ui-subtle-ring)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${isGridVisible ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`} title="网格与吸附 (G)">
          {ICONS.GRID}
        </Popover.Button>
        <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
          <Popover.Panel className="absolute top-full mt-2 right-0 w-60 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="grid-switch" className="text-sm font-medium text-[var(--text-primary)]">显示/吸附网格</label>
                <Switch
                  id="grid-switch"
                  checked={isGridVisible}
                  onChange={setIsGridVisible}
                  className={`${isGridVisible ? 'bg-[var(--accent-primary)]' : 'bg-[var(--ui-element-bg-inactive)]'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--ui-popover-bg)]`}
                >
                  <span className={`${isGridVisible ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </Switch>
              </div>
              <div className={`grid grid-cols-2 items-center gap-2 transition-opacity ${!isGridVisible ? 'opacity-50' : ''}`}>
                <label htmlFor="grid-size-input" className="text-sm font-medium text-[var(--text-primary)]">网格大小</label>
                <div className="flex items-center bg-[var(--ui-element-bg)] rounded-md h-8 px-2">
                  <input
                    id="grid-size-input"
                    type="number"
                    min="5" max="100" step="1"
                    value={gridSize}
                    onChange={(e) => setGridSize(Math.max(5, Number(e.target.value)))}
                    className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] hide-spinners"
                    disabled={!isGridVisible}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">px</span>
                </div>
              </div>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
    </RadioGroup>
  );
};

// --- 子组件 ---

const Separator = () => <div className="h-8 w-px bg-[var(--ui-separator)] hidden sm:block mx-1"></div>;