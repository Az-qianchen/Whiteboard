import React, { useEffect, useMemo, useRef } from 'react';
import { measureTextMetrics } from '@/lib/text';

interface ViewTransformState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface TextEditorOverlayProps {
  editor: {
    anchor: { x: number; y: number };
    text: string;
    fontFamily: string;
    fontSize: number;
    textAlign: 'left' | 'center' | 'right';
    lineHeight: number;
    color: string;
    opacity: number;
    blur?: number;
    shadowEnabled?: boolean;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowBlur?: number;
    shadowColor?: string;
  };
  viewTransform: ViewTransformState;
  onChange: (text: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  hint: string;
}

export function TextEditorOverlay({
  editor,
  viewTransform,
  onChange,
  onCommit,
  onCancel,
  placeholder,
  confirmLabel,
  cancelLabel,
  hint,
}: TextEditorOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editor.anchor.x, editor.anchor.y]);

  const metrics = useMemo(() => {
    return measureTextMetrics(editor.text || ' ', editor.fontSize, editor.fontFamily, editor.lineHeight);
  }, [editor.fontFamily, editor.fontSize, editor.lineHeight, editor.text]);

  const scale = viewTransform.scale || 1;
  const width = Math.max(metrics.width, editor.fontSize * 2);
  const height = Math.max(metrics.height, editor.fontSize * editor.lineHeight);
  const leftWorld = editor.textAlign === 'center'
    ? editor.anchor.x - width / 2
    : editor.textAlign === 'right'
      ? editor.anchor.x - width
      : editor.anchor.x;

  const left = viewTransform.translateX + leftWorld * scale;
  const top = viewTransform.translateY + editor.anchor.y * scale;

  const textareaStyle: React.CSSProperties = {
    width: width * scale,
    minHeight: Math.max(height * scale, 40),
    color: editor.color,
    opacity: editor.opacity,
    fontFamily: editor.fontFamily,
    fontSize: editor.fontSize * scale,
    lineHeight: `${editor.lineHeight * editor.fontSize * scale}px`,
    filter: editor.blur ? `blur(${editor.blur * scale}px)` : undefined,
    textAlign: editor.textAlign,
    boxShadow: editor.shadowEnabled
      ? `${(editor.shadowOffsetX ?? 0) * scale}px ${(editor.shadowOffsetY ?? 0) * scale}px ${(editor.shadowBlur ?? 0) * scale}px ${editor.shadowColor ?? 'rgba(0,0,0,0.4)'}`
      : undefined,
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="absolute z-40 flex flex-col gap-2 rounded-xl border border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)]/95 p-3 shadow-xl"
      style={{ left, top }}
      onPointerDown={event => event.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={editor.text}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-[var(--text-primary)] outline-none"
        style={textareaStyle}
      />
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
        <span>{hint}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-[var(--ui-element-bg-hover)] px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded-md bg-[var(--accent-bg)] px-2 py-1 text-[var(--accent-primary)]"
            onClick={onCommit}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
