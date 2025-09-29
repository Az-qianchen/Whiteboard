import React, { useEffect, useMemo, useRef, useState } from 'react';
import { measureTextSize } from '@/lib/text';

interface TextEditorOverlayProps {
  editor: {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    fontFamily: string;
    fontSize: number;
    textAlign: 'left' | 'center' | 'right';
    rotation: number;
    lineHeight: number;
  };
  color: string;
  viewTransform: { scale: number; translateX: number; translateY: number };
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

const MIN_WIDTH_FACTOR = 4;

export function TextEditorOverlay({ editor, color, viewTransform, onSubmit, onCancel }: TextEditorOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState<string>(editor.text);

  useEffect(() => {
    setValue(editor.text);
  }, [editor.text]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const measured = useMemo(() => {
    return measureTextSize(value || ' ', {
      fontFamily: editor.fontFamily,
      fontSize: editor.fontSize,
      lineHeight: editor.lineHeight / editor.fontSize,
    });
  }, [value, editor.fontFamily, editor.fontSize, editor.lineHeight]);

  const scale = viewTransform.scale || 1;
  const baseWidth = Math.max(editor.width, measured.width, editor.fontSize * MIN_WIDTH_FACTOR);
  const baseHeight = Math.max(editor.height, measured.height);

  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;

  const anchorX = editor.textAlign === 'center'
    ? editor.x + editor.width / 2
    : editor.textAlign === 'right'
      ? editor.x + editor.width
      : editor.x;

  const left = (() => {
    const anchorScreenX = viewTransform.translateX + anchorX * scale;
    if (editor.textAlign === 'center') {
      return anchorScreenX - scaledWidth / 2;
    }
    if (editor.textAlign === 'right') {
      return anchorScreenX - scaledWidth;
    }
    return viewTransform.translateX + editor.x * scale;
  })();

  const top = viewTransform.translateY + editor.y * scale;
  const rotationDeg = (editor.rotation ?? 0) * (180 / Math.PI);
  const transformOrigin = editor.textAlign === 'center' ? '50% 0%' : editor.textAlign === 'right' ? '100% 0%' : '0% 0%';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      onSubmit(value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    onSubmit(value);
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      spellCheck={false}
      style={{
        position: 'absolute',
        left,
        top,
        width: scaledWidth,
        height: scaledHeight,
        fontFamily: editor.fontFamily,
        fontSize: editor.fontSize * scale,
        lineHeight: `${editor.lineHeight * scale}px`,
        color,
        padding: 8 * scale,
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(0,0,0,0.2)',
        borderRadius: 4 * scale,
        resize: 'none',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
        textAlign: editor.textAlign,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        zIndex: 50,
        transform: rotationDeg !== 0 ? `rotate(${rotationDeg}deg)` : undefined,
        transformOrigin,
      }}
    />
  );
}

