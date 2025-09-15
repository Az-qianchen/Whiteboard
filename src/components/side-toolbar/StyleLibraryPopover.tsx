import React, { useRef, useEffect, useState, useMemo, Fragment } from 'react';
import rough from 'roughjs/bin/rough';
import type { RoughSVG } from 'roughjs/bin/svg';
import { ICONS, DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_TIGHTNESS, DEFAULT_CURVE_STEP_COUNT } from '@/constants';
import type { AnyPath, StyleClipboardData, RectangleData, MaterialData } from '@/types';
import { renderPathNode, pathsToSvgString } from '@/lib/export';
import { Tab, Popover, Transition } from '@headlessui/react';
import PanelButton from '@/components/PanelButton';


const StyleSwatch: React.FC<{ style: StyleClipboardData }> = React.memo(({ style }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [rc, setRc] = useState<RoughSVG | null>(null);

    useEffect(() => {
        if (svgRef.current) setRc(rough.svg(svgRef.current));
    }, []);

    const pathData = useMemo(() => {
        const defaultStyleProps = {
            color: '#000000',
            fill: 'transparent',
            fillStyle: 'hachure',
            strokeWidth: 2,
            roughness: DEFAULT_ROUGHNESS,
            bowing: DEFAULT_BOWING,
            fillWeight: DEFAULT_FILL_WEIGHT,
            hachureAngle: DEFAULT_HACHURE_ANGLE,
            hachureGap: DEFAULT_HACHURE_GAP,
            curveTightness: DEFAULT_CURVE_TIGHTNESS,
            curveStepCount: DEFAULT_CURVE_STEP_COUNT,
        };
        return {
            id: 'style-swatch-preview',
            tool: 'rectangle',
            x: 3, y: 3, width: 26, height: 26,
            ...defaultStyleProps,
            ...style,
        } as RectangleData;
    }, [style]);

    useEffect(() => {
        if (rc && svgRef.current) {
            const svg = svgRef.current;
            while (svg.firstChild) svg.removeChild(svg.firstChild);
            const node = renderPathNode(rc, pathData);
            if (node) svg.appendChild(node);
        }
    }, [rc, pathData]);

    return <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 32 32" className="bg-[var(--ui-element-bg)] rounded-md" />;
});


const MaterialSwatch: React.FC<{ material: MaterialData }> = React.memo(({ material }) => {
    const [svgString, setSvgString] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;
        const generateSvg = async () => {
            const str = await pathsToSvgString(material.shapes, { padding: 0 });
            if (!isCancelled) {
                setSvgString(str);
            }
        };
        generateSvg();
        return () => {
            isCancelled = true;
        };
    }, [material]);

    if (!svgString) {
        return <div className="w-full h-full bg-[var(--ui-element-bg)] rounded-md p-1 flex items-center justify-center pointer-events-none" />;
    }

    return (
        <div className="w-full h-full bg-[var(--ui-element-bg)] rounded-md p-1 flex items-center justify-center pointer-events-none">
            <img 
                src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`} 
                alt="Material preview"
                className="max-w-full max-h-full"
            />
        </div>
    );
});


interface StyleLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (newPos: { x: number; y: number }) => void;
  styleLibrary: StyleClipboardData[];
  setStyleLibrary: React.Dispatch<React.SetStateAction<StyleClipboardData[]>>;
  materialLibrary: MaterialData[];
  setMaterialLibrary: React.Dispatch<React.SetStateAction<MaterialData[]>>;
  selectedPathIds: string[];
  onAddStyle: () => void;
  onApplyStyle: (style: StyleClipboardData) => void;
  onAddMaterial: () => void;
  onApplyMaterial: (material: MaterialData, position?: { x: number; y: number }) => void;
  onSaveLibrary: () => Promise<void>;
  onLoadLibrary: () => Promise<void>;
  onClearLibrary: () => void;
}

export const StyleLibraryPopover: React.FC<StyleLibraryPanelProps> = ({
  isOpen,
  onClose,
  position,
  onPositionChange,
  styleLibrary,
  setStyleLibrary,
  materialLibrary,
  setMaterialLibrary,
  selectedPathIds,
  onAddStyle,
  onApplyStyle,
  onAddMaterial,
  onApplyMaterial,
  onSaveLibrary,
  onLoadLibrary,
  onClearLibrary,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If the click is on a button or an interactive child, don't start a drag.
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (e.button !== 0) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const initialPos = { ...position };
    const pointerStart = { x: e.clientX, y: e.clientY };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - pointerStart.x;
      const dy = moveEvent.clientY - pointerStart.y;
      
      const newX = Math.max(0, Math.min(initialPos.x + dx, window.innerWidth - (panelRef.current?.offsetWidth ?? 0)));
      const newY = Math.max(0, Math.min(initialPos.y + dy, window.innerHeight - (panelRef.current?.offsetHeight ?? 0)));
      
      onPositionChange({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };
    
  const canAddStyle = selectedPathIds.length === 1;
  const canAddMaterial = selectedPathIds.length > 0;

  const handleDeleteStyle = (index: number) => {
    setStyleLibrary(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleDeleteMaterial = (index: number) => {
    setMaterialLibrary(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStartMaterial = (e: React.DragEvent, material: MaterialData) => {
    e.dataTransfer.setData('application/json', JSON.stringify(material));
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  if (!isOpen) {
    return null;
  }
  
  const tabs = ['样式', '素材'];

  return (
    <div
      ref={panelRef}
      className="fixed z-40 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-2xl border border-[var(--ui-panel-border)] flex flex-col w-72"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <Tab.Group as="div" className="flex flex-col flex-grow">
        <div
          className="flex items-center justify-between p-2 cursor-grab active:cursor-grabbing border-b border-[var(--ui-panel-border)]"
          onPointerDown={handleDragPointerDown}
        >

          <div>
            <Tab.List className="flex space-x-1 rounded-lg bg-[var(--ui-element-bg)] p-1">
                {tabs.map(tab => (
                  <Tab as={Fragment} key={tab}>
                    {({ selected }) => (
                      <PanelButton
                        variant="unstyled"
                        className={`w-16 rounded-md py-1.5 text-sm font-medium leading-5 transition-colors duration-150 ease-in-out ring-offset-2 ring-offset-[var(--ui-popover-bg)] ring-[var(--accent-primary)] ${
                          selected
                            ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
                        }`}
                      >
                        {tab}
                      </PanelButton>
                    )}
                  </Tab>
                ))}
            </Tab.List>
          </div>

          <div className="flex items-center">
              <Popover as="div" className="relative">
                <Popover.Button
                  as={PanelButton}
                  variant="unstyled"
                  className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                  title="素材库选项"
                >
                  {ICONS.MORE_VERTICAL}
                </Popover.Button>
                 <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                  <Popover.Panel className="absolute top-full mt-1 right-0 w-48 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-50 p-1">
                    {({ close }) => (
                      <div className="flex flex-col">
                          <PanelButton
                            variant="unstyled"
                            onClick={async () => { await onLoadLibrary(); close(); }}
                            className="w-full flex items-center gap-3 p-2 rounded-md text-left text-sm text-[var(--text-primary)] hover:bg-[var(--ui-element-bg-hover)]"
                          >
                            <div className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]">{ICONS.OPEN}</div>
                            <span>加载...</span>
                          </PanelButton>
                          <PanelButton
                            variant="unstyled"
                            onClick={async () => { await onSaveLibrary(); close(); }}
                            className="w-full flex items-center gap-3 p-2 rounded-md text-left text-sm text-[var(--text-primary)] hover:bg-[var(--ui-element-bg-hover)]"
                          >
                            <div className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]">{ICONS.SAVE}</div>
                            <span>保存...</span>
                          </PanelButton>
                          <div className="h-px my-1 bg-[var(--ui-separator)]" />
                          <PanelButton
                            variant="unstyled"
                            onClick={() => {
                            onClearLibrary();
                            close();
                          }}
                            className="w-full flex items-center gap-3 p-2 rounded-md text-left text-sm text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                          >
                            <div className="w-4 h-4 flex-shrink-0">{ICONS.TRASH}</div>
                            <span>清空图库</span>
                          </PanelButton>
                      </div>
                    )}
                  </Popover.Panel>
                </Transition>
              </Popover>

              <PanelButton
                variant="unstyled"
                onClick={onClose}
                className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                title="关闭面板"
              >
                 {ICONS.X}
              </PanelButton>
          </div>
        </div>
        
        <Tab.Panels className="p-2">
          <Tab.Panel>
            <div className="max-h-60 overflow-y-auto p-2 style-library-grid">
                <div className="grid grid-cols-5 gap-2">
                    <PanelButton
                        variant="unstyled"
                        onClick={onAddStyle}
                        disabled={!canAddStyle}
                        className="w-full aspect-square rounded-md flex items-center justify-center bg-[var(--ui-element-bg)] hover:bg-[var(--ui-element-bg-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="从选区添加样式"
                    >
                        {ICONS.PLUS}
                    </PanelButton>
                    {styleLibrary.map((style, index) => (
                        <div key={index} className="relative group">
                              <PanelButton
                                variant="unstyled"
                                onClick={() => onApplyStyle(style)}
                                title="应用样式"
                                className="w-full aspect-square rounded-md flex items-center justify-center"
                              >
                                <div className="w-full h-full transition-transform transform group-hover:scale-110">
                                    <StyleSwatch style={style} />
                                </div>
                              </PanelButton>
                              <PanelButton
                                variant="unstyled"
                                onClick={() => handleDeleteStyle(index)}
                                className="absolute top-0 right-0 -mt-1 -mr-1 h-5 w-5 p-1 bg-[var(--danger-text)] rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="删除样式"
                              >
                               {ICONS.TRASH}
                              </PanelButton>
                        </div>
                    ))}
                </div>
            </div>
          </Tab.Panel>
          <Tab.Panel>
             <div className="max-h-60 overflow-y-auto p-2 style-library-grid">
                <div className="grid grid-cols-3 gap-2">
                     <PanelButton
                        variant="unstyled"
                        onClick={onAddMaterial}
                        disabled={!canAddMaterial}
                        className="w-full aspect-square rounded-md flex items-center justify-center bg-[var(--ui-element-bg)] hover:bg-[var(--ui-element-bg-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="从选区添加素材"
                    >
                        {ICONS.PLUS}
                    </PanelButton>
                    {materialLibrary.map((material, index) => (
                        <div key={index} className="relative group">
                              <PanelButton
                                variant="unstyled"
                                draggable
                                onDragStart={(e) => handleDragStartMaterial(e, material)}
                                title="拖拽素材"
                                className="w-full aspect-square rounded-md flex items-center justify-center"
                              >
                                <div className="w-full h-full transition-transform transform group-hover:scale-110">
                                    <MaterialSwatch material={material} />
                                </div>
                              </PanelButton>
                              <PanelButton
                                variant="unstyled"
                                onClick={() => handleDeleteMaterial(index)}
                                className="absolute top-0 right-0 -mt-1 -mr-1 h-5 w-5 p-1 bg-[var(--danger-text)] rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="删除素材"
                              >
                               {ICONS.TRASH}
                              </PanelButton>
                        </div>
                    ))}
                </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};