import '@testing-library/jest-dom';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    fillRect: () => undefined,
    clearRect: () => undefined,
    getImageData: () => ({ data: [] }),
    putImageData: () => undefined,
    createImageData: () => ({ data: [] }),
    setTransform: () => undefined,
    drawImage: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    closePath: () => undefined,
    stroke: () => undefined,
    translate: () => undefined,
    scale: () => undefined,
    rotate: () => undefined,
    arc: () => undefined,
    fill: () => undefined,
    measureText: () => ({ width: 0 }),
  }),
});

