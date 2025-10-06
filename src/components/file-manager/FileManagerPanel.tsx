import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilesStore } from '@/context/filesStore';
import { useAppContext } from '@/context/AppContext';
import { PANEL_CLASSES } from '@/components/panelStyles';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '@/constants';
import { buildFileTree, getParentFolderPath, ROOT_PATH, type TreeNode } from './fileTree';

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

type MetadataEntry = { label: string; value: string };

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const formatted = size % 1 === 0 ? size.toString() : size.toFixed(1);
  return `${formatted} ${SIZE_UNITS[unitIndex]}`;
};

export function FileManagerPanel(): JSX.Element {
  const { t, i18n } = useTranslation();
  const files = useFilesStore(state => state.files);
  const renameFile = useFilesStore(state => state.renameFile);
  const getDataUrl = useFilesStore(state => state.getDataUrl);
  const getBlob = useFilesStore(state => state.getBlob);
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
  const [panelMessage, setPanelMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

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

  useEffect(() => {
    setPanelMessage(null);
  }, [selectedFileId, normalizedFolder]);

  useEffect(() => {
    let isCancelled = false;
    setPreviewDataUrl(null);
    setPreviewError(null);
    setIsPreviewLoading(false);
    if (!selectedFileId) {
      return () => {
        isCancelled = true;
      };
    }
    const metadata = files[selectedFileId];
    if (!metadata) {
      return () => {
        isCancelled = true;
      };
    }
    if (!metadata.mimeType.startsWith('image/')) {
      setPreviewError(t('fileManager.previewUnavailable'));
      return () => {
        isCancelled = true;
      };
    }
    setIsPreviewLoading(true);
    void (async () => {
      try {
        const dataUrl = await getDataUrl(selectedFileId);
        if (isCancelled) {
          return;
        }
        if (dataUrl) {
          setPreviewDataUrl(dataUrl);
        } else {
          setPreviewError(t('fileManager.previewUnavailable'));
        }
      } catch (error) {
        if (!isCancelled) {
          setPreviewError(t('fileManager.previewError'));
        }
      } finally {
        if (!isCancelled) {
          setIsPreviewLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [selectedFileId, files, getDataUrl, t]);

  const breadcrumbLabel = useMemo(() => {
    if (normalizedFolder === ROOT_PATH) {
      return t('fileManager.root');
    }
    const segments = normalizedFolder.split('/').filter(Boolean);
    return [t('fileManager.root'), ...segments].join(' / ');
  }, [normalizedFolder, t]);

  const parentFolderPath = useMemo(() => getParentFolderPath(normalizedFolder), [normalizedFolder]);

  const selectedFileInfo = selectedFileId ? fileInfo[selectedFileId] : undefined;
  const selectedMetadata = selectedFileId ? files[selectedFileId] : undefined;

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }), [i18n.language]);

  const metadataEntries = useMemo<MetadataEntry[]>(() => {
    if (!selectedMetadata) {
      return [];
    }
    const entries: MetadataEntry[] = [
      { label: t('fileManager.metadataName'), value: selectedFileInfo?.fileName ?? selectedMetadata.id },
      { label: t('fileManager.metadataPath'), value: selectedFileInfo?.fullPath ?? ROOT_PATH },
      { label: t('fileManager.metadataType'), value: selectedMetadata.mimeType },
      { label: t('fileManager.metadataSize'), value: formatFileSize(selectedMetadata.size) },
      { label: t('fileManager.metadataCreated'), value: dateFormatter.format(new Date(selectedMetadata.created)) },
      { label: t('fileManager.metadataModified'), value: dateFormatter.format(new Date(selectedMetadata.lastModified)) },
    ];
    return entries;
  }, [dateFormatter, selectedFileInfo, selectedMetadata, t]);

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
    setPanelMessage({ tone: 'info', text: t('fileManager.renameSuccess') });
  }, [fileInfo, renameDraft, renameFile, selectedFileId, t]);

  const handleDownload = useCallback(async () => {
    if (!selectedFileId) {
      return;
    }
    try {
      const blob = await getBlob(selectedFileId);
      if (!blob) {
        setPanelMessage({ tone: 'error', text: t('fileManager.downloadError') });
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      const defaultName = selectedFileInfo?.fileName ?? selectedFileId;
      link.download = defaultName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setPanelMessage({ tone: 'error', text: t('fileManager.downloadError') });
    }
  }, [getBlob, selectedFileId, selectedFileInfo, t]);

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

      <div className="flex flex-1 flex-col gap-4 min-h-0">
        <div className="flex flex-col gap-4 min-h-0 md:flex-row">
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-[var(--ui-panel-border)] bg-[var(--ui-element-bg)] p-2 space-y-1">
              {currentFolderNode.children.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--text-secondary)]">{t('fileManager.empty')}</div>
              ) : (
                renderNodes(currentFolderNode.children)
              )}
            </div>

            <div className="space-y-2">
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
              {panelMessage && (
                <div
                  className={`rounded-md px-2 py-1 text-xs ${
                    panelMessage.tone === 'error'
                      ? 'bg-[var(--danger-bg)] text-[var(--danger-text)]'
                      : 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  }`}
                >
                  {panelMessage.text}
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <PanelButton
                  variant="unstyled"
                  onClick={handleRename}
                  disabled={isSaveDisabled}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    isSaveDisabled
                      ? 'bg-[var(--ui-element-bg)] text-[var(--text-secondary)] opacity-60 cursor-not-allowed'
                      : 'bg-[var(--accent-solid-bg)] text-[var(--text-on-accent-solid)] hover:opacity-90'
                  } focus-visible:ring-2 ring-[var(--accent-primary)]`}
                >
                  {t('fileManager.saveButton')}
                </PanelButton>
                <PanelButton
                  variant="unstyled"
                  onClick={handleDownload}
                  disabled={!selectedFileId}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    !selectedFileId
                      ? 'bg-[var(--ui-element-bg)] text-[var(--text-secondary)] opacity-60 cursor-not-allowed'
                      : 'bg-[var(--ui-element-bg)] text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)]'
                  } focus-visible:ring-2 ring-[var(--accent-primary)]`}
                >
                  <span className="w-4 h-4 flex items-center justify-center text-[var(--text-secondary)]">{ICONS.IMPORT}</span>
                  {t('fileManager.downloadButton')}
                </PanelButton>
              </div>
            </div>
          </div>

          <aside className="flex w-full min-h-0 flex-col gap-3 md:w-60">
            <div>
              <h4 className={`${PANEL_CLASSES.label} text-[var(--text-secondary)]`}>{t('fileManager.previewTitle')}</h4>
              <div className="mt-2 flex h-48 items-center justify-center overflow-hidden rounded-lg border border-[var(--ui-panel-border)] bg-[var(--ui-element-bg)]">
                {!selectedFileId ? (
                  <p className="px-4 text-center text-xs text-[var(--text-secondary)]">{t('fileManager.noFileSelected')}</p>
                ) : isPreviewLoading ? (
                  <p className="px-4 text-center text-xs text-[var(--text-secondary)]">{t('fileManager.previewLoading')}</p>
                ) : previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt={selectedFileInfo?.fileName ?? 'preview'}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <p className="px-4 text-center text-xs text-[var(--text-secondary)]">
                    {previewError ?? t('fileManager.previewUnavailable')}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className={`${PANEL_CLASSES.label} text-[var(--text-secondary)]`}>{t('fileManager.metadataTitle')}</h4>
              <div className="mt-2 space-y-1 rounded-lg border border-[var(--ui-panel-border)] bg-[var(--ui-element-bg)] p-3 text-xs text-[var(--text-secondary)]">
                {!selectedMetadata ? (
                  <p>{t('fileManager.noFileSelected')}</p>
                ) : (
                  metadataEntries.map(entry => (
                    <div key={entry.label} className="flex justify-between gap-3">
                      <span className="font-medium text-[var(--text-secondary)]">{entry.label}</span>
                      <span className="text-right text-[var(--text-primary)] break-all">{entry.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

