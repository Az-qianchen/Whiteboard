import React from 'react';
import type { TextEditorState } from '@/hooks/useAppStore';
import {
  createTranslationMatrix,
  createRotationMatrix,
  createScaleMatrix,
  createSkewMatrix,
  multiplyMatrices,
  identityMatrix,
  type TransformMatrix,
} from '@/lib/drawing/transform/matrix';

type ViewTransformSnapshot = {
  viewTransform: {
    scale: number;
    translateX: number;
    translateY: number;
  };
};

type TextEditorOverlayProps = {
  editor: TextEditorState;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  viewTransform: ViewTransformSnapshot;
};

const buildCombinedMatrix = (editor: TextEditorState, view: ViewTransformSnapshot): TransformMatrix => {
  const translation = createTranslationMatrix(editor.position.x, editor.position.y);
  const cx = editor.position.x + editor.width / 2;
  const cy = editor.position.y + editor.height / 2;

  let shapeMatrix = identityMatrix;
  shapeMatrix = multiplyMatrices(shapeMatrix, createTranslationMatrix(cx, cy));
  if (editor.rotation) {
    shapeMatrix = multiplyMatrices(shapeMatrix, createRotationMatrix(editor.rotation));
  }
  if (editor.skewX || editor.skewY) {
    shapeMatrix = multiplyMatrices(shapeMatrix, createSkewMatrix(editor.skewX, editor.skewY));
  }
  if (editor.scaleX !== 1 || editor.scaleY !== 1) {
    shapeMatrix = multiplyMatrices(shapeMatrix, createScaleMatrix(editor.scaleX, editor.scaleY));
  }
  shapeMatrix = multiplyMatrices(shapeMatrix, createTranslationMatrix(-cx, -cy));

  const worldMatrix = multiplyMatrices(shapeMatrix, translation);
  const { scale, translateX, translateY } = view.viewTransform;
  const viewMatrix: TransformMatrix = {
    a: scale,
    b: 0,
    c: 0,
    d: scale,
    e: translateX,
    f: translateY,
  };

  return multiplyMatrices(viewMatrix, worldMatrix);
};

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  editor,
  onChange,
  onCommit,
  onCancel,
  viewTransform,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus({ preventScroll: true });
    if (editor.isExisting) {
      textarea.select();
    } else {
      const length = editor.text.length;
      textarea.setSelectionRange(length, length);
    }
  }, [editor.id, editor.isExisting, editor.text.length]);

  const matrix = React.useMemo(
    () => buildCombinedMatrix(editor, viewTransform),
    [editor, viewTransform]
  );

  const width = Math.max(editor.width, 1);
  const height = Math.max(editor.height, editor.fontSize);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      event.stopPropagation();
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        onCommit();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    },
    [onCancel, onCommit]
  );

  const handleBlur = React.useCallback(() => {
    onCommit();
  }, [onCommit]);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${width}px`,
    height: `${height}px`,
    transformOrigin: '0 0',
    transform: `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`,
    pointerEvents: 'auto',
    zIndex: 40,
    backgroundColor: 'rgba(33, 37, 41, 0.2)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '4px',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
    overflow: 'hidden',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontFamily: editor.fontFamily,
    fontSize: `${editor.fontSize}px`,
    lineHeight: editor.lineHeight,
    color: editor.color,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    padding: 0,
    margin: 0,
    textAlign: editor.align,
    whiteSpace: 'pre',
    caretColor: editor.color,
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle} onPointerDown={event => event.stopPropagation()}>
      <textarea
        ref={textareaRef}
        value={editor.text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={textareaStyle}
        spellCheck={false}
        wrap="off"
        data-testid="text-editor-overlay"
      />
    </div>
  );
};

export default TextEditorOverlay;
