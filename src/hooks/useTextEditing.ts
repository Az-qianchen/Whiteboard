import { useMemo, useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import type { TextData } from '@/types';
import { layoutText, resolveLineHeight } from '@/lib/text';
import {
  createTranslationMatrix,
  getShapeTransformMatrix,
  matrixToCssString,
  multiplyMatrices,
} from '@/lib/drawing/transform/matrix';

interface UseTextEditingOptions {
  path: TextData;
  draft: string;
  isNew: boolean;
  viewTransform: { scale: number; translateX: number; translateY: number };
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onCanvasWheel: (event: WheelEvent) => void;
}

export function useTextEditing({
  path,
  draft,
  isNew,
  viewTransform,
  onChange,
  onCommit,
  onCancel,
  onCanvasWheel,
}: UseTextEditingOptions) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const normalizedDraft = draft.replace(/\r/g, '');
  const baseLineHeight = useMemo(() => resolveLineHeight(path.fontSize, path.lineHeight), [path.fontSize, path.lineHeight]);
  const widthConstraint = useMemo(() => (!isNew && path.width > 0 ? path.width : undefined), [isNew, path.width]);

  const layout = useMemo(() => layoutText(normalizedDraft, path.fontSize, path.fontFamily, baseLineHeight, path.fontWeight, widthConstraint), [normalizedDraft, path.fontSize, path.fontFamily, baseLineHeight, path.fontWeight, widthConstraint]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    const rafId = requestAnimationFrame(() => {
      element.focus();
      element.select();
    });
    return () => cancelAnimationFrame(rafId);
  }, [path.id]);

  const width = Math.max(!isNew && path.width > 0 ? path.width : layout.width, layout.width, 1);
  const height = Math.max(path.height, layout.height, 1);

  const transform = useMemo(() => {
    const viewMatrix = { a: viewTransform.scale, b: 0, c: 0, d: viewTransform.scale, e: viewTransform.translateX, f: viewTransform.translateY };
    const translation = createTranslationMatrix(path.x, path.y);
    const shapeMatrix = getShapeTransformMatrix({ ...path, x: 0, y: 0 });
    const localMatrix = multiplyMatrices(translation, shapeMatrix);
    return matrixToCssString(multiplyMatrices(viewMatrix, localMatrix));
  }, [viewTransform.scale, viewTransform.translateX, viewTransform.translateY, path]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onCommit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }, [onCommit, onCancel]);

  const onWheel = useCallback((event: React.WheelEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) {
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const canvasSvg = document.querySelector<SVGSVGElement>('[data-whiteboard-canvas="true"]');
    const canvasContainer = canvasSvg?.parentElement as HTMLDivElement | null;
    if (!canvasContainer) return;
    onCanvasWheel({ ...event.nativeEvent, ctrlKey: event.ctrlKey || event.metaKey, currentTarget: canvasContainer, target: canvasSvg ?? canvasContainer } as unknown as WheelEvent);
  }, [onCanvasWheel]);

  const style = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width,
    height,
    transformOrigin: 'top left',
    transformBox: 'border-box',
    transform,
    boxSizing: 'border-box',
    color: path.color,
    fontSize: `${path.fontSize}px`,
    lineHeight: `${layout.lineHeight}px`,
    fontFamily: path.fontFamily,
    fontWeight: path.fontWeight ?? 400,
    textAlign: path.textAlign as React.CSSProperties['textAlign'],
    caretColor: path.color,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }), [width, height, transform, path.color, path.fontSize, path.fontFamily, path.fontWeight, path.textAlign, layout.lineHeight]);

  return { textareaRef, style, onKeyDown, onWheel, onBlur: onCommit, onChange };
}
