import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Point } from '@/types';
import { measureTextBlock } from '@/lib/text';

interface TextEditorOverlayProps {
  editor: {
    id: string | null;
    mode: 'create' | 'edit';
    text: string;
    fontFamily: string;
    fontSize: number;
    textAlign: 'left' | 'center' | 'right';
    lineHeight: number;
    anchor: Point;
    color: string;
    opacity: number;
  };
  viewTransform: {
    scale: number;
    translateX: number;
    translateY: number;
  };
  onChange: (value: string) => void;
  onCommit: (options?: { cancel?: boolean; preserveTool?: boolean }) => void;
  onCancel: (options?: { preserveTool?: boolean }) => void;
}

const MIN_TEXT_WIDTH_FACTOR = 0.6;

export function TextEditorOverlay({
  editor,
  viewTransform,
  onChange,
  onCommit,
  onCancel,
}: TextEditorOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasSubmittedRef = useRef(false);

  const metrics = useMemo(() => {
    return measureTextBlock(editor.text || '', editor.fontFamily, editor.fontSize, editor.lineHeight);
  }, [editor.fontFamily, editor.fontSize, editor.lineHeight, editor.text]);

  const scale = viewTransform.scale || 1;
  const anchor = editor.anchor as Point | undefined;
  const safeAnchorX = anchor?.x ?? 0;
  const safeAnchorY = anchor?.y ?? 0;
  const width = useMemo(() => {
    const minWidth = editor.fontSize * MIN_TEXT_WIDTH_FACTOR;
    return Math.max(metrics.width, minWidth);
  }, [editor.fontSize, metrics.width]);
  const height = useMemo(() => {
    const minHeight = editor.fontSize * editor.lineHeight;
    return Math.max(metrics.height, minHeight);
  }, [editor.fontSize, editor.lineHeight, metrics.height]);

  const widthPx = width * scale;
  const heightPx = height * scale;
  const anchorX = safeAnchorX * scale + viewTransform.translateX;
  const anchorY = safeAnchorY * scale + viewTransform.translateY;
  const alignOffsetPx = editor.textAlign === 'center'
    ? widthPx / 2
    : editor.textAlign === 'right'
      ? widthPx
      : 0;

  useEffect(() => {
    hasSubmittedRef.current = false;
    const node = textareaRef.current;
    if (!node) {
      return;
    }
    const raf = requestAnimationFrame(() => {
      node.focus({ preventScroll: true });
      if (editor.mode === 'edit') {
        node.select();
      } else {
        const length = node.value.length;
        node.setSelectionRange(length, length);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [editor.id, editor.mode]);

  const handleCommit = useCallback((options?: { cancel?: boolean }) => {
    if (hasSubmittedRef.current) {
      return;
    }
    hasSubmittedRef.current = true;
    if (options?.cancel) {
      onCancel();
      return;
    }
    onCommit();
  }, [onCancel, onCommit]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  }, [onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCommit({ cancel: true });
      return;
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      handleCommit();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const node = textareaRef.current;
      if (!node) return;
      const { selectionStart, selectionEnd, value } = node;
      const nextValue = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
      onChange(nextValue);
      requestAnimationFrame(() => {
        const pos = selectionStart + 1;
        node.setSelectionRange(pos, pos);
      });
    }
  }, [handleCommit, onChange]);

  const handleBlur = useCallback(() => {
    handleCommit();
  }, [handleCommit]);

  const color = editor.color;

  return (
    <div
      className="pointer-events-none absolute z-40"
      style={{
        left: anchorX - alignOffsetPx,
        top: anchorY,
      }}
    >
      <textarea
        ref={textareaRef}
        className="pointer-events-auto bg-transparent outline-none resize-none whitespace-pre-wrap break-words"
        style={{
          width: widthPx,
          height: heightPx,
          fontFamily: editor.fontFamily,
          fontSize: editor.fontSize * scale,
          lineHeight: editor.lineHeight,
          color,
          opacity: editor.opacity,
          border: '1px solid rgba(255,255,255,0.4)',
          padding: 0,
          margin: 0,
          textAlign: editor.textAlign,
          caretColor: color,
          backgroundColor: 'rgba(17, 24, 39, 0.1)',
          overflow: 'hidden',
        }}
        spellCheck={false}
        value={editor.text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        aria-label="Text editor"
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        data-testid="text-editor-overlay"
      />
    </div>
  );
}
