/**
 * 验证 LayersProvider 在非路径状态更新时不会触发使用 useLayers 的组件重新渲染。
 */
import React, { useMemo } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider, useAppContext } from '@/context/AppContext';
import { LayersProvider, useLayers, type LayersContextValue } from '@/lib/layers-context';

describe('layers-context', () => {
  it('keeps useLayers consumers stable when toggling non-path UI state', async () => {
    const observedValues: LayersContextValue[] = [];

    const TestConsumer = React.memo(() => {
      const value = useLayers();
      observedValues.push(value);
      return null;
    });

    const Harness: React.FC = () => {
      const store = useAppContext();
      const layersValue = useMemo<LayersContextValue>(() => ({
        frames: store.frames,
        currentFrameIndex: store.currentFrameIndex,
        setCurrentFrameIndex: store.setCurrentFrameIndex,
        paths: store.paths,
        setPaths: store.setPaths,
        handleLoadFile: store.handleLoadFile,
        handleDeletePaths: store.handleDeletePaths,
        togglePathsProperty: store.togglePathsProperty,
        toggleGroupCollapse: store.toggleGroupCollapse,
        setPathName: store.setPathName,
        reorderPaths: store.reorderPaths,
        addFrame: store.addFrame,
        copyFrame: store.copyFrame,
        deleteFrame: store.deleteFrame,
        reorderFrames: store.reorderFrames,
        undo: store.undo,
        redo: store.redo,
        canUndo: store.canUndo,
        canRedo: store.canRedo,
        beginCoalescing: store.beginCoalescing,
        endCoalescing: store.endCoalescing,
        currentBrushPath: store.currentBrushPath,
        setCurrentBrushPath: store.setCurrentBrushPath,
        currentPenPath: store.currentPenPath,
        setCurrentPenPath: store.setCurrentPenPath,
        currentLinePath: store.currentLinePath,
        setCurrentLinePath: store.setCurrentLinePath,
        selectedPathIds: store.selectedPathIds,
        setSelectedPathIds: store.setSelectedPathIds,
        finishBrushPath: store.finishBrushPath,
        handleFinishPenPath: store.handleFinishPenPath,
        handleCancelPenPath: store.handleCancelPenPath,
        handleFinishLinePath: store.handleFinishLinePath,
        handleCancelLinePath: store.handleCancelLinePath,
        handleReorder: store.handleReorder,
        handleDeleteSelected: store.handleDeleteSelected,
      }), [
        store.frames,
        store.currentFrameIndex,
        store.setCurrentFrameIndex,
        store.paths,
        store.setPaths,
        store.handleLoadFile,
        store.handleDeletePaths,
        store.togglePathsProperty,
        store.toggleGroupCollapse,
        store.setPathName,
        store.reorderPaths,
        store.addFrame,
        store.copyFrame,
        store.deleteFrame,
        store.reorderFrames,
        store.undo,
        store.redo,
        store.canUndo,
        store.canRedo,
        store.beginCoalescing,
        store.endCoalescing,
        store.currentBrushPath,
        store.setCurrentBrushPath,
        store.currentPenPath,
        store.setCurrentPenPath,
        store.currentLinePath,
        store.setCurrentLinePath,
        store.selectedPathIds,
        store.setSelectedPathIds,
        store.finishBrushPath,
        store.handleFinishPenPath,
        store.handleCancelPenPath,
        store.handleFinishLinePath,
        store.handleCancelLinePath,
        store.handleReorder,
        store.handleDeleteSelected,
      ]);

      return (
        <LayersProvider value={layersValue}>
          <TestConsumer />
          <button
            type="button"
            data-testid="toggle-menu"
            onClick={() => store.setIsMainMenuCollapsed(prev => !prev)}
          >
            Toggle menu
          </button>
        </LayersProvider>
      );
    };

    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    }

    const user = userEvent.setup();

    render(
      <AppProvider>
        <Harness />
      </AppProvider>
    );

    await waitFor(() => expect(observedValues.length).toBeGreaterThan(0));
    const initialLength = observedValues.length;
    const initialDistinct = new Set(observedValues).size;

    const toggleButton = await screen.findByTestId('toggle-menu');
    await user.click(toggleButton);
    await user.click(toggleButton);

    await waitFor(() => expect(observedValues.length).toBeGreaterThanOrEqual(initialLength));

    const baseline = observedValues[initialLength - 1];
    const latest = observedValues[observedValues.length - 1];
    expect(latest).toBe(baseline);
    expect(new Set(observedValues).size).toBe(initialDistinct);
  });
});
