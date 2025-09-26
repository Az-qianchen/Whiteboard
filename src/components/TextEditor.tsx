/**
 * Canvas text editor overlay that mirrors the position of a text shape and
 * provides a native textarea for editing content inline.
 */
import React, { useLayoutEffect, useRef, useEffect } from 'react';
import type { TextData } from '../types';
import { DEFAULT_TEXT_FONT_FAMILY, DEFAULT_TEXT_LINE_HEIGHT } from '@/constants';

interface TextEditorProps {
  path: TextData;
  viewTransform: { scale: number; translateX: number; translateY: number };
  onUpdate: (newText: string) => void;
  onCommit: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  path,
  viewTransform,
  onUpdate,
  onCommit,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 1}px`;
  };

  useLayoutEffect(() => {
    adjustHeight();
  }, [path.text, viewTransform.scale]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCommit();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCommit();
    }
  };

  const { scale, translateX, translateY } = viewTransform;
  const family = path.fontFamily || DEFAULT_TEXT_FONT_FAMILY;
  const familyWithQuotes = family.includes(' ') ? `'${family}'` : family;
  const lineHeightRatio = path.lineHeight ? path.lineHeight / path.fontSize : DEFAULT_TEXT_LINE_HEIGHT;
  const minWidth = Math.max(path.width, path.fontSize * 0.6);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${path.y * scale + translateY}px`,
    left: `${path.x * scale + translateX}px`,
    minWidth: `${minWidth * scale + 10}px`,
    fontFamily: familyWithQuotes,
    fontSize: `${path.fontSize * scale}px`,
    lineHeight: lineHeightRatio,
    color: path.color,
    textAlign: path.textAlign,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    padding: 0,
    margin: 0,
    zIndex: 100,
  };

  return (
    <textarea
      ref={textareaRef}
      value={path.text}
      onChange={handleChange}
      onBlur={onCommit}
      onKeyDown={handleKeyDown}
      style={style}
      spellCheck="false"
    />
  );
};
