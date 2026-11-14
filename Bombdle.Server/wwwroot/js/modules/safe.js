import { Module, drawPart, drawDecal, DECAL_LIFT } from './module.js';
import { identity, compose, translation, rotationZ, invert, transformPoint, transformDirection } from '../math3d.js';
import { clockAngle } from '../model/parts.js';
import { toolName } from '../tools.js';

const COMBO_PREFIX = 'combo:';

const HUB = 'hub';
const DIAL = 'dial';
const BODY = 'body';

const STEP_MOUSE = (20 * Math.PI) / 180;
const STEP_TOUCH = (30 * Math.PI) / 180;
const ERROR_MS = 900;

const LETTER_SIZE = 0.08;
const LETTER_INSET = 0.065;
const READOUT_SIZE = [0.14, 0.045];
const READOUT_INSET = [0.082, 0.041];

export class SafeModule extends Module {
  constructor(dto, face, kit) {
    super(dto, face, kit);
    this.label = dto.label;
    this.dialSize = dto.dialSize;
    this.parts = kit.parts.safe;
    this.colors = kit.palette.keypad;
    if (this.parts.sides !== this.dialSize) {
      console.warn(`The safe model has ${this.parts.sides} sides, but the dial has ${this.dialSize} numbers.`);
    }

    this.number = this.dialSize;
    this.phase = 'idle';
    this.left = null;
    this.right = null;
    this.open = false;
    this.errorUntil = 0;
    this.drag = null;

    const [x, y] = this.parts.pivot;
    this.ringMatrix = translation(x, y, 0);
    this.dialZ = this.parts.ring.max[2];   

    const { min, max } = this.parts.body;
    if (this.label) {
      this.letterQuad = kit.decals.quad(LETTER_SIZE, LETTER_SIZE);
      this.letterImage = kit.decals.stencil(this.label, kit.palette.safe.text);
      this.letterMatrix = translation(min[0] + LETTER_INSET, max[1] - LETTER_INSET, max[2] + DECAL_LIFT);
    }
    this.readoutQuad = kit.decals.quad(...READOUT_SIZE);
    this.readoutMatrix = translation(max[0] - READOUT_INSET[0], max[1] - READOUT_INSET[1], max[2] + DECAL_LIFT);
  }

  get footprint() {
    const { min, max } = this.parts.body;
    return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  }

  get grabsPointer() {
    return true;
  }

  angleOf(n) {
    return this.parts.phase + (n - 1) * this.parts.step;
  }

  openerMatrix() {
    const clockwise = this.angleOf(this.number) - this.parts.pointerAngle;
    return compose(this.ringMatrix, rotationZ(-clockwise)); // rotationZ turns anticlockwise
  }

  readoutText(now) {
    if (this.open) return 'OPEN';
    if (now < this.errorUntil) return 'ERR';
    if (this.phase === 'right') return `${this.left}-${this.right}`;
    if (this.phase === 'left') return `L ${this.left}`;
    return String(this.number);
  }

  render(p, now) {
    const looks = this.kit.looks;
    const glow = this.hover === HUB || this.hover === DIAL;
    drawPart(p, this.parts.body, looks.safeBody);
    drawPart(p, this.parts.ring, looks.dial, this.ringMatrix, this.hover === DIAL);
    drawPart(p, this.parts.opener, looks.opener, this.openerMatrix(), glow);
  }

  renderDecals(p, now) {
    const text = this.readoutText(now);
    const color = text === 'ERR' ? this.colors.clear : this.colors.lcdOn;
    drawDecal(p, this.readoutQuad, this.kit.decals.lcd(text, color), this.readoutMatrix);
    if (this.label) drawDecal(p, this.letterQuad, this.letterImage, this.letterMatrix);
  }

  pickables() {
    const opener = this.openerMatrix();
    return [
      { part: BODY, mesh: this.parts.body, matrix: identity() },
      { part: DIAL, mesh: this.parts.ring, matrix: this.ringMatrix },
      { part: DIAL, mesh: this.parts.spokes, matrix: opener },
      { part: HUB, mesh: this.parts.hub, matrix: opener },
    ];
  }

  canUse(part, tool) {
    return tool === 'none' && !this.open && (part === HUB || part === DIAL);
  }

  onClick(part, tool) {
    if (tool !== 'none') return part; // a tool on the safe: the server ignores it
    return part === HUB ? this.attempt() : null;
  }

  attempt() {
    if (this.open || this.phase !== 'right') return null;
    return `${COMBO_PREFIX}${this.left}-${this.right}`;
  }

  onPress(part, tool, ray) {
    if (tool !== 'none' || this.open || part !== DIAL) return false;
    const angle = this.angleOn(ray);
    if (angle === null) return false;
    this.drag = { angle, pending: 0 };
    return true;
  }

  onDrag(ray, pointerType) {
    const angle = this.angleOn(ray);
    if (!this.drag || angle === null) return;
    this.drag.pending += wrapAngle(angle - this.drag.angle);
    this.drag.angle = angle;

    const step = pointerType === 'touch' ? STEP_TOUCH : STEP_MOUSE;
    while (Math.abs(this.drag.pending) >= step) {
      const clockwise = this.drag.pending > 0;
      this.drag.pending -= clockwise ? step : -step;
      this.turn(clockwise ? 'right' : 'left');
    }
  }

  onRelease() {
    this.drag = null;
  }

  turn(direction) {
    if (this.open) return;
    this.number = ((this.number - 1 + (direction === 'right' ? 1 : -1) + this.dialSize) % this.dialSize) + 1;
    if (direction === 'left') {
      this.phase = 'left';
      this.left = this.number;
      this.right = null;
    } else if (this.phase !== 'idle') {
      this.phase = 'right';
      this.right = this.number;
    }
  }

  onKey(key) {
    if (this.open) return false;
    if (key === 'arrowleft') this.turn('left');
    else if (key === 'arrowright') this.turn('right');
    else if (key === 'enter') return this.attempt() ?? true;
    else return false;
    return true;
  }

  angleOn(ray) {
    const inverse = invert(this.matrix);
    const origin = transformPoint(inverse, ray.origin);
    const dir = transformDirection(inverse, ray.dir);
    if (Math.abs(dir[2]) < 1e-9) return null;
    const t = (this.dialZ - origin[2]) / dir[2];
    const [px, py] = this.parts.pivot;
    return clockAngle(origin[0] + t * dir[0] - px, origin[1] + t * dir[1] - py);
  }

  apply(target, verdict) {
    if (!target.startsWith(COMBO_PREFIX)) return; 
    if (verdict === 'ok') {
      this.open = true;
    } else {
      this.errorUntil = performance.now() + ERROR_MS;
      this.phase = 'idle';
      this.left = null;
      this.right = null;
    }
  }

  describe(target, tool) {
    const safe = this.label ? `safe ${this.label}` : 'the safe';
    if (tool !== 'none' || !target.startsWith(COMBO_PREFIX)) return `${toolName(tool)} on ${safe}`;
    return `combination ${target.slice(COMBO_PREFIX.length)} on ${safe}`;
  }
}

function wrapAngle(angle) {
  return angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
}
