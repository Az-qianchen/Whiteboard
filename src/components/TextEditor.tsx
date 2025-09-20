/**
 * 本文件定义了画布内联文本编辑器组件。
 * 组件通过 SVG `foreignObject` 将 HTML textarea 直接嵌入画布坐标系中，
 * 以提供所见即所得的文本编辑体验。
 */

import React, { useLayoutEffect, useRef, useEffect, useCallback, useMemo } from 'react';
import type { TextData } from '../types';
import { getShapeTransformMatrix, matrixToString } from '@/lib/drawing/transform/matrix';

interface TextEditorProps {
  path: TextData;
  onUpdate: (newText: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  path,
  onUpdate,
  onCommit,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * 根据内容动态调整文本域高度，确保显示完整文本。
   */
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [adjustHeight, path.text, path.fontSize]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      onCommit();
    }
  };

  const stopPointerPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const transform = useMemo(() => matrixToString(getShapeTransformMatrix(path)), [path]);

  const width = Math.max(path.width, path.fontSize * 2);
  const height = Math.max(path.height, path.fontSize * 1.25);
  const fontFamily = path.fontFamily.includes(' ') ? `'${path.fontFamily}'` : path.fontFamily;

  return (
    <g transform={transform} className="pointer-events-none">
      <foreignObject
        x={path.x}
        y={path.y}
        width={width}
        height={height}
        className="pointer-events-auto"
      >
        <textarea
          ref={textareaRef}
          value={path.text}
          onChange={handleChange}
          onBlur={onCommit}
          onKeyDown={handleKeyDown}
          onPointerDown={stopPointerPropagation}
          onPointerMove={stopPointerPropagation}
          onPointerUp={stopPointerPropagation}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: '100%',
            resize: 'none',
            border: 'none',
            outline: 'none',
            padding: 0,
            margin: 0,
            background: 'transparent',
            color: path.color,
            fontFamily,
            fontSize: `${path.fontSize}px`,
            lineHeight: 1.25,
            textAlign: path.textAlign,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
          }}
        />
      </foreignObject>
    </g>
  );
};