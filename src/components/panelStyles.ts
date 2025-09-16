export const PANEL_CLASSES = {
  section: 'panel-section',
  sectionTitle: 'panel-section-title',
  controlsRow: 'panel-controls',
  control: 'panel-control',
  label: 'panel-label',
  inputWrapper: 'panel-input-wrapper',
  input: 'panel-input',
  inputSuffix: 'panel-input-suffix',
  segmentGroup: 'panel-segmented',
  segmentGrid: 'panel-segmented-grid',
} as const;

export type PanelClassKey = keyof typeof PANEL_CLASSES;
