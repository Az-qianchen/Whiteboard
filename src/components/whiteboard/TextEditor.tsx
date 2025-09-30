/**
 * 文本编辑器覆盖层，用于在画布上方编辑文本图形。
 */
import React, { useEffect, useLayoutEffect, useRef } from 'react';

interface TextEditorOverlayProps {
  editor: {
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    color: string;
  };
  viewTransform: { scale: number; translateX: number; translateY: number };
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

/**
 * 在画布上显示一个绝对定位的 textarea，用于编辑文本形状内容。
 */
export function TextEditor({ editor, viewTransform, onChange, onCommit, onCancel }: TextEditorOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { scale, translateX, translateY } = viewTransform;

  const left = translateX + editor.x * scale;
  const top = translateY + editor.y * scale;
  const fontSizePx = editor.fontSize * scale;
  const lineHeight = editor.lineHeight;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [editor.id]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.width = 'auto';

    const padding = 12;
    const minWidth = fontSizePx * 4;
    const minHeight = fontSizePx * lineHeight;

    const nextWidth = Math.max(minWidth, textarea.scrollWidth + padding);
    const nextHeight = Math.max(minHeight, textarea.scrollHeight + padding);

    textarea.style.width = `${nextWidth}px`;
    textarea.style.height = `${nextHeight}px`;
  }, [editor.text, fontSizePx, lineHeight]);

  return (
    <div
      className="absolute z-40"
      style={{ left, top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={editor.text}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onCommit()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          } else if ((event.key === 'Enter' && (event.metaKey || event.ctrlKey))) {
            event.preventDefault();
            onCommit();
          }
        }}
        spellCheck={false}
        className="min-w-[120px] resize-none rounded-md border border-[var(--accent-primary)] bg-[var(--ui-panel-bg)]/90 px-3 py-2 text-[var(--text-primary)] shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        style={{
          fontSize: fontSizePx,
          lineHeight,
          fontFamily: editor.fontFamily,
          color: editor.color,
        }}
      />
    </div>
  );
}
