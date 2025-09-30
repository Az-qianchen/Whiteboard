import React, { useEffect, useMemo, useRef } from 'react';
import type { TextEditorState } from '@/types';

interface TextEditorOverlayProps {
  editor: TextEditorState | null;
  onChange: (text: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  viewTransform: { scale: number; translateX: number; translateY: number };
}

const MIN_TEXT_WIDTH = 160;
const PADDING_PX = 8;

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  editor,
  onChange,
  onCommit,
  onCancel,
  viewTransform,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.focus({ preventScroll: true });
    const length = editor.text.length;
    textarea.setSelectionRange(length, length);
  }, [editor]);

  const style = useMemo(() => {
    if (!editor) {
      return {};
    }
    const scale = viewTransform.scale;
    const baseLeft = viewTransform.translateX + editor.x * scale;
    const baseTop = viewTransform.translateY + editor.y * scale;
    const effectiveWidth = Math.max(editor.width || MIN_TEXT_WIDTH, MIN_TEXT_WIDTH);
    const padding = PADDING_PX * scale;
    return {
      left: baseLeft,
      top: baseTop,
      width: `${effectiveWidth * scale}px`,
      minWidth: `${MIN_TEXT_WIDTH * scale}px`,
      fontSize: `${editor.fontSize * scale}px`,
      lineHeight: `${editor.fontSize * editor.lineHeight * scale}px`,
      padding: `${padding}px`,
      color: editor.color,
      transformOrigin: 'top left' as const,
      textAlign: editor.textAlign as React.CSSProperties['textAlign'],
    };
  }, [editor, viewTransform.scale, viewTransform.translateX, viewTransform.translateY]);

  if (!editor) {
    return null;
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLTextAreaElement> = () => {
    onCommit();
  };

  return (
    <textarea
      ref={textareaRef}
      value={editor.text}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      spellCheck={false}
      rows={Math.max(1, editor.text.split(/\r?\n/).length)}
      className="absolute bg-[var(--ui-panel-bg)] text-[var(--text-primary)] shadow-lg border border-[var(--ui-panel-border)] rounded-lg outline-none resize-none whitespace-pre-wrap"
      style={style}
    />
  );
};
