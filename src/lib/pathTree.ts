import type { AnyPath, GroupData } from '@/types';

const isGroup = (path: AnyPath): path is GroupData => path.tool === 'group';

const traverse = (paths: AnyPath[], visit: (path: AnyPath) => void) => {
  for (const path of paths) {
    visit(path);
    if (isGroup(path)) {
      traverse(path.children, visit);
    }
  }
};

export const findPathById = (paths: AnyPath[], id: string): AnyPath | null => {
  let found: AnyPath | null = null;

  traverse(paths, path => {
    if (!found && path.id === id) {
      found = path;
    }
  });

  return found;
};

export const collectPathsByIds = (paths: AnyPath[], ids: string[]): AnyPath[] => {
  if (ids.length === 0) return [];

  const idSet = new Set(ids);
  const found = new Map<string, AnyPath>();

  traverse(paths, path => {
    if (idSet.has(path.id)) {
      found.set(path.id, path);
    }
  });

  return ids.reduce<AnyPath[]>((result, id) => {
    const path = found.get(id);
    if (path) {
      result.push(path);
    }
    return result;
  }, []);
};
