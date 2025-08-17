


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

export const Toolbar: React.FC<ToolbarProps> = ({
  tool, setTool,
  isGridVisible, setIsGridVisible,
  gridSize, setGridSize,
}) => {
  const toolButtons = [
    { name: 'selection', title: '选择 (V)', icon: ICONS.EDIT, label: '选择' },
  ];
  const drawingToolButtons = [
    { name: 'brush', title: '画笔 (B)', icon: ICONS.BRUSH, label: '画笔' },
    { name: 'pen', title: '钢笔 (P)', icon: ICONS.PEN, label: '钢笔' },
    { name: 'rectangle', title: '矩形 (R)', icon: ICONS.RECTANGLE, label: '矩形' },
    { name: 'ellipse', title: '椭圆 (O)', icon: ICONS.ELLIPSE, label: '椭圆' },
    { name: 'line', title: '线条 (L)', icon: ICONS.LINE, label: '线条' },
  ];

  return (
    <div className="w-full max-w-5xl bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-3 flex flex-wrap items-end justify-center gap-x-2 gap-y-2 text-[var(--text-primary)]">
      
      {/* 工具选择 */}
      <div className="flex items-end gap-2">
         {toolButtons.map((toolItem) => (
            <div key={toolItem.name} className="flex flex-col items-center gap-1 w-14">
              <button
                type="button"
                title={toolItem.title}
                onClick={() => setTool(toolItem.name as Tool)}
                className={`p-2 rounded-lg flex items-center justify-center w-9 h-9 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 ${
                  tool === toolItem.name
                    ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]'
                }`}
              >
                {toolItem.icon}
              </button>
              <span className="text-xs font-medium text-[var(--text-secondary)]">{toolItem.label}</span>
            </div>
         ))}
      </div>

      <div className="flex items-end gap-2">
        <RadioGroup value={tool} onChange={setTool} className="flex items-end gap-2">
          {drawingToolButtons.map((toolItem) => (
            <div key={toolItem.name} className="flex flex-col items-center gap-1 w-14">
              <RadioGroup.Option
                value={toolItem.name}
                as="button"
                title={toolItem.title}
                className={({ checked }) => `p-2 rounded-lg flex items-center justify-center w-9 h-9 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 ${
                  checked
                    ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]'
                }`}
              >
                {toolItem.icon}
              </RadioGroup.Option>
               <RadioGroup.Label as="span" className="text-xs font-medium text-[var(--text-secondary)]">{toolItem.label}</RadioGroup.Label>
            </div>
          ))}
        </RadioGroup>
      </div>


      <Separator />

      <div className="flex items-end gap-2 text-center">
        {/* Grid Control */}
        <div className="flex flex-col items-center gap-1 w-14">
          <Popover className="relative">
            <Popover.Button className={`p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors ring-1 ring-inset ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${isGridVisible ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]'}`} title="网格与吸附 (G)">
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
                      className={`${isGridVisible ? 'bg-[var(--accent-primary)]' : 'bg-black/30'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--ui-panel-bg)]`}
                    >
                      <span className={`${isGridVisible ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </Switch>
                  </div>
                  <div className={`grid grid-cols-2 items-center gap-2 transition-opacity ${!isGridVisible ? 'opacity-50' : ''}`}>
                    <label htmlFor="grid-size-input" className="text-sm font-medium text-[var(--text-primary)]">网格大小</label>
                    <div className="flex items-center bg-black/20 rounded-md h-8 px-2">
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
          <span className="text-xs font-medium text-[var(--text-secondary)]">网格</span>
        </div>
      </div>
    </div>
  );
};

// --- 子组件 ---

const Separator = () => <div className="h-10 w-px bg-[var(--separator)] hidden sm:block self-end mb-4"></div>;
