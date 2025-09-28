import React, { useEffect, useMemo, useRef, useCallback, type CSSProperties } from 'react';
import { useAppContext } from '@/context/AppContext';
import { measureTextDimensions } from '@/lib/text';

export function TextEditorOverlay(): JSX.Element | null {
  const {
    textEditor,
    updateTextEditor,
    commitTextEditor,
    cancelTextEditor,
    handleSetTool,
    tool,
    viewTransform: canvasViewTransform,
  } = useAppContext();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canvasTransform = useMemo<CSSProperties>(() => {
    const { scale = 1, translateX = 0, translateY = 0 } = canvasViewTransform ?? {};
    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      transformOrigin: '0 0',
    };
  }, [canvasViewTransform]);

  const metrics = useMemo(() => {
    if (!textEditor) {
      return null;
    }
    return measureTextDimensions(textEditor.text, {
      fontFamily: textEditor.fontFamily,
      fontSize: textEditor.fontSize,
      lineHeight: textEditor.lineHeight,
      paddingX: textEditor.paddingX,
      paddingY: textEditor.paddingY,
    });
  }, [textEditor]);

  useEffect(() => {
    if (!textEditor) {
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const focusHandle = requestAnimationFrame(() => {
      textarea.focus();
      if (textEditor.mode === 'create') {
        textarea.select();
      } else {
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      }
    });
    return () => cancelAnimationFrame(focusHandle);
  }, [textEditor?.mode, textEditor?.pathId]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateTextEditor(event.target.value);
  }, [updateTextEditor]);

  const finishEditing = useCallback(() => {
    const id = commitTextEditor();
    if (tool === 'text' || id !== null) {
      handleSetTool('selection');
    }
  }, [commitTextEditor, handleSetTool, tool]);

  const handleBlur = useCallback(() => {
    if (!textEditor) {
      return;
    }
    finishEditing();
  }, [finishEditing, textEditor]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelTextEditor();
      handleSetTool('selection');
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      finishEditing();
    }
  }, [cancelTextEditor, finishEditing, handleSetTool]);

  if (!textEditor || !metrics) {
    return null;
  }

  const width = metrics.width;
  const height = metrics.height;
  const centerX = width / 2;
  const centerY = height / 2;

  const skewXDeg = Math.atan(textEditor.skewX) * (180 / Math.PI);
  const skewYDeg = Math.atan(textEditor.skewY) * (180 / Math.PI);

  const shapeTransforms: string[] = [
    `translate(${centerX}px, ${centerY}px)`,
  ];

  if (textEditor.rotation) {
    shapeTransforms.push(`rotate(${textEditor.rotation}rad)`);
  }
  if (textEditor.skewX) {
    shapeTransforms.push(`skewX(${skewXDeg}deg)`);
  }
  if (textEditor.skewY) {
    shapeTransforms.push(`skewY(${skewYDeg}deg)`);
  }
  if (textEditor.scaleX !== 1 || textEditor.scaleY !== 1) {
    shapeTransforms.push(`scale(${textEditor.scaleX}, ${textEditor.scaleY})`);
  }
  shapeTransforms.push(`translate(${-centerX}px, ${-centerY}px)`);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div className="absolute inset-0 pointer-events-none" style={canvasTransform}>
        <div
          className="pointer-events-none absolute"
          style={{
            left: textEditor.x,
            top: textEditor.y,
            width,
            height,
            transformOrigin: '0 0',
            transform: shapeTransforms.join(' '),
          }}
        >
          <textarea
            ref={textareaRef}
            value={textEditor.text}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="pointer-events-auto w-full h-full resize-none border border-dashed border-[var(--accent-primary)] bg-[var(--ui-panel-bg)]/80 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] rounded-md shadow-lg backdrop-blur-sm"
            style={{
              padding: `${textEditor.paddingY}px ${textEditor.paddingX}px`,
              fontSize: `${textEditor.fontSize}px`,
              fontFamily: textEditor.fontFamily,
              lineHeight: textEditor.lineHeight,
              textAlign: textEditor.textAlign,
              color: textEditor.color,
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
            }}
          />
        </div>
      </div>
    </div>
  );
}
