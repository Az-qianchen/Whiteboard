import React from 'react';

interface TextEditorProps {
  editor: {
    pathId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    textAlign: 'left' | 'center' | 'right';
  };
  viewTransform: { scale: number; translateX: number; translateY: number };
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

const MIN_HEIGHT = 16;

export const TextEditor: React.FC<TextEditorProps> = ({ editor, viewTransform, onChange, onCommit, onCancel }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const { scale, translateX, translateY } = viewTransform;

  const worldWidth = Math.max(editor.width, 4);
  const worldHeight = Math.max(editor.height, editor.lineHeight, MIN_HEIGHT);

  const left = editor.x * scale + translateX;
  const top = editor.y * scale + translateY;

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [editor.pathId]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="absolute z-40"
      style={{
        left,
        top,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: worldWidth,
      }}
    >
      <textarea
        ref={textareaRef}
        value={editor.text}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded-md border border-[var(--accent-primary)] bg-[var(--bg-color)] p-2 text-[var(--text-primary)] shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        style={{
          width: worldWidth,
          height: worldHeight,
          fontSize: `${editor.fontSize}px`,
          fontFamily: editor.fontFamily,
          lineHeight: `${editor.lineHeight}px`,
          textAlign: editor.textAlign,
        }}
        data-testid="text-editor"
      />
    </div>
  );
};
