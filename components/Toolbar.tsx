
import React, { useState, useEffect, Fragment, useRef } from 'react';
import { Popover, Transition, RadioGroup, Switch } from '@headlessui/react';
import { ICONS } from '../constants';
import type { Tool } from '../types';
import { ColorPicker } from './ColorPicker';

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  color: string;
  setColor: (color: string) => void;
  fill: string;
  setFill: (color: string) => void;
  fillStyle: string;
  setFillStyle: (style: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  
  // RoughJS properties
  roughness: number;
  setRoughness: (r: number) => void;
  bowing: number;
  setBowing: (b: number) => void;
  fillWeight: number;
  setFillWeight: (fw: number) => void;
  hachureAngle: number;
  setHachureAngle: (ha: number) => void;
  hachureGap: number;
  setHachureGap: (hg: number) => void;
  curveTightness: number;
  setCurveTightness: (ct: number) => void;
  curveStepCount: number;
  setCurveStepCount: (csc: number) => void;

  undo: () => void;
  canUndo: boolean;
  redo: () => void;
  canRedo: boolean;
  clear: () => void;
  canClear: boolean;
  beginCoalescing: () => void;
  endCoalescing: () => void;

  onOpenAiModal: () => void;

  isGridVisible: boolean;
  setIsGridVisible: (visible: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
}

const FILL_STYLE_ICONS = {
  solid: (
    <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor"><rect x="2" y="2" width="16" height="16" /></svg>
  ),
  hachure: (
    <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M 3 17 L 17 3 M 3 12 L 12 3 M 3 7 L 7 3 M 8 17 L 17 8 M 13 17 L 17 13" />
      <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  'cross-hatch': (
     <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M 5 0 V 20 M 10 0 V 20 M 15 0 V 20 M 0 5 H 20 M 0 10 H 20 M 0 15 H 20" strokeWidth="1" />
      <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  zigzag: (
    <svg width="20" height="20" viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M 2 5 L 6 2 L 10 5 L 14 2 L 18 5 M 2 10 L 6 7 L 10 10 L 14 7 L 18 10 M 2 15 L 6 12 L 10 15 L 14 12 L 18 15" />
      <rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
};

const FILL_STYLES = [
    { name: 'solid', title: '实心', icon: FILL_STYLE_ICONS.solid },
    { name: 'hachure', title: '平行线', icon: FILL_STYLE_ICONS.hachure },
    { name: 'cross-hatch', title: '十字线', icon: FILL_STYLE_ICONS['cross-hatch'] },
    { name: 'zigzag', title: '锯齿线', icon: FILL_STYLE_ICONS.zigzag },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool, setTool,
  color, setColor,
  fill, setFill,
  fillStyle, setFillStyle,
  strokeWidth, setStrokeWidth,
  roughness, setRoughness,
  bowing, setBowing,
  fillWeight, setFillWeight,
  hachureAngle, setHachureAngle,
  hachureGap, setHachureGap,
  curveTightness, setCurveTightness,
  curveStepCount, setCurveStepCount,
  undo, canUndo,
  redo, canRedo,
  clear, canClear,
  beginCoalescing, endCoalescing,
  onOpenAiModal,
  isGridVisible, setIsGridVisible,
  gridSize, setGridSize,
}) => {
  const [localStrokeWidth, setLocalStrokeWidth] = useState(strokeWidth.toString());
  const wheelTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalStrokeWidth(strokeWidth.toString());
  }, [strokeWidth]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
        if (wheelTimeoutRef.current) {
            clearTimeout(wheelTimeoutRef.current);
        }
    };
  }, []);

  const handleStrokeWidthCommit = () => {
    let value = parseInt(localStrokeWidth, 10);
    if (isNaN(value) || value < 1) {
      value = 1;
    } else if (value > 100) {
      value = 100;
    }
    setStrokeWidth(value);
    setLocalStrokeWidth(value.toString());
  };

  const handleStrokeWidthWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    } else {
      // Only begin coalescing on the first wheel event of a sequence
      beginCoalescing();
    }
    
    const increment = e.deltaY < 0 ? 1 : -1;
    const newValue = Math.max(1, Math.min(100, strokeWidth + increment));
    setStrokeWidth(newValue);

    wheelTimeoutRef.current = window.setTimeout(() => {
      endCoalescing();
      wheelTimeoutRef.current = null;
    }, 500);
  };

  const isFillEnabledForCurrentTool = tool === 'edit' || tool === 'rectangle' || tool === 'ellipse' || tool === 'pen';
  const isCurvePropsEnabledForCurrentTool = tool === 'edit' || tool === 'line';

  const toolButtons = [
    { name: 'edit', title: '选择 (V)', icon: ICONS.EDIT, label: '选择' },
  ];
  const drawingToolButtons = [
    { name: 'brush', title: '画笔 (B)', icon: ICONS.BRUSH, label: '画笔' },
    { name: 'pen', title: '钢笔 (P)', icon: ICONS.PEN, label: '钢笔' },
    { name: 'rectangle', title: '矩形 (R)', icon: ICONS.RECTANGLE, label: '矩形' },
    { name: 'ellipse', title: '椭圆 (O)', icon: ICONS.ELLIPSE, label: '椭圆' },
    { name: 'line', title: '线条 (L)', icon: ICONS.LINE, label: '线条' },
  ];

  return (
    <div className="w-full max-w-5xl bg-white dark:bg-[#4A5568] shadow-lg rounded-lg p-3 flex flex-wrap items-end justify-center gap-x-3 gap-y-2 text-slate-600 dark:text-slate-300">
      
      {/* 工具选择 */}
      <div className="flex items-end gap-1">
         {toolButtons.map((toolItem) => (
            <div key={toolItem.name} className="flex flex-col items-center gap-1 w-14">
              <button
                type="button"
                title={toolItem.title}
                onClick={() => setTool(toolItem.name as Tool)}
                className={`p-2 rounded-lg flex items-center justify-center w-9 h-9 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 ${
                  tool === toolItem.name
                    ? 'bg-blue-100 dark:bg-blue-800 ring-2 ring-blue-500 text-blue-600 dark:text-blue-200'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {toolItem.icon}
              </button>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{toolItem.label}</span>
            </div>
         ))}
      </div>

      <RadioGroup value={tool} onChange={setTool} className="flex items-end gap-1">
        {drawingToolButtons.map((toolItem) => (
          <div key={toolItem.name} className="flex flex-col items-center gap-1 w-14">
            <RadioGroup.Option
              value={toolItem.name}
              as="button"
              title={toolItem.title}
              className={({ checked }) => `p-2 rounded-lg flex items-center justify-center w-9 h-9 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 ${
                checked
                  ? 'bg-blue-100 dark:bg-blue-800 ring-2 ring-blue-500 text-blue-600 dark:text-blue-200'
                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {toolItem.icon}
            </RadioGroup.Option>
             <RadioGroup.Label as="span" className="text-xs font-medium text-slate-500 dark:text-slate-400">{toolItem.label}</RadioGroup.Label>
          </div>
        ))}
      </RadioGroup>
      
      {/* AI Drawing Button */}
      <div className="flex flex-col items-center gap-1 w-14">
        <button
          type="button"
          title="AI 绘图 (A)"
          onClick={onOpenAiModal}
          className="p-2 rounded-lg flex items-center justify-center w-9 h-9 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          {ICONS.AI}
        </button>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">AI 绘图</span>
      </div>

      <Separator />

      {/* Style Controls */}
      <div className="flex items-end gap-3 text-center">
        {/* 描边颜色选择 */}
        <div className="flex flex-col items-center gap-1 w-14">
          <Popover className="relative">
            <Popover.Button
              className="h-8 w-8 rounded-full ring-1 ring-inset ring-gray-300 dark:ring-slate-500 transition-transform transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-slate-800"
              style={{ backgroundColor: color }}
              aria-label="选择描边颜色"
            />
            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
              <Popover.Panel className="absolute top-full mt-2 -translate-x-1/2 left-1/2 z-20">
                <ColorPicker
                  color={color}
                  onChange={setColor}
                  onInteractionStart={beginCoalescing}
                  onInteractionEnd={endCoalescing}
                />
              </Popover.Panel>
            </Transition>
          </Popover>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">描边色</span>
        </div>

        {/* 填充颜色选择 */}
        <div className={`flex flex-col items-center gap-1 w-14 transition-opacity ${!isFillEnabledForCurrentTool ? 'opacity-50' : ''}`}>
          <Popover className="relative">
              <Popover.Button
                disabled={!isFillEnabledForCurrentTool}
                className="h-8 w-8 rounded-full ring-1 ring-inset ring-gray-300 dark:ring-slate-500 transition-transform transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-slate-800 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: fill,
                  backgroundImage: (fill === 'transparent' || (fill.includes('rgba') && fill.endsWith('0)')) || (fill.includes('hsla') && fill.endsWith('0)')))
                    ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' 
                    : 'none',
                  backgroundSize: '10px 10px',
                  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                 }}
                aria-label="选择填充颜色"
              />
              <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                <Popover.Panel className="absolute top-full mt-2 -translate-x-1/2 left-1/2 z-20">
                  <ColorPicker
                    color={fill}
                    onChange={setFill}
                    onInteractionStart={beginCoalescing}
                    onInteractionEnd={endCoalescing}
                  />
                </Popover.Panel>
              </Transition>
          </Popover>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">背景色</span>
        </div>
        
        {/* 填充样式 */}
        <div className={`flex flex-col items-center gap-1 w-14 transition-opacity ${!isFillEnabledForCurrentTool ? 'opacity-50' : ''}`}>
          <Popover className="relative">
            <Popover.Button
              disabled={!isFillEnabledForCurrentTool}
              className="h-9 w-9 p-1.5 rounded-lg flex items-center justify-center transition-colors bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 ring-1 ring-inset ring-gray-300 dark:ring-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed"
              title={`填充样式: ${FILL_STYLES.find(s => s.name === fillStyle)?.title}`}
              aria-label="选择填充样式"
            >
              {FILL_STYLE_ICONS[fillStyle as keyof typeof FILL_STYLE_ICONS]}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
              <Popover.Panel className="absolute top-full mt-2 left-0 w-48 bg-white dark:bg-[#4A5568] rounded-lg shadow-2xl border-2 border-slate-200 dark:border-slate-600 z-20 p-2">
                {({ close }) => (
                  <div className="grid grid-cols-1 gap-1">
                    {FILL_STYLES.map(({ name, title, icon }) => (
                      <button
                        key={name}
                        onClick={() => { setFillStyle(name); close(); }}
                        className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors ${
                          fillStyle === name
                            ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-100'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="w-5 h-5 flex-shrink-0 text-current">{icon}</div>
                        <span className="flex-grow">{title}</span>
                        {fillStyle === name && <div className="w-5 h-5 text-blue-600 dark:text-blue-200">{ICONS.CHECK}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </Popover.Panel>
            </Transition>
          </Popover>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">填充样式</span>
        </div>

        {/* 描边宽度 */}
        <div className="flex flex-col items-center gap-1 w-20">
          <div
            className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-md h-9 px-2 w-full cursor-ns-resize"
            onWheel={handleStrokeWidthWheel}
            title="使用滚轮调节"
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={localStrokeWidth}
              onChange={(e) => setLocalStrokeWidth(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={handleStrokeWidthCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleStrokeWidthCommit();
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              className="w-full bg-transparent text-sm text-center outline-none text-slate-800 dark:text-slate-200 pointer-events-none"
              aria-label="描边宽度"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">px</span>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">宽度</span>
        </div>
        
        {/* 属性 */}
        <div className="flex flex-col items-center gap-1 w-14">
            <Popover className="relative">
              <Popover.Button className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 ring-1 ring-inset ring-gray-300 dark:ring-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" title="样式属性">
                {ICONS.PROPERTIES}
              </Popover.Button>
               <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                <Popover.Panel className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-[#4A5568] rounded-lg shadow-2xl border-2 border-slate-200 dark:border-slate-600 z-20 p-4">
                    <div className="space-y-4">
                        <Slider label="粗糙度" value={roughness} setValue={setRoughness} min={0} max={5} step={0.1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                        <Slider label="弯曲度" value={bowing} setValue={setBowing} min={0} max={10} step={0.25} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                        <div className={`transition-opacity ${!isCurvePropsEnabledForCurrentTool ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Slider label="曲线紧密度" value={curveTightness} setValue={setCurveTightness} min={-1.5} max={1.5} step={0.1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                        </div>
                        <div className={`transition-opacity ${!isCurvePropsEnabledForCurrentTool ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Slider label="曲线步数" value={curveStepCount} setValue={setCurveStepCount} min={1} max={30} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                        </div>
                        <Separator />
                        <div className={`transition-opacity ${!isFillEnabledForCurrentTool || fillStyle === 'solid' ? 'opacity-50' : ''}`}>
                          <p className={`text-xs text-slate-500 dark:text-slate-400 mb-2 ${isFillEnabledForCurrentTool && fillStyle !== 'solid' ? 'hidden' : ''}`}>填充属性仅适用于非实心样式</p>
                          <div className={`space-y-4 ${!isFillEnabledForCurrentTool || fillStyle === 'solid' ? 'pointer-events-none' : ''}`}>
                            <Slider label="填充权重" value={fillWeight} setValue={setFillWeight} min={-1} max={5} step={0.25} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                            <Slider label="影线角度" value={hachureAngle} setValue={setHachureAngle} min={-90} max={90} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                            <Slider label="影线间距" value={hachureGap} setValue={setHachureGap} min={-1} max={20} step={0.5} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                          </div>
                        </div>
                    </div>
                </Popover.Panel>
              </Transition>
            </Popover>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">样式</span>
        </div>
      </div>

      <Separator />

      {/* View/Canvas Controls */}
      <div className="flex items-end gap-3 text-center">
        <div className="flex flex-col items-center gap-1 w-14">
          <Popover className="relative">
            <Popover.Button className={`p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors ring-1 ring-inset ring-gray-300 dark:ring-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isGridVisible ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`} title="网格与吸附 (G)">
              {ICONS.GRID}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
              <Popover.Panel className="absolute top-full mt-2 right-0 w-60 bg-white dark:bg-[#4A5568] rounded-lg shadow-2xl border-2 border-slate-200 dark:border-slate-600 z-20 p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="grid-switch" className="text-sm font-medium text-slate-700 dark:text-slate-200">显示/吸附网格</label>
                    <Switch
                      id="grid-switch"
                      checked={isGridVisible}
                      onChange={setIsGridVisible}
                      className={`${isGridVisible ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800`}
                    >
                      <span className={`${isGridVisible ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </Switch>
                  </div>
                  <div className={`grid grid-cols-2 items-center gap-2 transition-opacity ${!isGridVisible ? 'opacity-50' : ''}`}>
                    <label htmlFor="grid-size-input" className="text-sm font-medium text-slate-700 dark:text-slate-200">网格大小</label>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-md h-8 px-2">
                      <input
                        id="grid-size-input"
                        type="number"
                        min="5" max="100" step="1"
                        value={gridSize}
                        onChange={(e) => setGridSize(Math.max(5, Number(e.target.value)))}
                        className="w-full bg-transparent text-sm text-center outline-none text-slate-800 dark:text-slate-200 hide-spinners"
                        disabled={!isGridVisible}
                      />
                      <span className="text-sm text-slate-500 dark:text-slate-400">px</span>
                    </div>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">网格</span>
        </div>
      </div>
      
      <Separator />

      {/* 操作按钮 */}
      <div className="flex items-end gap-2">
        <ActionButton onClick={undo} disabled={!canUndo} icon={ICONS.UNDO} label="撤销" />
        <ActionButton onClick={redo} disabled={!canRedo} icon={ICONS.REDO} label="重做" />
        <ActionButton onClick={clear} disabled={!canClear} icon={ICONS.CLEAR} label="清空" isDanger={true} />
      </div>
    </div>
  );
};

// --- 子组件 ---

const Separator = () => <div className="h-10 w-px bg-slate-200 dark:bg-slate-600 hidden sm:block mx-1 self-end mb-4"></div>;

const ActionButton: React.FC<{onClick: () => void, disabled: boolean, icon: React.ReactNode, label: string, isDanger?: boolean}> = ({ onClick, disabled, icon, label, isDanger }) => {
  const baseClasses = "px-3 py-2 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 w-full";
  const colorClasses = isDanger 
    ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500" 
    : "bg-slate-200 dark:bg-slate-500 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-400 focus-visible:ring-slate-400";
  return (
    <div className="flex flex-col items-center gap-1 w-20">
      <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${colorClasses}`}>
        {icon}
      </button>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
};

interface SliderProps {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  step: number;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, setValue, min, max, step, onInteractionStart, onInteractionEnd }) => {
  const handlePointerDown = () => {
    onInteractionStart();

    const handlePointerUp = () => {
      onInteractionEnd();
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="grid grid-cols-3 items-center gap-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={label}>{label}</label>
      <input
        type="range"
        id={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerDown={handlePointerDown}
        className="w-full col-span-2"
      />
    </div>
  );
};
