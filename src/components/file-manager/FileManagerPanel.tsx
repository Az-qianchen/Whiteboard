import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilesStore } from '@/context/filesStore';
import { useAppContext } from '@/context/AppContext';
import { PANEL_CLASSES } from '@/components/panelStyles';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '@/constants';
import type { BinaryFileMetadata } from '@/types';

const ROOT_PATH = '/';

type TreeNode = {
  path: string;
  name: string;
  type: 'folder' | 'file';
  children: TreeNode[];
  fileId?: string;
};

type FileTree = {
  root: TreeNode;
  folderMap: Map<string, TreeNode>;
  fileInfo: Record<string, { fullPath: string; folderPath: string; fileName: string }>;
};

const buildFileTree = (files: Record<string, BinaryFileMetadata>): FileTree => {
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

  sortChildren(root);

  return { root, folderMap, fileInfo };
};

const getParentFolderPath = (path: string): string | null => {
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

export function FileManagerPanel(): JSX.Element {
  const { t } = useTranslation();
  const files = useFilesStore(state => state.files);
  const renameFile = useFilesStore(state => state.renameFile);
  const { fileManagerSelectedFolder, setFileManagerSelectedFolder } = useAppContext();

  const { root, folderMap, fileInfo } = useMemo(() => buildFileTree(files), [files]);

  const normalizedFolder = folderMap.has(fileManagerSelectedFolder) ? fileManagerSelectedFolder : ROOT_PATH;
  const currentFolderNode = folderMap.get(normalizedFolder) ?? root;

  useEffect(() => {
    if (!folderMap.has(fileManagerSelectedFolder)) {
      setFileManagerSelectedFolder(ROOT_PATH);
    }
  }, [fileManagerSelectedFolder, folderMap, setFileManagerSelectedFolder]);

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    if (!selectedFileId) {
      setRenameDraft('');
      return;
    }
    const info = fileInfo[selectedFileId];
    if (!info) {
      setRenameDraft('');
      return;
    }
    setRenameDraft(info.fileName);
  }, [selectedFileId, fileInfo]);

  useEffect(() => {
    if (selectedFileId) {
      const info = fileInfo[selectedFileId];
      if (!info || info.folderPath !== normalizedFolder) {
        setSelectedFileId(null);
        setRenameDraft('');
      }
    }
  }, [selectedFileId, fileInfo, normalizedFolder]);

  const breadcrumbLabel = useMemo(() => {
    if (normalizedFolder === ROOT_PATH) {
      return t('fileManager.root');
    }
    const segments = normalizedFolder.split('/').filter(Boolean);
    return [t('fileManager.root'), ...segments].join(' / ');
  }, [normalizedFolder, t]);

  const parentFolderPath = useMemo(() => getParentFolderPath(normalizedFolder), [normalizedFolder]);

  const handleRename = useCallback(() => {
    if (!selectedFileId) {
      return;
    }
    const info = fileInfo[selectedFileId];
    if (!info) {
      return;
    }
    const trimmed = renameDraft.trim();
    if (trimmed.length === 0 || trimmed === info.fileName) {
      return;
    }
    const newFullName = info.folderPath === ROOT_PATH ? trimmed : `${info.folderPath.slice(1)}/${trimmed}`;
    renameFile(selectedFileId, newFullName);
  }, [fileInfo, renameDraft, renameFile, selectedFileId]);

  const renderNodes = useCallback(
    (nodes: TreeNode[], level = 0): React.ReactNode =>
      nodes.map(node => {
        const padding = { paddingLeft: `${level * 12}px` };
        if (node.type === 'folder') {
          const isSelected = node.path === normalizedFolder;
          return (
            <div key={node.path} className="space-y-1">
              <div style={padding}>
                <PanelButton
                  variant="unstyled"
                  onClick={() => setFileManagerSelectedFolder(node.path)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] hover:text-[var(--text-primary)]'
                  } focus-visible:ring-2 ring-[var(--accent-primary)]`}
                >
                  <span className="w-4 h-4 flex items-center justify-center text-[var(--text-secondary)]">
                    {ICONS.OPEN}
                  </span>
                  <span className="flex-1 truncate text-left">
                    {node.path === ROOT_PATH ? t('fileManager.root') : node.name}
                  </span>
                </PanelButton>
              </div>
              {node.children.length > 0 && (
                <div>{renderNodes(node.children, level + 1)}</div>
              )}
            </div>
          );
        }

        const isSelected = node.fileId === selectedFileId;
        const metadata = node.fileId ? files[node.fileId] : null;
        const displayName = node.fileId && fileInfo[node.fileId]
          ? fileInfo[node.fileId].fileName
          : node.name;
        const isUnnamed = !metadata?.name || metadata.name.trim().length === 0;
        return (
          <div key={node.path} style={padding}>
            <PanelButton
              variant="unstyled"
              onClick={() => setSelectedFileId(node.fileId ?? null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                isSelected
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)]'
              } focus-visible:ring-2 ring-[var(--accent-primary)]`}
            >
              <span className="w-4 h-4 flex items-center justify-center text-[var(--text-secondary)]">
                {ICONS.COPY_PNG}
              </span>
              <span className="flex-1 truncate text-left">
                {isUnnamed ? t('fileManager.unnamedFile') : displayName}
              </span>
            </PanelButton>
          </div>
        );
      }),
    [files, fileInfo, normalizedFolder, selectedFileId, setFileManagerSelectedFolder, setSelectedFileId, t]
  );

  const isSaveDisabled = useMemo(() => {
    if (!selectedFileId) {
      return true;
    }
    const info = fileInfo[selectedFileId];
    if (!info) {
      return true;
    }
    const trimmed = renameDraft.trim();
    return trimmed.length === 0 || trimmed === info.fileName;
  }, [fileInfo, renameDraft, selectedFileId]);

  return (
    <div className={`${PANEL_CLASSES.section} h-full flex flex-col gap-4`}>
      <div>
        <h3 className={`${PANEL_CLASSES.sectionTitle} text-[var(--text-primary)]`}>{t('fileManager.title')}</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{t('fileManager.description')}</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className={`${PANEL_CLASSES.label} block text-[var(--text-secondary)]`}>{t('fileManager.currentFolder')}</span>
          <span className="text-sm text-[var(--text-primary)] break-all">{breadcrumbLabel}</span>
        </div>
        {parentFolderPath && (
          <PanelButton
            variant="unstyled"
            onClick={() => setFileManagerSelectedFolder(parentFolderPath)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--ui-element-bg-hover)] focus-visible:ring-2 ring-[var(--accent-primary)]"
          >
            {ICONS.CHEVRON_LEFT}
            <span>{t('fileManager.goUp')}</span>
          </PanelButton>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-[var(--ui-panel-border)] bg-[var(--ui-element-bg)] p-2 space-y-1">
        {currentFolderNode.children.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text-secondary)]">{t('fileManager.empty')}</div>
        ) : (
          renderNodes(currentFolderNode.children)
        )}
      </div>

      <div className="mt-auto space-y-2">
        <label className={`${PANEL_CLASSES.label} text-[var(--text-secondary)]`} htmlFor="file-manager-rename">
          {t('fileManager.renameLabel')}
        </label>
        <div className={`${PANEL_CLASSES.inputWrapper} w-full`}>
          <input
            id="file-manager-rename"
            type="text"
            value={renameDraft}
            onChange={event => setRenameDraft(event.target.value)}
            disabled={!selectedFileId}
            placeholder={t('fileManager.renamePlaceholder')}
            className={`${PANEL_CLASSES.input} ${!selectedFileId ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        </div>
        {!selectedFileId && (
          <p className="text-xs text-[var(--text-secondary)]">{t('fileManager.selectFile')}</p>
        )}
        <PanelButton
          variant="unstyled"
          onClick={handleRename}
          disabled={isSaveDisabled}
          className={`w-full flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
            isSaveDisabled
              ? 'bg-[var(--ui-element-bg)] text-[var(--text-secondary)] opacity-60 cursor-not-allowed'
              : 'bg-[var(--accent-solid-bg)] text-[var(--text-on-accent-solid)] hover:opacity-90'
          } focus-visible:ring-2 ring-[var(--accent-primary)]`}
        >
          {t('fileManager.saveButton')}
        </PanelButton>
      </div>
    </div>
  );
}

