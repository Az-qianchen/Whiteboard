import type { BinaryFileMetadata } from '@/types';

export const ROOT_PATH = '/';

export type TreeNode = {
  path: string;
  name: string;
  type: 'folder' | 'file';
  children: TreeNode[];
  fileId?: string;
};

export type FileTree = {
  root: TreeNode;
  folderMap: Map<string, TreeNode>;
  fileInfo: Record<string, { fullPath: string; folderPath: string; fileName: string }>;
};

const sortChildren = (node: TreeNode) => {
  node.children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(child => {
    if (child.type === 'folder') {
      sortChildren(child);
    }
  });
};

export const buildFileTree = (files: Record<string, BinaryFileMetadata>): FileTree => {
  const root: TreeNode = { path: ROOT_PATH, name: ROOT_PATH, type: 'folder', children: [] };
  const folderMap = new Map<string, TreeNode>([[ROOT_PATH, root]]);
  const fileInfo: Record<string, { fullPath: string; folderPath: string; fileName: string }> = {};

  Object.values(files).forEach(file => {
    const rawName = file.name && file.name.trim().length > 0 ? file.name.trim() : file.id;
    const segments = rawName.split('/').filter(Boolean);
    const fileName = segments.pop() ?? file.id;

    let parentPath = ROOT_PATH;

    segments.forEach(segment => {
      const folderPath = parentPath === ROOT_PATH ? `${ROOT_PATH}${segment}` : `${parentPath}/${segment}`;
      if (!folderMap.has(folderPath)) {
        const folderNode: TreeNode = {
          path: folderPath,
          name: segment,
          type: 'folder',
          children: [],
        };
        folderMap.get(parentPath)?.children.push(folderNode);
        folderMap.set(folderPath, folderNode);
      }
      parentPath = folderPath;
    });

    const filePath = parentPath === ROOT_PATH ? `${ROOT_PATH}${fileName}` : `${parentPath}/${fileName}`;
    const parentNode = folderMap.get(parentPath);
    if (parentNode) {
      parentNode.children.push({
        path: filePath,
        name: fileName,
        type: 'file',
        children: [],
        fileId: file.id,
      });
    }
    fileInfo[file.id] = { fullPath: filePath, folderPath: parentPath, fileName };
  });

  sortChildren(root);

  return { root, folderMap, fileInfo };
};

export const getParentFolderPath = (path: string): string | null => {
  if (path === ROOT_PATH) {
    return null;
  }
  const segments = path.split('/').filter(Boolean);
  segments.pop();
  if (segments.length === 0) {
    return ROOT_PATH;
  }
  return `/${segments.join('/')}`;
};
