/**
 * 本文件定义了画布上的文本编辑器组件。
 * 当用户双击文本对象时，此组件会创建一个覆盖在 SVG 文本上方的
 * HTML textarea，以提供无缝的在画布上编辑体验。
 */

import React, { useLayoutEffect, useRef, useEffect } from 'react';
import type { TextData } from '../types';

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

  // 自动调整 textarea 高度以适应内容
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // 添加 1px 以防止在某些情况下出现滚动条
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 1}px`;
    }
  };

  // 在挂载和文本更新时调整高度
  useLayoutEffect(() => {
    adjustHeight();
  }, [path.text, viewTransform.scale]);

  // 在挂载时聚焦并选中文本
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);
  
  // 处理文本输入
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(e.target.value);
  };
  
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      onCommit();
    }
    // 按下 Enter 键（不带 Shift）时提交
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCommit();
    }
  };

  const { scale, translateX, translateY } = viewTransform;

  // 将 SVG 坐标转换为屏幕坐标并应用样式
  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${(path.y * scale) + translateY}px`,
    left: `${(path.x * scale) + translateX}px`,
    // 为宽度增加一点填充，以容纳光标
    minWidth: `${path.width * scale + 10}px`, 
    fontFamily: path.fontFamily || 'Excalifont',
    fontSize: `${path.fontSize * scale}px`,
    lineHeight: 1.25,
    color: path.color,
    textAlign: path.textAlign,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    padding: 0,
    margin: 0,
    // 将其置于所有画布元素之上
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