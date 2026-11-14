import { Module, drawPart, drawDecal, DECAL_LIFT } from './module.js';
import { identity, compose, translation, rotationZ } from '../math3d.js';
import { boxMesh } from '../picking.js';
import { toolName } from '../tools.js';

const WIRE_PREFIX = 'wire:';

const ROWS_TOP = 0.205;
const ROWS_BOTTOM = -0.235;

const HIT_HEIGHT = 0.04;
const HIT_DEPTH = 0.05;

const CUT_SWING = 0.32;   
const CUT_TIME = 260;     
const BEAD_RADIUS = 0.008;

const PAINT = {
  red: '#d8343a',
  blue: '#2f6fe8',
  green: '#2a9a5e',
  yellow: '#f0c22c',
  white: '#eceff4',
  black: '#1b1d22',
};

const VERDICT_MARK = { ok: '#7dd87d', strike: '#ff5b5b' };

export class WireSetModule extends Module {
  constructor(dto, face, kit) {
    super(dto, face, kit);
    this.label = dto.label;
    this.wires = [...dto.wires].sort((a, b) => a.position - b.position); // row 0 = top wire
    this.cuts = new Map(); 

    this.unit = kit.parts.wires;
    const { length, depth } = this.unit;
    this.hitBox = boxMesh([-length / 2, -HIT_HEIGHT / 2, depth - HIT_DEPTH / 2], [length / 2, HIT_HEIGHT / 2, depth + HIT_DEPTH / 2]);

    const pad = this.unit.pad;
    if (this.label) {
      this.labelQuad = kit.decals.quad(0.06, 0.06);
      this.labelImage = kit.decals.stencil(this.label, kit.palette.pad.silk);
      this.labelMatrix = translation(0, pad.max[1] - 0.034, pad.max[2] + DECAL_LIFT);
    }
  }

  get footprint() {
    const { min, max } = this.unit.pad;
    return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  }

  get grabsPointer() {
    return true;
  }

  wireMatrix(row) {
    const y = ROWS_TOP - ((row + 0.5) * (ROWS_TOP - ROWS_BOTTOM)) / this.wires.length;
    return compose(translation(0, y, 0), rotationZ((this.wires[row].tilt * Math.PI) / 180));
  }

  render(p, now) {
    const looks = this.kit.looks;
    drawPart(p, this.unit.pad, looks.pad);

    this.wires.forEach((wire, row) => {
      const matrix = this.wireMatrix(row);
      const cut = this.cuts.get(wire.position);
      const glow = this.hover === WIRE_PREFIX + wire.position;
      const look = { color: PAINT[wire.color] ?? wire.color, shine: [110, 110, 110], shininess: 40 };

      const swing = cut ? CUT_SWING * Math.min(1, (now - cut.at) / CUT_TIME) : 0;
      drawPart(p, this.unit.left, look, compose(matrix, swingAbout(this.unit.left.min[0], -swing)), glow);
      drawPart(p, this.unit.right, look, compose(matrix, swingAbout(this.unit.right.max[0], swing)), glow);
      drawPart(p, this.unit.connectors, looks.connector, matrix);

      if (cut) drawBead(p, compose(matrix, translation(0, -0.012, this.unit.depth)), VERDICT_MARK[cut.verdict]);
    });
  }

  renderDecals(p) {
    if (this.label) drawDecal(p, this.labelQuad, this.labelImage, this.labelMatrix);
  }

  pickables() {
    const items = [{ part: null, mesh: this.unit.pad, matrix: identity() }];
    this.wires.forEach((wire, row) => {
      if (!this.cuts.has(wire.position)) {
        items.push({ part: WIRE_PREFIX + wire.position, mesh: this.hitBox, matrix: this.wireMatrix(row) });
      }
    });
    return items;
  }

  partAt(part, tool) {
    return tool !== 'none' && part?.startsWith(WIRE_PREFIX) ? part : null;
  }

  canUse(part, tool) {
    return tool === 'wireCutters' && part?.startsWith(WIRE_PREFIX) === true;
  }

  apply(target, verdict) {
    this.cuts.set(positionOf(target), { verdict, at: performance.now() });
  }

  describe(target, tool) {
    const wire = this.wires.find((w) => w.position === positionOf(target));
    const panel = this.label ? 'wires ${this.label}' : 'the wire panel';
    const what = "the ${wire?.color ?? 'unknown'} wire (${panel})";
    return tool === 'wireCutters' ? 'cut ${what}' : '${toolName(tool)} on ${what}';
  }
}

function positionOf(target) {
  return Number(target.slice(WIRE_PREFIX.length));
}

function swingAbout(x, angle) {
  return compose(translation(x, 0, 0), rotationZ(angle), translation(-x, 0, 0));
}

function drawBead(p, matrix, color) {
  p.push();
  p.applyMatrix(matrix);
  p.noStroke();
  p.fill(color);
  p.emissiveMaterial(color);
  p.sphere(BEAD_RADIUS, 12, 8);
  p.pop();
}
