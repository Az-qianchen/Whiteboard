import React, { useEffect, useMemo, useRef } from 'react';
import type { TextAlign } from '@/types';

interface ViewTransformState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface EditorState {
  pathId: string;
  draft: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textAlign: TextAlign;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextEditorProps {
  editor: EditorState;
  viewTransform: ViewTransformState;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ editor, viewTransform, onChange, onCommit, onCancel }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.select();
    }
  }, [editor.pathId]);

  const style = useMemo(() => {
    const { scale, translateX, translateY } = viewTransform;
    const left = editor.x * scale + translateX;
    const top = editor.y * scale + translateY;
    const width = Math.max(editor.width * scale, editor.fontSize * scale * 2);
    const height = Math.max(editor.height * scale, editor.fontSize * scale * editor.lineHeight);
    const fontSize = Math.max(editor.fontSize * scale, 8);
    const padding = Math.max(4, 4 * scale);

    return {
      position: 'absolute' as const,
      left,
      top,
      width,
      height,
      minHeight: height,
      padding: `${padding}px ${padding * 1.5}px`,
      fontFamily: editor.fontFamily,
      fontSize,
      lineHeight: editor.lineHeight,
      color: editor.color,
      backgroundColor: 'rgba(33, 37, 41, 0.92)',
      border: '1px solid var(--accent-primary)',
      borderRadius: 8,
      outline: 'none',
      resize: 'none' as const,
      whiteSpace: 'pre-wrap' as const,
      overflowWrap: 'break-word' as const,
      overflow: 'hidden' as const,
      textAlign: editor.textAlign as React.CSSProperties['textAlign'],
      zIndex: 60,
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.35)',
      transformOrigin: 'top left',
      backgroundClip: 'padding-box' as const,
    } satisfies React.CSSProperties;
  }, [editor, viewTransform]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={editor.draft}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      spellCheck={false}
      aria-label="编辑文本"
      style={style}
    />
  );
};
