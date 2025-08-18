import React, { useRef, useEffect, useState, useMemo } from 'react';
import rough from 'roughjs/bin/rough';
import type { RoughSVG } from 'roughjs/bin/svg';
import { ICONS, DEFAULT_ROUGHNESS, DEFAULT_BOWING, DEFAULT_FILL_WEIGHT, DEFAULT_HACHURE_ANGLE, DEFAULT_HACHURE_GAP, DEFAULT_CURVE_TIGHTNESS, DEFAULT_CURVE_STEP_COUNT } from '../../constants';
import type { AnyPath, StyleClipboardData, RectangleData } from '../../types';
import { renderPathNode } from '../../lib/export';

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

    return <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 32 32" className="bg-white/5 rounded-md" />;
});


interface StyleLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (newPos: { x: number; y: number }) => void;
  library: StyleClipboardData[];
  setLibrary: React.Dispatch<React.SetStateAction<StyleClipboardData[]>>;
  selectedPath: AnyPath | null;
  onAddStyle: () => void;
  onApplyStyle: (style: StyleClipboardData) => void;
  onSaveLibrary: () => void;
  onLoadLibrary: () => void;
}

export const StyleLibraryPopover: React.FC<StyleLibraryPanelProps> = ({
  isOpen,
  onClose,
  position,
  onPositionChange,
  library,
  setLibrary,
  selectedPath,
  onAddStyle,
  onApplyStyle,
  onSaveLibrary,
  onLoadLibrary,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
    
  const canAddStyle = selectedPath !== null && selectedPath.tool !== 'group';

  const handleDeleteStyle = (index: number) => {
    setLibrary(prev => prev.filter((_, i) => i !== index));
  };
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div
      ref={panelRef}
      className="fixed z-40 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-2xl border border-[var(--ui-panel-border)] flex flex-col w-72"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div
        className="flex items-center justify-between p-2 pl-4 cursor-grab active:cursor-grabbing border-b border-[var(--ui-panel-border)]"
        onPointerDown={handleDragPointerDown}
      >
        <h3 className="text-sm font-medium text-[var(--text-primary)] select-none">样式库</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]"
          title="关闭面板"
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <div className="flex justify-end items-center -mt-2">
            <button
                onClick={onAddStyle}
                disabled={!canAddStyle}
                className="p-2 h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                title="从选区添加样式"
            >
                {ICONS.PLUS}
            </button>
        </div>
        
        <div className="max-h-60 overflow-y-auto p-2 -mt-4">
          {library.length > 0 ? (
            <div className="grid grid-cols-5 gap-2">
                {library.map((style, index) => (
                    <div key={index} className="relative group">
                        <button 
                          onClick={() => onApplyStyle(style)} 
                          title="应用样式"
                          className="w-full aspect-square rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] flex items-center justify-center"
                        >
                            <div className="w-full h-full transition-transform transform group-hover:scale-110">
                                <StyleSwatch style={style} />
                            </div>
                        </button>
                        <button 
                          onClick={() => handleDeleteStyle(index)} 
                          className="absolute top-0 right-0 -mt-1 -mr-1 h-5 w-5 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="删除样式"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                ))}
            </div>
            ) : (
              <div className="text-center text-xs text-[var(--text-secondary)] py-4">
                样式库为空。
                <br/>
                选中一个对象并点击“+”添加。
              </div>
            )}
        </div>

        <div className="h-px bg-[var(--separator)]" />

        <div className="grid grid-cols-2 gap-2">
            <button
                onClick={onLoadLibrary}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-md text-sm transition-colors text-[var(--text-primary)] bg-black/20 hover:bg-black/40"
            >
                {ICONS.OPEN}
                <span>加载...</span>
            </button>
              <button
                onClick={onSaveLibrary}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-md text-sm transition-colors text-[var(--text-primary)] bg-black/20 hover:bg-black/40"
            >
                {ICONS.SAVE}
                <span>保存...</span>
            </button>
        </div>
      </div>
    </div>
  );
};