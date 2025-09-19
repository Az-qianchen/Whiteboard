import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnyPath, Frame, ImageData } from '@/types';
import {
  recursivelyDeletePaths,
  recursivelyReorderPaths,
  recursivelySetPathName,
  recursivelyTogglePathsProperty,
  recursivelyUpdatePath,
} from '@/hooks/frame-management-logic';
import { useFilesStore } from './filesStore';

type FrameState = { frames: Frame[]; currentFrameIndex: number };

const collectFileIdsFromFrames = (frames: Frame[]): Set<string> => {
  const ids = new Set<string>();
  frames.forEach(frame => {
    frame.paths.forEach(path => {
      if (path.tool === 'image') {
        const image = path as ImageData;
        if (image.fileId) {
          ids.add(image.fileId);
        }
      } else if (path.tool === 'group') {
        const children = (path as any).children as AnyPath[] | undefined;
        if (children) {
          collectFileIdsFromFrames([{ paths: children }]).forEach(id => ids.add(id));
        }
      }
    });
  });
  return ids;
};

const syncBinaryFileReferences = () => {
  const { frames, past, future } = usePathsStore.getState();
  const referenced = new Set<string>();
  collectFileIdsFromFrames(frames).forEach(id => referenced.add(id));
  past.forEach(state => collectFileIdsFromFrames(state.frames).forEach(id => referenced.add(id)));
  future.forEach(state => collectFileIdsFromFrames(state.frames).forEach(id => referenced.add(id)));

  const store = useFilesStore.getState();
  const known = Object.keys(store.files);
  const unused = known.filter(id => !referenced.has(id));
  if (unused.length > 0) {
    void store.deleteFiles(unused);
  }
};

const migratePathImages = async (frames: Frame[]): Promise<Frame[]> => {
  const store = useFilesStore.getState();
  const upgradedFrames: Frame[] = [];
  for (const frame of frames) {
    const upgradedPaths: AnyPath[] = [];
    for (const path of frame.paths) {
      if (path.tool === 'image') {
        const imagePath = path as ImageData;
        if (!imagePath.fileId && imagePath.src) {
          const { fileId } = await store.ingestDataUrl(imagePath.src);
          const { src, ...rest } = imagePath;
          upgradedPaths.push({ ...rest, fileId });
        } else {
          upgradedPaths.push(imagePath);
        }
      } else if (path.tool === 'group') {
        const children = (path as any).children as AnyPath[] | undefined;
        if (children) {
          const [childFrame] = await migratePathImages([{ paths: children }]);
          upgradedPaths.push({ ...path, children: childFrame.paths } as AnyPath);
        } else {
          upgradedPaths.push(path);
        }
      } else {
        upgradedPaths.push(path);
      }
    }
    upgradedFrames.push({ ...frame, paths: upgradedPaths });
  }
  return upgradedFrames;
};

interface PathsStore extends FrameState {
  // History
  past: FrameState[];
  future: FrameState[];
  coalescing: boolean;

  // Core setters
  setFramesState: (updater: FrameState | ((prev: FrameState) => FrameState)) => void;
  setCurrentFrameIndex: (updater: number | ((prev: number) => number)) => void;
  setPaths: (updater: React.SetStateAction<AnyPath[]>) => void;

  // Frame/file ops
  handleLoadFile: (newFrames: Frame[], newFrameIndex?: number) => void;
  addFrame: () => void;
  copyFrame: (index: number) => void;
  deleteFrame: (index: number) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;

  // Path ops
  handleDeletePaths: (ids: string[]) => void;
  togglePathsProperty: (ids: string[], property: 'isLocked' | 'isVisible') => void;
  toggleGroupCollapse: (id: string) => void;
  setPathName: (id: string, name: string) => void;
  reorderPaths: (draggedId: string, targetId: string, position: 'above' | 'below' | 'inside') => void;

  // History controls
  undo: () => void;
  redo: () => void;
}

export const usePathsStore = create<PathsStore>()(
  persist(
    (set, get) => ({
      // Initial present
      frames: [{ paths: [] }],
      currentFrameIndex: 0,
      // History
      past: [],
      future: [],
      coalescing: false,

      setFramesState: (updater) => {
        let didChange = false;
        set((state) => {
          const current: FrameState = { frames: state.frames, currentFrameIndex: state.currentFrameIndex };
          const next = typeof updater === 'function' ? (updater as (prev: FrameState) => FrameState)(current) : updater;
          if (next.frames === state.frames && next.currentFrameIndex === state.currentFrameIndex) return {};
          if (state.coalescing) {
            didChange = true;
            return { frames: next.frames, currentFrameIndex: next.currentFrameIndex };
          }
          didChange = true;
          return {
            past: [...state.past, current],
            frames: next.frames,
            currentFrameIndex: next.currentFrameIndex,
            future: [],
          };
        });
        if (didChange) {
          syncBinaryFileReferences();
        }
      },

      setCurrentFrameIndex: (updater) => {
        set((state) => {
          const newIndex = typeof updater === 'function' ? (updater as (prev: number) => number)(state.currentFrameIndex) : updater;
          const clamped = Math.max(0, Math.min(newIndex, state.frames.length - 1));
          if (clamped === state.currentFrameIndex) return {};
          // Navigation should not create a new history entry
          return { currentFrameIndex: clamped } as Partial<PathsStore>;
        });
      },

      setPaths: (updater) => {
        const { setFramesState } = get();
        setFramesState((prev) => {
          const oldPaths = prev.frames[prev.currentFrameIndex]?.paths ?? [];
          const newPathsForCurrent = typeof updater === 'function' ? (updater as (p: AnyPath[]) => AnyPath[])(oldPaths) : updater;

          const masterFrameList = newPathsForCurrent.filter((p) => p.tool === 'frame');

          const synchronizedFrames = prev.frames.map((frame, index) => {
            const contentPaths = frame.paths.filter((p) => p.tool !== 'frame');
            if (index === prev.currentFrameIndex) {
              const newContentPaths = newPathsForCurrent.filter((p) => p.tool !== 'frame');
              return { ...frame, paths: [...newContentPaths, ...masterFrameList] } as Frame;
            }
            return { ...frame, paths: [...contentPaths, ...masterFrameList] } as Frame;
          });

          return { frames: synchronizedFrames, currentFrameIndex: prev.currentFrameIndex };
        });
      },

      handleLoadFile: (newFrames, newFrameIndex = 0) => {
        const { setFramesState } = get();
        setFramesState({ frames: newFrames, currentFrameIndex: Math.max(0, Math.min(newFrameIndex, Math.max(0, newFrames.length - 1))) });
      },

      handleDeletePaths: (ids) => {
        const { setPaths } = get();
        setPaths((prev) => recursivelyDeletePaths(prev, ids));
      },

      togglePathsProperty: (ids, property) => {
        const { setPaths } = get();
        setPaths((prev) => recursivelyTogglePathsProperty(prev, ids, property));
      },

      toggleGroupCollapse: (id) => {
        const { setPaths } = get();
        setPaths((prev) => recursivelyUpdatePath(prev, id, (p) => ({ ...p, isCollapsed: !(p as any).isCollapsed })));
      },

      setPathName: (id, name) => {
        const { setPaths } = get();
        setPaths((prev) => recursivelySetPathName(prev, id, name));
      },

      reorderPaths: (draggedId, targetId, position) => {
        const { setPaths } = get();
        setPaths((prev) => recursivelyReorderPaths(prev, draggedId, targetId, position));
      },

      addFrame: () => {
        const { setFramesState } = get();
        setFramesState((prev) => {
          const currentPaths = prev.frames[prev.currentFrameIndex]?.paths ?? [];
          const masterFrameList = currentPaths.filter((p) => p.tool === 'frame');
          const newFrames = [...prev.frames, { paths: [...masterFrameList] }];
          return { frames: newFrames, currentFrameIndex: newFrames.length - 1 };
        });
      },

      copyFrame: (index) => {
        const { setFramesState } = get();
        setFramesState((prev) => {
          const frameToCopy = prev.frames[index];
          if (!frameToCopy) return prev;
          const newFrames = [...prev.frames];
          newFrames.splice(index + 1, 0, JSON.parse(JSON.stringify(frameToCopy)));
          return { frames: newFrames, currentFrameIndex: index + 1 };
        });
      },

      deleteFrame: (index) => {
        const { setFramesState } = get();
        setFramesState((prev) => {
          if (prev.frames.length <= 1) return prev;
          const newFrames = prev.frames.filter((_, i) => i !== index);
          const newIndex = Math.min(prev.currentFrameIndex, newFrames.length - 1);
          return { frames: newFrames, currentFrameIndex: newIndex };
        });
      },

      reorderFrames: (fromIndex, toIndex) => {
        const { setFramesState } = get();
        setFramesState((prev) => {
          const newFrames = [...prev.frames];
          const [moved] = newFrames.splice(fromIndex, 1);
          newFrames.splice(toIndex, 0, moved);

          let newCurrent = prev.currentFrameIndex;
          if (prev.currentFrameIndex === fromIndex) {
            newCurrent = toIndex;
          } else if (prev.currentFrameIndex > fromIndex && prev.currentFrameIndex <= toIndex) {
            newCurrent--;
          } else if (prev.currentFrameIndex < fromIndex && prev.currentFrameIndex >= toIndex) {
            newCurrent++;
          }

          return { frames: newFrames, currentFrameIndex: newCurrent };
        });
      },

      undo: () => {
        let changed = false;
        set((state) => {
          if (state.past.length === 0) return {};
          const previous = state.past[state.past.length - 1];
          const newPast = state.past.slice(0, -1);
          const present: FrameState = { frames: state.frames, currentFrameIndex: state.currentFrameIndex };
          changed = true;
          return {
            past: newPast,
            frames: previous.frames,
            currentFrameIndex: previous.currentFrameIndex,
            future: [present, ...state.future],
          };
        });
        if (changed) {
          syncBinaryFileReferences();
        }
      },

      redo: () => {
        let changed = false;
        set((state) => {
          if (state.future.length === 0) return {};
          const next = state.future[0];
          const newFuture = state.future.slice(1);
          const present: FrameState = { frames: state.frames, currentFrameIndex: state.currentFrameIndex };
          changed = true;
          return {
            past: [...state.past, present],
            frames: next.frames,
            currentFrameIndex: next.currentFrameIndex,
            future: newFuture,
          };
        });
        if (changed) {
          syncBinaryFileReferences();
        }
      },
    }),
    {
      name: 'whiteboard_paths_state',
      version: 2,
      migrate: async (persistedState: any) => {
        if (!persistedState?.frames) return persistedState;
        const frames = await migratePathImages(persistedState.frames as Frame[]);
        return { ...persistedState, frames };
      },
      partialize: (s) => ({ frames: s.frames, currentFrameIndex: s.currentFrameIndex }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncBinaryFileReferences();
        }
      },
    }
  )
);

// History helpers exposed as selectors
export const useCanUndo = () => usePathsStore((s) => s.past.length > 0);
export const useCanRedo = () => usePathsStore((s) => s.future.length > 0);
export const useBeginCoalescing = () => usePathsStore((state) => () => {
  if (!state.coalescing) {
    const { frames, currentFrameIndex, past } = state;
    usePathsStore.setState({ past: [...past, { frames, currentFrameIndex }], future: [], coalescing: true });
  }
});
export const useEndCoalescing = () => usePathsStore(() => () => usePathsStore.setState({ coalescing: false }));

