/**
 * Text editor overlay rendered above the canvas for in-place text editing.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import type { TextAlignment } from '@/types';
import { buildFontString } from '@/lib/text';

interface TextEditorOverlayProps {
  isOpen: boolean;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textAlign: TextAlignment;
  color: string;
  canvasBounds: DOMRect | null;
  viewTransform: { scale: number; translateX: number; translateY: number };
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  isOpen,
  text,
  x,
  y,
  width,
  height,
  fontFamily,
  fontSize,
  lineHeight,
  textAlign,
  color,
  canvasBounds,
  viewTransform,
  onChange,
  onCommit,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handle = window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    });
    return () => window.cancelAnimationFrame(handle);
  }, [isOpen]);

  const style = useMemo(() => {
    if (!isOpen || !canvasBounds) {
      return undefined;
    }
    const { scale, translateX, translateY } = viewTransform;
    const screenX = canvasBounds.left + translateX + x * scale;
    const screenY = canvasBounds.top + translateY + y * scale;
    const screenWidth = Math.max(width, fontSize) * scale;
    const screenHeight = Math.max(height, fontSize * lineHeight) * scale;

    return {
      position: 'fixed' as const,
      top: `${screenY}px`,
      left: `${screenX}px`,
      width: `${screenWidth}px`,
      minHeight: `${screenHeight}px`,
      font: buildFontString(fontSize * scale, fontFamily),
      lineHeight: `${lineHeight * fontSize * scale}px`,
      color,
      textAlign: textAlign as React.CSSProperties['textAlign'],
      zIndex: 200,
    };
  }, [canvasBounds, color, fontFamily, fontSize, height, isOpen, lineHeight, viewTransform, width, x, y, textAlign]);

  if (!isOpen || !canvasBounds || !style) {
    return null;
  }

  return (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onCommit();
        }
      }}
      style={{
        ...style,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid var(--accent-primary)',
        borderRadius: '4px',
        padding: '4px',
        color,
        resize: 'none',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
      }}
    />
  );
};
