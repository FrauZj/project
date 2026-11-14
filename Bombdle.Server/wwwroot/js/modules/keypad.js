import { Module, drawPart, drawDecal, DECAL_LIFT } from './module.js';
import { identity, compose, translation } from '../math3d.js';
import { toolName } from '../tools.js';

const CODE_PREFIX = 'code:';
const KEY_PREFIX = 'key:';
const BODY = 'body';

const LEGEND_SIZE = 0.042;
const LETTER_SIZE = 0.05;

const KEY_TRAVEL = 0.006;
const KEY_PRESS_MS = 140;
const ERROR_MS = 900;

export class KeypadModule extends Module {
  constructor(dto, face, kit) {
    super(dto, face, kit);
    this.label = dto.label;
    this.codeLength = dto.codeLength;
    this.parts = kit.parts.keypad;
    this.colors = kit.palette.keypad;

    this.typed = '';
    this.solved = false;
    this.errorUntil = 0;
    this.pressedAt = new Map(); 

    const legendColor = (label) => (label === 'E' ? this.colors.enter : label === 'C' ? this.colors.clear : this.colors.legend);
    this.legendQuad = kit.decals.quad(LEGEND_SIZE, LEGEND_SIZE);
    this.keys = this.parts.keys.map(({ label, part }) => ({
      label,
      part,
      legendImage: kit.decals.legend(label, legendColor(label)),
      legendMatrix: translation((part.min[0] + part.max[0]) / 2, (part.min[1] + part.max[1]) / 2, part.max[2] + DECAL_LIFT),
    }));

    const { min, max } = this.parts.display;
    this.displayQuad = kit.decals.quad((max[0] - min[0]) * 0.94, (max[1] - min[1]) * 0.86);
    this.displayMatrix = translation((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, max[2] + DECAL_LIFT);

    if (this.label) {
      const keysBottom = Math.min(...this.parts.keys.map((key) => key.part.min[1]));
      this.letterQuad = kit.decals.quad(LETTER_SIZE, LETTER_SIZE);
      this.letterImage = kit.decals.stencil(this.label, this.colors.key);
      this.letterMatrix = translation(0, (keysBottom + this.parts.body.min[1]) / 2, this.parts.plate + DECAL_LIFT);
    }
  }

  get footprint() {
    const { min, max } = this.parts.body;
    return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  }

  get grabsPointer() {
    return true;
  }

  keyMatrix(key, now) {
    const since = now - (this.pressedAt.get(key.label) ?? -Infinity);
    const dip = since < KEY_PRESS_MS ? KEY_TRAVEL * Math.sin((Math.PI * since) / KEY_PRESS_MS) : 0;
    return translation(0, 0, -dip);
  }

  displayText(now) {
    if (this.solved) return 'OPEN';
    if (now < this.errorUntil) return 'ERR';
    return Array.from({ length: this.codeLength }, (_, i) => this.typed[i] ?? '-').join(' ');
  }

  render(p, now) {
    const looks = this.kit.looks;
    drawPart(p, this.parts.body, looks.keypadBody);
    for (const key of this.keys) {
      drawPart(p, key.part, looks.key, this.keyMatrix(key, now), this.hover === KEY_PREFIX + key.label);
    }
  }

  renderDecals(p, now) {
    for (const key of this.keys) {
      drawDecal(p, this.legendQuad, key.legendImage, compose(this.keyMatrix(key, now), key.legendMatrix));
    }
    const text = this.displayText(now);
    const color = text === 'ERR' ? this.colors.clear : this.colors.lcdOn;
    drawDecal(p, this.displayQuad, this.kit.decals.lcd(text, color), this.displayMatrix);
    if (this.label) drawDecal(p, this.letterQuad, this.letterImage, this.letterMatrix);
  }

  pickables() {
    const now = performance.now();
    return [
      { part: BODY, mesh: this.parts.body, matrix: identity() },
      ...this.keys.map((key) => ({ part: KEY_PREFIX + key.label, mesh: key.part, matrix: this.keyMatrix(key, now) })),
    ];
  }

  canUse(part, tool) {
    return tool === 'none' && !this.solved && part?.startsWith(KEY_PREFIX) === true;
  }

  onClick(part, tool) {
    if (tool !== 'none') return part;
    if (!part?.startsWith(KEY_PREFIX)) return null;
    return this.press(part.slice(KEY_PREFIX.length));
  }

  press(label) {
    if (this.solved) return null;
    this.pressedAt.set(label, performance.now());
    if (label === 'C') {
      this.typed = '';
      return null;
    }
    if (label === 'E') return this.typed.length === this.codeLength ? CODE_PREFIX + this.typed : null;
    if (this.typed.length < this.codeLength) this.typed += label;
    return null;
  }

  apply(target, verdict) {
    if (!target.startsWith(CODE_PREFIX)) return;
    if (verdict === 'ok') this.solved = true;
    else this.errorUntil = performance.now() + ERROR_MS;
    this.typed = '';
  }

  describe(target, tool) {
    const keypad = this.label ? `keypad ${this.label}` : 'the keypad';
    if (tool !== 'none' || !target.startsWith(CODE_PREFIX)) return `${toolName(tool)} on ${keypad}`;
    return `code ${target.slice(CODE_PREFIX.length)} on ${keypad}`;
  }
}
