import { quadGeometry } from './geometry.js';
import { bakeTexture, paintLegend, paintStencil, paintMarker, paintLcd, seededRandom } from './textures.js';

const LEGEND_PX = 128;
const STENCIL_PX = 128;
const MARKER_HEIGHT_PX = 256;
const LCD_PX = [256, 80];

export class Decals {
  constructor(p, palette, seed) {
    this.p = p;
    this.palette = palette;
    this.random = seededRandom(seed ^ 0x5c0ffee); 
    this.cache = new Map();
  }

  quad(width, height) {
    return this.cached(`quad:${width}:${height}`, () => quadGeometry(this.p, width, height));
  }

  legend(text, color) {
    return this.cached(`legend:${text}:${color}`, () =>
      bakeTexture(this.p, LEGEND_PX, LEGEND_PX, (ctx, size) => paintLegend(ctx, size, text, color)));
  }

  stencil(text, color) {
    return this.cached(`stencil:${text}:${color}`, () =>
      bakeTexture(this.p, STENCIL_PX, STENCIL_PX, (ctx, w, h) => paintStencil(ctx, w, h, text, color)));
  }

  marker(text, aspect) {
    const width = Math.round(MARKER_HEIGHT_PX * aspect);
    return this.cached(`marker:${text}:${width}`, () =>
      bakeTexture(this.p, width, MARKER_HEIGHT_PX, (ctx, w, h) => paintMarker(ctx, w, h, text, this.palette.marker, this.random)));
  }

  lcd(text, color = this.palette.keypad.lcdOn) {
    return this.cached(`lcd:${text}:${color}`, () =>
      bakeTexture(this.p, ...LCD_PX, (ctx, w, h) => paintLcd(ctx, w, h, text, this.palette.keypad, color)));
  }

  cached(key, make) {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key);
  }
}
