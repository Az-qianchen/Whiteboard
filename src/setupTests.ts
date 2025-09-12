import '@testing-library/jest-dom';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => ({
    measureText: () => ({ width: 0 } as TextMetrics),
  }),
});

