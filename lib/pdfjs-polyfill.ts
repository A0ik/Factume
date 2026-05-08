// Polyfill for pdfjs-dist in Node.js environment
// @ts-ignore
class DOMMatrixPolyfill {
  constructor() {
    // @ts-ignore
    this.a = 1;
    // @ts-ignore
    this.b = 0;
    // @ts-ignore
    this.c = 0;
    // @ts-ignore
    this.d = 1;
    // @ts-ignore
    this.e = 0;
    // @ts-ignore
    this.f = 0;
  }

  static fromFloat32Array() { return new DOMMatrixPolyfill(); }
  static fromFloat64Array() { return new DOMMatrixPolyfill(); }
  static fromMatrix() { return new DOMMatrixPolyfill(); }
}

// @ts-ignore
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-ignore
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

// @ts-ignore
if (typeof globalThis.HTMLCanvasElement === 'undefined') {
  // @ts-ignore
  globalThis.HTMLCanvasElement = class HTMLCanvasElement {};
}
