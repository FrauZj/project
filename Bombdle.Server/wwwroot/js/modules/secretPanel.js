import { Module, drawPart } from './module.js';
import { identity, compose, translation, rotationY, rotationZ, scaling } from '../math3d.js';
import { toolName, FASTENER_TOOL } from '../tools.js';

const PANEL_TARGET = 'panel';

const UNSCREW_TIME = 420;
const BOLT_STAGGER = 90;
const LIFT_TIME = 480;

const BOLT_TURNS = 3;
const BOLT_RISE = 0.07;
const LIFT_HEIGHT = 0.12;
const AWAY_DISTANCE = 0.9;
const TUMBLE = Math.PI / 5;

export class SecretPanelModule extends Module {
  constructor(dto, face, kit) {
    super(dto, face, kit);
    this.fastener = dto.fastener;
    this.panel = kit.parts.panels[face.kind];
    this.bolt = kit.parts.bolt;

    this.openedAt = null;
    this.liftStart = (this.panel.secretSeats.length - 1) * BOLT_STAGGER + UNSCREW_TIME;
    this.openTime = this.liftStart + LIFT_TIME;
  }

  get mount() {
    return 'face';
  }

  get replacesPanel() {
    return true;
  }

  coverMatrix(t) {
    const v = clamp01((t - this.liftStart) / LIFT_TIME);
    if (v === 0) return identity();

    const rise = LIFT_HEIGHT * easeOut(Math.min(1, v * 2));
    const away = easeIn(Math.max(0, v * 2 - 1));
    const middle = this.panel.secret.max[2] / 2;
    return compose(
      translation(AWAY_DISTANCE * away, 0, rise + middle),
      rotationY(-TUMBLE * away),          
      scaling(1 - away),
      translation(0, 0, -middle),
    );
  }

  boltMatrix(i, t) {
    const [x, y, z] = this.panel.secretSeats[i];
    const u = clamp01((t - i * BOLT_STAGGER) / UNSCREW_TIME);
    return compose(
      this.coverMatrix(t),
      translation(x, y, z + BOLT_RISE * u),
      rotationZ(BOLT_TURNS * 2 * Math.PI * u), 
    );
  }

  panelMatrixAt(now) {
    const t = this.removed ? now - this.openedAt : 0;
    return t >= this.openTime ? null : this.coverMatrix(t);
  }

  render(p, now) {
    const t = this.removed ? now - this.openedAt : 0;
    if (t >= this.openTime) return; 

    const glow = this.hover === PANEL_TARGET;
    drawPart(p, this.panel.secret, this.kit.looks.cover, this.coverMatrix(t), glow);
    this.panel.secretSeats.forEach((_, i) => {
      drawPart(p, this.bolt, this.kit.looks.bolt, this.boltMatrix(i, t), glow);
    });
  }

  pickables() {
    if (this.removed) return [];
    return [
      { part: PANEL_TARGET, mesh: this.panel.secret, matrix: this.coverMatrix(0) },
      ...this.panel.secretSeats.map((_, i) => ({ part: PANEL_TARGET, mesh: this.bolt, matrix: this.boltMatrix(i, 0) })),
    ];
  }

  partAt(part, tool) {
    return part === PANEL_TARGET && tool !== 'none' ? PANEL_TARGET : null;
  }

  canUse(part, tool) {
    return part === PANEL_TARGET && tool === FASTENER_TOOL[this.fastener];
  }

  apply(target, verdict) {
    if (verdict !== 'ok') return;
    this.removed = true;
    this.openedAt = performance.now();
    this.animationEndsAt = this.openedAt + this.openTime;
  }

  describe(target, tool) {
    return `${toolName(tool)} on the ${this.face.name} ${this.face.kind === 'side' ? 'panel' : 'cover'}`;
  }
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function easeOut(x) {
  return 1 - (1 - x) * (1 - x);
}

function easeIn(x) {
  return x * x;
}
