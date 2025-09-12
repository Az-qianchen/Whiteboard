/**
 * 本文件定义了当有图形被选中时出现的选择工具栏。
 * 它允许用户在“移动/变换”模式和“编辑锚点”模式之间切换。
 */

import React, { Fragment, useState } from 'react';
import { Popover, Transition, RadioGroup } from '@headlessui/react';
import { ICONS } from '../constants';
import type { SelectionMode, Alignment, DistributeMode } from '../types';
import { Slider } from './side-toolbar';
import { TraceImagePopover } from './TraceImagePopover';
import type { TraceOptions } from '../types';

type BooleanOperation = 'unite' | 'subtract' | 'intersect' | 'exclude';

interface SelectionToolbarProps {
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  isSimplifiable: boolean;
  beginSimplify: () => void;
  setSimplify: (tolerance: number) => void;
  endSimplify: () => void;
  selectedPathIds: string[];
  onAlign: (alignment: Alignment) => void;
  onDistribute: (axis: 'horizontal' | 'vertical', options: { spacing: number | null; mode: DistributeMode }) => void;
  onBooleanOperation: (operation: BooleanOperation) => void;
  onMask: () => void;
  isTraceable: boolean;
  onTraceImage: (options: TraceOptions) => void;
  canRemoveBackground: boolean;
  onRemoveBackground: () => void;
}

const MODES = [
  { name: 'move', title: '移动/变换 (M)', icon: ICONS.MOVE },
  { name: 'edit', title: '编辑锚点 (V)', icon: ICONS.EDIT },
  { name: 'lasso', title: '套索选择', icon: ICONS.LASSO },
];

const ALIGN_BUTTONS = [
  { name: 'left', title: '左对齐', icon: ICONS.ALIGN_LEFT },
  { name: 'h-center', title: '水平居中', icon: ICONS.ALIGN_HORIZONTAL_CENTER },
  { name: 'right', title: '右对齐', icon: ICONS.ALIGN_RIGHT },
  { name: 'top', title: '顶端对齐', icon: ICONS.ALIGN_TOP },
  { name: 'v-center', title: '垂直居中', icon: ICONS.ALIGN_VERTICAL_CENTER },
  { name: 'bottom', title: '底端对齐', icon: ICONS.ALIGN_BOTTOM },
];

const BOOLEAN_BUTTONS: { name: BooleanOperation, title: string, icon: JSX.Element }[] = [
    { name: 'unite', title: '并集', icon: ICONS.BOOLEAN_UNION },
    { name: 'subtract', title: '减去', icon: ICONS.BOOLEAN_SUBTRACT },
    { name: 'intersect', title: '相交', icon: ICONS.BOOLEAN_INTERSECT },
    { name: 'exclude', title: '排除', icon: ICONS.BOOLEAN_EXCLUDE },
];

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ 
  selectionMode, 
  setSelectionMode,
  isSimplifiable,
  beginSimplify,
  setSimplify,
  endSimplify,
  selectedPathIds,
  onAlign,
  onDistribute,
  onBooleanOperation,
  onMask,
  isTraceable,
  onTraceImage,
  canRemoveBackground,
  onRemoveBackground,
}) => {
  const [simplifyValue, setSimplifyValue] = useState(0);
  const [distributeMode, setDistributeMode] = useState<DistributeMode>('edges');
  const [distributeSpacing, setDistributeSpacing] = useState<string>('');

  const handleSimplifyStart = () => {
    beginSimplify();
  };
  const handleSimplifyChange = (newValue: number) => {
    setSimplifyValue(newValue);
    setSimplify(newValue);
  };
  const handleSimplifyEnd = () => {
    endSimplify();
    setSimplifyValue(0);
  };

  const handleDistribute = (axis: 'horizontal' | 'vertical') => {
    const spacing = distributeSpacing.trim() === '' ? null : Number(distributeSpacing);
    onDistribute(axis, { spacing, mode: distributeMode });
  };
  
  const canAlignOrDistribute = selectedPathIds.length >= 2;
  const canPerformBooleanOrMask = selectedPathIds.length >= 2;

  return (
    <div className="flex items-center gap-2 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 text-[var(--text-primary)]">
      {MODES.map((mode) => (
        <button
          key={mode.name}
          type="button"
          title={mode.title}
          onClick={() => setSelectionMode(mode.name as SelectionMode)}
          className={`p-2 rounded-lg flex items-center justify-center w-10 h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 ${
            selectionMode === mode.name
              ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
          }`}
        >
          {mode.icon}
        </button>
      ))}

      {isSimplifiable && (
          <Popover className="relative">
            <Popover.Button
              title="简化路径"
              className="p-2 rounded-lg flex items-center justify-center w-10 h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
            >
              {ICONS.SIMPLIFY_PATH}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
              <Popover.Panel className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-60 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-4">
                <Slider 
                  label="简化"
                  value={simplifyValue}
                  setValue={handleSimplifyChange}
                  min={0} max={50} step={1}
                  onInteractionStart={handleSimplifyStart}
                  onInteractionEnd={handleSimplifyEnd}
                />
              </Popover.Panel>
            </Transition>
          </Popover>
      )}

      {isTraceable && <TraceImagePopover onTrace={onTraceImage} />}
      {canRemoveBackground && (
        <button
          onClick={onRemoveBackground}
          title="抠图"
          className="p-2 rounded-lg flex items-center justify-center w-10 h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
        >
          {ICONS.REMOVE_BG}
        </button>
      )}

      {canAlignOrDistribute && (
          <Popover className="relative">
             <Popover.Button
                  title="对齐与分布"
                  className="p-2 rounded-lg flex items-center justify-center w-10 h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                >
                  {ICONS.ALIGN_DISTRIBUTE}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                <Popover.Panel className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-[var(--text-primary)]">对齐</label>
                      <div className="grid grid-cols-6 gap-1 mt-2">
                        {ALIGN_BUTTONS.map(btn => (
                           <button key={btn.name} onClick={() => onAlign(btn.name as Alignment)} title={btn.title} disabled={!canAlignOrDistribute} className="p-2 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed">{btn.icon}</button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="h-px bg-[var(--ui-separator)]" />

                    <div>
                      <label className="text-sm font-semibold text-[var(--text-primary)]">分布</label>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => handleDistribute('horizontal')} disabled={!canAlignOrDistribute} className="flex-1 flex items-center justify-center gap-2 h-9 rounded-md bg-[var(--ui-element-bg)] hover:bg-[var(--ui-element-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-sm">{ICONS.DISTRIBUTE_HORIZONTAL} 水平</button>
                        <button onClick={() => handleDistribute('vertical')} disabled={!canAlignOrDistribute} className="flex-1 flex items-center justify-center gap-2 h-9 rounded-md bg-[var(--ui-element-bg)] hover:bg-[var(--ui-element-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-sm">{ICONS.DISTRIBUTE_VERTICAL} 垂直</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                         <div>
                            <RadioGroup value={distributeMode} onChange={setDistributeMode}>
                              <RadioGroup.Label className="text-sm font-semibold text-[var(--text-primary)] mb-1 block">均匀间隔</RadioGroup.Label>
                              <div className="flex bg-[var(--ui-element-bg)] rounded-md p-1">
                                <RadioGroup.Option value="edges" className={({checked}) => `flex-1 text-center text-sm py-1 rounded-md cursor-pointer ${checked ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}>边</RadioGroup.Option>
                                <RadioGroup.Option value="centers" className={({checked}) => `flex-1 text-center text-sm py-1 rounded-md cursor-pointer ${checked ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}>中心</RadioGroup.Option>
                              </div>
                            </RadioGroup>
                         </div>
                         <div>
                            <label htmlFor="dist-spacing" className="text-sm font-semibold text-[var(--text-primary)] mb-1 block">固定间距</label>
                             <div className="flex items-center bg-[var(--ui-element-bg)] rounded-md h-[34px] px-2">
                              <input
                                id="dist-spacing"
                                type="number"
                                placeholder="自动"
                                value={distributeSpacing}
                                onChange={(e) => setDistributeSpacing(e.target.value)}
                                className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] hide-spinners"
                              />
                              <span className="text-sm text-[var(--text-secondary)]">px</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </Popover.Panel>
            </Transition>
          </Popover>
      )}

      {canPerformBooleanOrMask && (
        <Popover className="relative">
            <Popover.Button
                title="布尔运算"
                className="p-2 rounded-lg flex items-center justify-center w-10 h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
            >
                {ICONS.BOOLEAN_UNION}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                <Popover.Panel className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-auto bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-2">
                    {({ close }) => (
                        <div className="flex items-center gap-1">
                            {BOOLEAN_BUTTONS.map(btn => (
                                <button
                                    key={btn.name}
                                    onClick={() => { onBooleanOperation(btn.name); close(); }}
                                    title={btn.title}
                                    className="p-2 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                                >
                                    {btn.icon}
                                </button>
                            ))}
                        </div>
                    )}
                </Popover.Panel>
            </Transition>
        </Popover>
      )}

      {canPerformBooleanOrMask && (
        <button
          onClick={onMask}
          title="使用顶层对象作为蒙版"
          className="p-2 rounded-lg flex items-center justify-center w-10 h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
        >
          {ICONS.MASK}
        </button>
      )}

    </div>
  );
};