import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '@/constants';
import type { GradientFill, GradientHandle, LinearGradientFill, RadialGradientFill } from '@/types';
import {
  createDefaultLinearGradient,
  createDefaultRadialGradient,
  getLinearHandles,
  gradientStopColor,
  gradientToCss,
  updateGradientAngle,
  updateGradientStopColor,
  updateLinearGradientHandles,
  updateRadialGradientHandles,
} from '@/lib/gradient';
import { FloatingColorPicker } from '../FloatingColorPicker';
import { NumericInput } from './NumericInput';

interface GradientFillPopoverProps {
  fill: string;
  fillGradient: GradientFill | null;
  setFill: (color: string) => void;
  setFillGradient: (gradient: GradientFill | null) => void;
  fillStyle: string;
  setFillStyle: (style: string) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

const CHECKERBOARD = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
const CHECKERBOARD_SIZES = '10px 10px, 10px 10px, 10px 10px, 10px 10px';
const CHECKERBOARD_POSITIONS = '0 0, 0 5px, 5px -5px, -5px 0px';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

type HandleKey = 'start' | 'end' | 'center' | 'edge';

interface StopPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

const StopPicker: React.FC<StopPickerProps> = ({ label, color, onChange, beginCoalescing, endCoalescing }) => (
  <FloatingColorPicker
    color={color}
    onChange={onChange}
    onInteractionStart={beginCoalescing}
    onInteractionEnd={endCoalescing}
    placement="left"
  >
    {({ ref, onClick }) => (
      <PanelButton
        variant="unstyled"
        ref={ref as any}
        onClick={onClick}
        className="h-7 w-7 rounded-full ring-1 ring-inset ring-white/10 transition-transform transform hover:scale-110"
        style={{
          backgroundImage: `linear-gradient(${color}, ${color}), ${CHECKERBOARD}`,
          backgroundSize: `cover, ${CHECKERBOARD_SIZES}`,
          backgroundPosition: `0 0, ${CHECKERBOARD_POSITIONS}`,
          backgroundColor: 'transparent',
        }}
        aria-label={label}
        title={label}
      />
    )}
  </FloatingColorPicker>
);

export const GradientFillPopover: React.FC<GradientFillPopoverProps> = React.memo(({ 
  fill,
  fillGradient,
  setFill,
  setFillGradient,
  fillStyle,
  setFillStyle,
  beginCoalescing,
  endCoalescing,
}) => {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const gradientRef = useRef<GradientFill | null>(fillGradient);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<HandleKey | null>(null);

  useEffect(() => {
    gradientRef.current = fillGradient;
  }, [fillGradient]);

  useEffect(() => () => {
    if (dragCleanupRef.current) {
      dragCleanupRef.current();
      dragCleanupRef.current = null;
    }
  }, []);

  const isActive = !!fillGradient;
  const title = t('sideToolbar.gradientFill.title');
  const toggleLabel = t('sideToolbar.gradientFill.enable');
  const angleLabel = t('sideToolbar.gradientFill.angle');
  const startLabel = t('sideToolbar.gradientFill.start');
  const endLabel = t('sideToolbar.gradientFill.end');
  const solidHint = t('sideToolbar.gradientFill.solidHint');
  const typeLabel = t('sideToolbar.gradientFill.type');
  const linearTypeLabel = t('sideToolbar.gradientFill.types.linear');
  const radialTypeLabel = t('sideToolbar.gradientFill.types.radial');
  const handleLabels: Record<HandleKey, string> = {
    start: t('sideToolbar.gradientFill.handles.start'),
    end: t('sideToolbar.gradientFill.handles.end'),
    center: t('sideToolbar.gradientFill.handles.center'),
    edge: t('sideToolbar.gradientFill.handles.edge'),
  };

  const previewStyle = useMemo(() => {
    if (!fillGradient) {
      return {
        backgroundImage: `linear-gradient(${fill}, ${fill}), ${CHECKERBOARD}`,
        backgroundSize: `cover, ${CHECKERBOARD_SIZES}`,
        backgroundPosition: `0 0, ${CHECKERBOARD_POSITIONS}`,
        backgroundColor: 'transparent',
      } as React.CSSProperties;
    }
    return {
      backgroundImage: `${gradientToCss(fillGradient)}, ${CHECKERBOARD}`,
      backgroundSize: `cover, ${CHECKERBOARD_SIZES}`,
      backgroundPosition: `0 0, ${CHECKERBOARD_POSITIONS}`,
      backgroundColor: 'transparent',
    } as React.CSSProperties;
  }, [fill, fillGradient]);

  const editorStyle = useMemo(() => {
    if (!fillGradient) return undefined;
    return {
      backgroundImage: `${gradientToCss(fillGradient)}, ${CHECKERBOARD}`,
      backgroundSize: `cover, ${CHECKERBOARD_SIZES}`,
      backgroundPosition: `0 0, ${CHECKERBOARD_POSITIONS}`,
      backgroundColor: 'transparent',
    } as React.CSSProperties;
  }, [fillGradient]);

  const linearHandles = useMemo(() => {
    if (!fillGradient || fillGradient.type !== 'linear') return null;
    return getLinearHandles(fillGradient);
  }, [fillGradient]);

  const radialHandles = useMemo(() => {
    if (!fillGradient || fillGradient.type !== 'radial') return null;
    const { center, edge } = fillGradient;
    const radius = Math.hypot((edge.x - center.x) * 100, (edge.y - center.y) * 100);
    return { center, edge, radius };
  }, [fillGradient]);

  const handleButtonClass = useCallback(
    (key: HandleKey) => {
      const active = draggingHandle === key;
      const base = 'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[var(--accent-primary)]';
      const sizing = key === 'center' ? ' h-4 w-4' : ' h-4 w-4';
      const fillClass = (key === 'end' || key === 'edge')
        ? ' bg-white/10 border-white/80 backdrop-blur-sm'
        : ' bg-white border-white/80';
      const scaleClass = active ? ' scale-110 ring-2 ring-[var(--accent-primary)]' : ' hover:scale-110';
      return `${base}${sizing}${fillClass}${scaleClass}`;
    },
    [draggingHandle],
  );

  const updateHandlePosition = useCallback(
    (clientX: number, clientY: number, handleKey: HandleKey) => {
      const current = gradientRef.current;
      if (!current || !editorRef.current) return;
      const rect = editorRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);

      if (current.type === 'linear') {
        if (handleKey !== 'start' && handleKey !== 'end') return;
        const [start, end] = getLinearHandles(current);
        const handles: [GradientHandle, GradientHandle] = handleKey === 'start'
          ? [{ x, y }, end]
          : [start, { x, y }];
        const next = updateLinearGradientHandles(current, handles);
        gradientRef.current = next;
        setFillGradient(next);
      } else {
        if (handleKey !== 'center' && handleKey !== 'edge') return;
        const update = handleKey === 'center' ? { center: { x, y } } : { edge: { x, y } };
        const next = updateRadialGradientHandles(current, update);
        gradientRef.current = next;
        setFillGradient(next);
      }
    },
    [setFillGradient],
  );

  const handlePointerDown = useCallback(
    (handleKey: HandleKey) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!fillGradient) return;
      event.preventDefault();
      event.stopPropagation();
      beginCoalescing();
      setDraggingHandle(handleKey);

      const pointerId = event.pointerId;

      const cleanup = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        dragCleanupRef.current = null;
        setDraggingHandle(null);
        endCoalescing();
      };

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        updateHandlePosition(ev.clientX, ev.clientY, handleKey);
      };

      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cleanup();
      };

      dragCleanupRef.current = cleanup;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      updateHandlePosition(event.clientX, event.clientY, handleKey);
    },
    [fillGradient, beginCoalescing, endCoalescing, updateHandlePosition],
  );

  const ensureGradient = () => {
    if (fillGradient) return fillGradient;
    return createDefaultLinearGradient(fill);
  };

  const handleToggle = () => {
    if (isActive) {
      dragCleanupRef.current?.();
      gradientRef.current = null;
      setFillGradient(null);
      return;
    }
    const next = ensureGradient();
    gradientRef.current = next;
    setFillGradient(next);
    if (next.stops.length > 0) {
      setFill(next.stops[0].color);
    }
    if (fillStyle !== 'solid') {
      setFillStyle('solid');
    }
  };

  const handleStopChange = (index: number, color: string) => {
    if (!fillGradient) return;
    const next = updateGradientStopColor(fillGradient, index, color);
    gradientRef.current = next;
    setFillGradient(next);
    if (index === 0) {
      setFill(color);
    }
  };

  const handleAngleChange = (value: number) => {
    if (!fillGradient || fillGradient.type !== 'linear') return;
    const next = updateGradientAngle(fillGradient, value);
    gradientRef.current = next;
    setFillGradient(next);
  };

  const handleTypeChange = (type: 'linear' | 'radial') => {
    if (!fillGradient || fillGradient.type === type) return;
    const stops = fillGradient.stops.map(stop => ({ ...stop }));

    if (type === 'linear') {
      const base = createDefaultLinearGradient(stops[0]?.color ?? fill) as LinearGradientFill;
      let configured: LinearGradientFill = base;
      if (fillGradient.type === 'radial') {
        const dx = fillGradient.edge.x - fillGradient.center.x;
        const dy = fillGradient.edge.y - fillGradient.center.y;
        const start = { x: clamp01(fillGradient.center.x - dx), y: clamp01(fillGradient.center.y - dy) };
        const end = { x: clamp01(fillGradient.center.x + dx), y: clamp01(fillGradient.center.y + dy) };
        configured = updateLinearGradientHandles(base, [start, end]);
      }
      const next: GradientFill = { ...configured, stops };
      gradientRef.current = next;
      setFillGradient(next);
      return;
    }

    const base = createDefaultRadialGradient(stops[0]?.color ?? fill) as RadialGradientFill;
    let configured: RadialGradientFill = base;
    if (fillGradient.type === 'linear') {
      const [start, end] = getLinearHandles(fillGradient);
      const centerPoint = { x: clamp01((start.x + end.x) / 2), y: clamp01((start.y + end.y) / 2) };
      configured = updateRadialGradientHandles(base, {
        center: centerPoint,
        edge: { x: clamp01(end.x), y: clamp01(end.y) },
      });
    }
    const next: GradientFill = { ...configured, stops };
    gradientRef.current = next;
    setFillGradient(next);
  };

  const startColor = fillGradient ? gradientStopColor(fillGradient, 0) : fill;
  const endColor = fillGradient ? gradientStopColor(fillGradient, 1) : fill;
  const gradientType = fillGradient?.type ?? 'linear';

  return (
    <Popover className="relative">
      <Popover.Button
        as={PanelButton}
        variant="unstyled"
        className={`h-9 w-9 p-1.5 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}
        style={previewStyle}
        title={title}
        aria-label={title}
      >
        <span className="sr-only">{title}</span>
        {ICONS.BLEND}
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-72 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-3">
          <div className="flex flex-col gap-3 text-[var(--text-primary)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{title}</span>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={handleToggle} className="accent-[var(--accent-primary)]" />
                <span>{toggleLabel}</span>
              </label>
            </div>

            {isActive ? (
              <>
                {fillStyle !== 'solid' && (
                  <div className="text-xs text-[var(--text-secondary)]">{solidHint}</div>
                )}

                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>{typeLabel}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`px-2 py-1 rounded-md border text-xs transition-colors ${gradientType === 'linear'
                        ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)] border-[var(--accent-primary)]/40'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}
                      onClick={() => handleTypeChange('linear')}
                    >
                      {linearTypeLabel}
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-1 rounded-md border text-xs transition-colors ${gradientType === 'radial'
                        ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)] border-[var(--accent-primary)]/40'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}
                      onClick={() => handleTypeChange('radial')}
                    >
                      {radialTypeLabel}
                    </button>
                  </div>
                </div>

                {fillGradient && (
                  <div
                    ref={editorRef}
                    className="relative h-32 w-full overflow-hidden rounded-lg border border-white/10"
                    style={editorStyle}
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-lg border border-white/5" />
                    {fillGradient.type === 'linear' && linearHandles && (
                      <>
                        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
                          <line
                            x1={linearHandles[0].x * 100}
                            y1={linearHandles[0].y * 100}
                            x2={linearHandles[1].x * 100}
                            y2={linearHandles[1].y * 100}
                            stroke="rgba(255,255,255,0.7)"
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                          />
                        </svg>
                        <button
                          type="button"
                          className={handleButtonClass('start')}
                          style={{ left: `${linearHandles[0].x * 100}%`, top: `${linearHandles[0].y * 100}%` }}
                          onPointerDown={handlePointerDown('start')}
                          aria-label={handleLabels.start}
                        />
                        <button
                          type="button"
                          className={handleButtonClass('end')}
                          style={{ left: `${linearHandles[1].x * 100}%`, top: `${linearHandles[1].y * 100}%` }}
                          onPointerDown={handlePointerDown('end')}
                          aria-label={handleLabels.end}
                        />
                      </>
                    )}
                    {fillGradient.type === 'radial' && radialHandles && (
                      <>
                        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
                          <line
                            x1={radialHandles.center.x * 100}
                            y1={radialHandles.center.y * 100}
                            x2={radialHandles.edge.x * 100}
                            y2={radialHandles.edge.y * 100}
                            stroke="rgba(255,255,255,0.7)"
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                          />
                          {radialHandles.radius > 0 && (
                            <circle
                              cx={radialHandles.center.x * 100}
                              cy={radialHandles.center.y * 100}
                              r={radialHandles.radius}
                              stroke="rgba(255,255,255,0.35)"
                              strokeWidth={1}
                              fill="none"
                            />
                          )}
                        </svg>
                        <button
                          type="button"
                          className={handleButtonClass('center')}
                          style={{ left: `${radialHandles.center.x * 100}%`, top: `${radialHandles.center.y * 100}%` }}
                          onPointerDown={handlePointerDown('center')}
                          aria-label={handleLabels.center}
                        />
                        <button
                          type="button"
                          className={handleButtonClass('edge')}
                          style={{ left: `${radialHandles.edge.x * 100}%`, top: `${radialHandles.edge.y * 100}%` }}
                          onPointerDown={handlePointerDown('edge')}
                          aria-label={handleLabels.edge}
                        />
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-[var(--text-secondary)]">{startLabel}</span>
                    <StopPicker
                      label={startLabel}
                      color={startColor}
                      onChange={(value) => handleStopChange(0, value)}
                      beginCoalescing={beginCoalescing}
                      endCoalescing={endCoalescing}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-[var(--text-secondary)]">{endLabel}</span>
                    <StopPicker
                      label={endLabel}
                      color={endColor}
                      onChange={(value) => handleStopChange(1, value)}
                      beginCoalescing={beginCoalescing}
                      endCoalescing={endCoalescing}
                    />
                  </div>
                  {fillGradient?.type === 'linear' && (
                    <NumericInput
                      label={angleLabel}
                      value={fillGradient.angle}
                      setValue={handleAngleChange}
                      min={0}
                      max={360}
                      step={1}
                      unit="°"
                      beginCoalescing={beginCoalescing}
                      endCoalescing={endCoalescing}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t('sideToolbar.gradientFill.disabled')}
              </div>
            )}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
});
