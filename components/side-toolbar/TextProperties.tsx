/**
 * 本文件定义了用于编辑文本属性的侧边栏 UI 组件。
 * 它包含字体大小和文本对齐的控件。
 */
import React, { useLayoutEffect, useRef } from 'react';
import { ICONS } from '../../constants';
import { NumericInput } from './NumericInput';

interface TextPropertiesProps {
  text: string;
  setText: (text: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  textAlign: 'left' | 'center' | 'right';
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

const ALIGN_OPTIONS: { name: 'left' | 'center' | 'right'; title: string; icon: JSX.Element }[] = [
  { name: 'left', title: '左对齐', icon: ICONS.ALIGN_LEFT },
  { name: 'center', title: '居中对齐', icon: ICONS.ALIGN_HORIZONTAL_CENTER },
  { name: 'right', title: '右对齐', icon: ICONS.ALIGN_RIGHT },
];

/**
 * 一个 React 组件，提供用于修改文本属性的 UI 控件。
 * @param props - 组件的 props，包括当前值和回调函数。
 */
export const TextProperties: React.FC<TextPropertiesProps> = ({
  text,
  setText,
  fontSize,
  setFontSize,
  textAlign,
  setTextAlign,
  beginCoalescing,
  endCoalescing,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };
  
  return (
    <div className="w-full flex flex-col items-center gap-4">
       <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onFocus={beginCoalescing}
        onBlur={endCoalescing}
        className="w-full p-2 bg-black/20 rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
        rows={1}
        placeholder="文本"
      />
      <NumericInput
        label="字号"
        value={fontSize}
        setValue={setFontSize}
        min={1}
        max={512}
        step={1}
        unit=""
        beginCoalescing={beginCoalescing}
        endCoalescing={endCoalescing}
      />
      
      <div className="flex flex-col items-center w-full" title="对齐">
        <div className="flex bg-black/20 rounded-md p-1 w-full">
          {ALIGN_OPTIONS.map(opt => (
            <button
              key={opt.name}
              title={opt.title}
              onClick={() => setTextAlign(opt.name)}
              className={`flex-1 flex justify-center items-center h-8 rounded-sm transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] ${textAlign === opt.name ? 'bg-[var(--accent-bg)] !text-[var(--accent-primary)]' : ''}`}
            >
              <div className="w-5 h-5">{opt.icon}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};