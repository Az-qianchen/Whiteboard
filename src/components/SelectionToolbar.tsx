/**
 * 本文件定义了当有图形被选中时出现的选择工具栏。
 * 它允许用户在“移动/变换”模式和“编辑锚点”模式之间切换。
 */

import React, { Fragment, useState } from 'react';
import { Popover, Transition, RadioGroup } from '@headlessui/react';
import PanelButton from '@/components/PanelButton';
import { PANEL_CLASSES } from './panelStyles';
import { ICONS } from '../constants';
import type { SelectionMode, Alignment, DistributeMode } from '../types';
import { Slider } from './side-toolbar';
import { TraceImagePopover } from './TraceImagePopover';
import type { TraceOptions } from '../types';
import { useTranslation } from 'react-i18next';

type BooleanOperation = 'unite' | 'subtract' | 'intersect' | 'exclude' | 'divide';

interface SelectionToolbarProps {
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  isSimplifiable: boolean;
  beginSimplify: () => void;
  setSimplify: (tolerance: number) => void;
  endSimplify: () => void;
  selectedPathIds: string[];
  onAlign: (alignment: Alignment) => void;
  onDistribute: (axis: 'horizontal' | 'vertical', options: { spacing: number | null; mode: DistributeMode }) => void;
  onBooleanOperation: (operation: BooleanOperation) => void;
  onMask: () => void;
  isTraceable: boolean;
  onTraceImage: (options: TraceOptions) => void;
}


export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectionMode,
  setSelectionMode,
  isSimplifiable,
  beginSimplify,
  setSimplify,
  endSimplify,
  selectedPathIds,
  onAlign,
  onDistribute,
  onBooleanOperation,
  onMask,
  isTraceable,
  onTraceImage,
}) => {
  const { t } = useTranslation();
  const [simplifyValue, setSimplifyValue] = useState(0);
  const [distributeMode, setDistributeMode] = useState<DistributeMode>('edges');
  const [distributeSpacing, setDistributeSpacing] = useState<string>('');

  const modes = [
    { name: 'move', title: t('modeMove'), icon: ICONS.MOVE },
    { name: 'edit', title: t('modeEdit'), icon: ICONS.EDIT },
    { name: 'lasso', title: t('modeLasso'), icon: ICONS.LASSO },
  ];

  const alignButtons = [
    { name: 'left', title: t('alignLeft'), icon: ICONS.ALIGN_LEFT },
    { name: 'h-center', title: t('alignHorizontalCenter'), icon: ICONS.ALIGN_HORIZONTAL_CENTER },
    { name: 'right', title: t('alignRight'), icon: ICONS.ALIGN_RIGHT },
    { name: 'top', title: t('alignTop'), icon: ICONS.ALIGN_TOP },
    { name: 'v-center', title: t('alignVerticalCenter'), icon: ICONS.ALIGN_VERTICAL_CENTER },
    { name: 'bottom', title: t('alignBottom'), icon: ICONS.ALIGN_BOTTOM },
  ];

  const booleanButtons: { name: BooleanOperation; title: string; icon: JSX.Element }[] = [
    { name: 'unite', title: t('union'), icon: ICONS.BOOLEAN_UNION },
    { name: 'subtract', title: t('subtract'), icon: ICONS.BOOLEAN_SUBTRACT },
    { name: 'intersect', title: t('intersect'), icon: ICONS.BOOLEAN_INTERSECT },
    { name: 'exclude', title: t('exclude'), icon: ICONS.BOOLEAN_EXCLUDE },
    { name: 'divide', title: t('divide'), icon: ICONS.BOOLEAN_DIVIDE },
  ];

  const handleSimplifyStart = () => {
    beginSimplify();
  };
  const handleSimplifyChange = (newValue: number) => {
    setSimplifyValue(newValue);
    setSimplify(newValue);
  };
  const handleSimplifyEnd = () => {
    endSimplify();
    setSimplifyValue(0);
  };

  const handleDistribute = (axis: 'horizontal' | 'vertical') => {
    const spacing = distributeSpacing.trim() === '' ? null : Number(distributeSpacing);
    onDistribute(axis, { spacing, mode: distributeMode });
  };
  
  const canAlignOrDistribute = selectedPathIds.length >= 2;
  const canPerformBooleanOrMask = selectedPathIds.length >= 2;

  return (
    <div className="flex items-center gap-2 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 text-[var(--text-primary)]">
      {modes.map((mode) => (
        <PanelButton
          key={mode.name}
          type="button"
          title={mode.title}
          onClick={() => setSelectionMode(mode.name as SelectionMode)}
          variant="unstyled"
          className={`flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors ${
            selectionMode === mode.name
              ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
          }`}
        >
          {mode.icon}
        </PanelButton>
      ))}

      {isSimplifiable && (
          <Popover className="relative">
            <Popover.Button
              as={PanelButton}
              title={t('simplifyPath')}
              variant="unstyled"
              className="flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
            >
              {ICONS.SIMPLIFY_PATH}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
              <Popover.Panel className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-60 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-4">
                <Slider
                  label={t('simplify')}
                  value={simplifyValue}
                  setValue={handleSimplifyChange}
                  min={0} max={50} step={1}
                  onInteractionStart={handleSimplifyStart}
                  onInteractionEnd={handleSimplifyEnd}
                />
              </Popover.Panel>
            </Transition>
          </Popover>
      )}

      {isTraceable && <TraceImagePopover onTrace={onTraceImage} />}

      {canAlignOrDistribute && (
          <Popover className="relative">
             <Popover.Button
                  as={PanelButton}
                  title={t('alignDistribute')}
                  variant="unstyled"
                  className="flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                >
                  {ICONS.ALIGN_DISTRIBUTE}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                <Popover.Panel className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-[var(--text-primary)]">{t('align')}</label>
                      <div className="grid grid-cols-6 gap-1 mt-2">
                        {alignButtons.map(btn => (
                           <PanelButton
                             key={btn.name}
                             onClick={() => onAlign(btn.name as Alignment)}
                             title={btn.title}
                             disabled={!canAlignOrDistribute}
                             variant="unstyled"
                             className="flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             {btn.icon}
                           </PanelButton>
                        ))}
                      </div>
                    </div>
                    
                    <div className="h-px bg-[var(--ui-separator)]" />

                    <div>
                      <label className={`${PANEL_CLASSES.label} text-[var(--text-primary)] font-semibold`}>{t('distribute')}</label>
                      <div className="flex items-center gap-2 mt-2">
                        <PanelButton
                          variant="unstyled"
                          onClick={() => handleDistribute('horizontal')}
                          disabled={!canAlignOrDistribute}
                          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-md bg-[var(--ui-element-bg)] hover:bg-[var(--ui-element-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {ICONS.DISTRIBUTE_HORIZONTAL} {t('horizontal')}
                        </PanelButton>
                        <PanelButton
                          variant="unstyled"
                          onClick={() => handleDistribute('vertical')}
                          disabled={!canAlignOrDistribute}
                          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-md bg-[var(--ui-element-bg)] hover:bg-[var(--ui-element-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {ICONS.DISTRIBUTE_VERTICAL} {t('vertical')}
                        </PanelButton>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                         <div>
                            <RadioGroup value={distributeMode} onChange={setDistributeMode}>
                              <RadioGroup.Label className={`${PANEL_CLASSES.label} text-[var(--text-primary)] font-semibold mb-1 block`}>{t('evenSpacing')}</RadioGroup.Label>
                              <div className={PANEL_CLASSES.segmentGroup}>
                                <RadioGroup.Option value="edges" className={({checked}) => `flex-1 text-center text-sm py-1 rounded-md cursor-pointer ${checked ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}>{t('edges')}</RadioGroup.Option>
                                <RadioGroup.Option value="centers" className={({checked}) => `flex-1 text-center text-sm py-1 rounded-md cursor-pointer ${checked ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}>{t('centers')}</RadioGroup.Option>
                              </div>
                            </RadioGroup>
                         </div>
                         <div>
                            <label htmlFor="dist-spacing" className={`${PANEL_CLASSES.label} text-[var(--text-primary)] font-semibold mb-1 block`}>{t('fixedSpacing')}</label>
                             <div className={`${PANEL_CLASSES.inputWrapper} w-full`}>
                              <input
                                id="dist-spacing"
                                type="number"
                                placeholder={t('auto')}
                                value={distributeSpacing}
                                onChange={(e) => setDistributeSpacing(e.target.value)}
                                className={`${PANEL_CLASSES.input} hide-spinners`}
                              />
                              <span className={PANEL_CLASSES.inputSuffix}>px</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </Popover.Panel>
            </Transition>
          </Popover>
      )}

      {canPerformBooleanOrMask && (
        <Popover className="relative">
            <Popover.Button
                as={PanelButton}
                title={t('booleanOps')}
                variant="unstyled"
                className="flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
            >
                {ICONS.BOOLEAN_UNION}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                <Popover.Panel className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-auto bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-2">
                    {({ close }) => (
                        <div className="flex items-center gap-1">
                            {booleanButtons.map(btn => (
                                <PanelButton
                                    key={btn.name}
                                    onClick={() => { onBooleanOperation(btn.name); close(); }}
                                    title={btn.title}
                                    variant="unstyled"
                                    className="flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                                >
                                    {btn.icon}
                                </PanelButton>
                            ))}
                        </div>
                    )}
                </Popover.Panel>
            </Transition>
        </Popover>
      )}

      {canPerformBooleanOrMask && (
        <PanelButton
          onClick={onMask}
          title={t('useTopAsMask')}
          variant="unstyled"
          className="flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
        >
          {ICONS.MASK}
        </PanelButton>
      )}

    </div>
  );
};
