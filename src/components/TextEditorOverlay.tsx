import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { TextEditorState } from '@/types';

interface TextEditorOverlayProps {
  editor: TextEditorState;
  viewTransform: { scale: number; translateX: number; translateY: number };
  updateEditor: (updater: Partial<TextEditorState> | ((prev: TextEditorState) => TextEditorState)) => void;
  commitEditor: () => void;
  cancelEditor: () => void;
}

const DIMENSION_EPSILON = 0.5;

export function TextEditorOverlay({
  editor,
  viewTransform,
  updateEditor,
  commitEditor,
  cancelEditor,
}: TextEditorOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const skipCommitRef = useRef(false);

  const scale = useMemo(() => {
    if (!Number.isFinite(viewTransform.scale) || viewTransform.scale <= 0) {
      return 1;
    }
    return viewTransform.scale;
  }, [viewTransform.scale]);

  const position = useMemo(() => {
    const width = Math.max(editor.width * scale, 1);
    const baseHeight = Math.max(editor.height * scale, editor.lineHeight * scale, 1);
    const left = viewTransform.translateX + editor.x * scale;
    const top = viewTransform.translateY + editor.y * scale;
    return { left, top, width, height: baseHeight };
  }, [editor.height, editor.lineHeight, editor.width, editor.x, editor.y, scale, viewTransform.translateX, viewTransform.translateY]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.focus();
    const length = textarea.value.length;
    textarea.setSelectionRange(length, length);
  }, [editor.id]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    const minHeight = Math.max(editor.lineHeight * scale, 1);
    const nextHeight = Math.max(textarea.scrollHeight, minHeight);
    textarea.style.height = `${nextHeight}px`;
  }, [editor.text, editor.lineHeight, scale]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      const worldWidth = Math.max(width / scale, 1);
      const worldHeight = Math.max(height / scale, editor.lineHeight);
      updateEditor(prev => {
        const widthChanged = Math.abs(prev.width - worldWidth) > DIMENSION_EPSILON;
        const heightChanged = Math.abs(prev.height - worldHeight) > DIMENSION_EPSILON;
        if (!widthChanged && !heightChanged) {
          return prev;
        }
        return {
          ...prev,
          width: widthChanged ? worldWidth : prev.width,
          height: heightChanged ? worldHeight : prev.height,
        };
      });
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [editor.lineHeight, scale, updateEditor]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const minHeight = Math.max(editor.lineHeight * scale, 1);
      const nextHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = `${nextHeight}px`;
    }
    updateEditor(prev => ({ ...prev, text: nextValue }));
  };

  const handleCommit = () => {
    skipCommitRef.current = true;
    commitEditor();
  };

  const handleCancel = () => {
    skipCommitRef.current = true;
    cancelEditor();
  };

  const handleBlur = () => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      return;
    }
    commitEditor();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleCommit();
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      <textarea
        ref={textareaRef}
        value={editor.text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        spellCheck={false}
        className="pointer-events-auto absolute border border-dashed border-white/40 focus:outline-none resize whitespace-pre-wrap break-words shadow-sm rounded"
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
          width: `${position.width}px`,
          minWidth: '40px',
          height: `${position.height}px`,
          minHeight: `${Math.max(editor.lineHeight * scale, 1)}px`,
          color: editor.color,
          opacity: editor.opacity,
          fontFamily: editor.fontFamily,
          fontSize: `${editor.fontSize * scale}px`,
          lineHeight: `${editor.lineHeight * scale}px`,
          textAlign: editor.textAlign,
          boxSizing: 'border-box',
          padding: `${Math.max(2, Math.min(6, 6 * scale))}px`,
          backgroundColor: 'rgba(17, 24, 39, 0.55)',
        }}
      />
    </div>
  );
}

