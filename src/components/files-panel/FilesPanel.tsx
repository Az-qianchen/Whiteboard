import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import type { BoardFileEntry } from '@/types';

export const FilesPanel: React.FC = () => {
  const {
    directoryHandle,
    directoryEntries,
    isDirectoryLoading,
    directoryError,
    chooseDirectory,
    refreshDirectoryEntries,
    handleOpenFromHandle,
    activeFileName,
  } = useAppContext();
  const { t } = useTranslation();

  const errorMessage = useMemo(() => {
    if (!directoryError) return null;
    switch (directoryError.type) {
      case 'unsupported':
        return t('filesPanel.unsupported');
      case 'permission':
        return t('filesPanel.permissionDenied');
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

  const handleOpenFile = useCallback(
    (entry: BoardFileEntry) => {
      void handleOpenFromHandle(entry.handle);
    },
    [handleOpenFromHandle]
  );

  return (
    <div className="flex h-full flex-col text-sm text-[var(--text-primary)]">
      <div className="flex items-center justify-end gap-2 border-b border-[var(--ui-separator)] pb-3">
        {directoryHandle ? (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isDirectoryLoading}
            className="rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-element-bg)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--ui-hover-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('filesPanel.refresh')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleSelectFolder}
          disabled={isDirectoryLoading}
          className="rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-element-bg)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--ui-hover-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {directoryHandle ? t('filesPanel.changeFolder') : t('filesPanel.selectFolder')}
        </button>
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
