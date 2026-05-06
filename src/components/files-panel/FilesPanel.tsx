import React, { useCallback, useMemo } from 'react';
import { FilePlus, FolderOpen, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import PanelButton from '@/components/PanelButton';
import type { BoardFileEntry } from '@/types';

export const FilesPanel: React.FC = () => {
  const {
    directoryHandle,
    directoryEntries,
    isDirectoryLoading,
    directoryError,
    chooseDirectory,
    refreshDirectoryEntries,
    createNewBoardFile,
    handleOpenFromHandle,
    activeFileName,
    hasUnsavedChanges,
    showConfirmation,
  } = useAppContext();
  const { t } = useTranslation();

  const errorMessage = useMemo(() => {
    if (!directoryError) return null;
    switch (directoryError.type) {
      case 'unsupported':
        return t('filesPanel.unsupported');
      case 'permission':
        return t('filesPanel.permissionDenied');
      case 'creation':
        return directoryError.message
          ? t('filesPanel.createFileFailedWithMessage', { message: directoryError.message })
          : t('filesPanel.createFileFailed');
      case 'unknown':
        return directoryError.message
          ? t('filesPanel.unknownErrorWithMessage', { message: directoryError.message })
          : t('filesPanel.unknownError');
      default:
        return null;
    }
  }, [directoryError, t]);

  const formatModified = useCallback(
    (value?: number) => {
      if (!value) {
        return t('filesPanel.unknownDate');
      }
      try {
        return new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value));
      } catch {
        return new Date(value).toLocaleString();
      }
    },
    [t]
  );

  const handleSelectFolder = useCallback(() => {
    void chooseDirectory();
  }, [chooseDirectory]);

  const handleRefresh = useCallback(() => {
    void refreshDirectoryEntries();
  }, [refreshDirectoryEntries]);

  const handleCreateFile = useCallback(() => {
    void createNewBoardFile();
  }, [createNewBoardFile]);

  const handleOpenFile = useCallback(
    (entry: BoardFileEntry) => {
      if (hasUnsavedChanges) {
        showConfirmation(
          t('filesPanel.confirmSwitchTitle'),
          t('filesPanel.confirmSwitchMessage'),
          () => handleOpenFromHandle(entry.handle),
          t('filesPanel.confirmSwitchConfirm')
        );
        return;
      }

      void handleOpenFromHandle(entry.handle);
    },
    [handleOpenFromHandle, hasUnsavedChanges, showConfirmation, t]
  );

  return (
    <div className="flex h-full flex-col text-sm text-[var(--text-primary)]">
      <div className="flex items-center justify-end gap-2 border-b border-[var(--ui-separator)] pb-3">
        {directoryHandle ? (
          <>
            <PanelButton
              type="button"
              onClick={handleCreateFile}
              disabled={isDirectoryLoading}
              aria-label={t('filesPanel.createFile')}
              title={t('filesPanel.createFile')}
              variant="unstyled"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--ui-element-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FilePlus aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">{t('filesPanel.createFile')}</span>
            </PanelButton>
            <PanelButton
              type="button"
              onClick={handleRefresh}
              disabled={isDirectoryLoading}
              aria-label={t('filesPanel.refresh')}
              title={t('filesPanel.refresh')}
              variant="unstyled"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--ui-element-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">{t('filesPanel.refresh')}</span>
            </PanelButton>
          </>
        ) : null}
        <PanelButton
          type="button"
          onClick={handleSelectFolder}
          disabled={isDirectoryLoading}
          aria-label={directoryHandle ? t('filesPanel.changeFolder') : t('filesPanel.selectFolder')}
          title={directoryHandle ? t('filesPanel.changeFolder') : t('filesPanel.selectFolder')}
          variant="unstyled"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--ui-element-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FolderOpen aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">
            {directoryHandle ? t('filesPanel.changeFolder') : t('filesPanel.selectFolder')}
          </span>
        </PanelButton>
      </div>

      {errorMessage ? (
        <div className="mt-3 rounded-md bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-3 flex-1 overflow-y-auto pr-1">
        {isDirectoryLoading ? (
          <div className="py-4 text-center text-xs text-[var(--text-secondary)]">
            {t('filesPanel.loading')}
          </div>
        ) : !directoryHandle ? (
          <div className="py-4 text-center text-xs text-[var(--text-secondary)]">
            {t('filesPanel.noFolderDescription')}
          </div>
        ) : directoryEntries.length === 0 ? (
          <div className="py-4 text-center text-xs text-[var(--text-secondary)]">
            {t('filesPanel.emptyState')}
          </div>
        ) : (
          <ul className="space-y-1">
            {directoryEntries.map((entry, index) => {
              const isActive = Boolean(activeFileName && entry.name === activeFileName);
              const key = `${entry.name}-${entry.lastModified ?? 'na'}-${index}`;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => handleOpenFile(entry)}
                    disabled={isDirectoryLoading}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
                      isActive
                        ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)]'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{entry.name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {entry.lastModified
                          ? t('filesPanel.lastModified', { value: formatModified(entry.lastModified) })
                          : t('filesPanel.unknownDate')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
