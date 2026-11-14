import { Module, drawDecal, DECAL_LIFT } from './module.js';
import { identity, translation } from '../math3d.js';
import { boxMesh } from '../picking.js';

const SIZE = 0.4;
const DEPTH = 0.06;

export class PlaceholderModule extends Module {
  constructor(dto, face, kit) {
    super(dto, face, kit);
    this.mesh = boxMesh([-SIZE / 2, -SIZE / 2, 0], [SIZE / 2, SIZE / 2, DEPTH]);
    this.labelQuad = kit.decals.quad(SIZE * 0.8, SIZE * 0.2);
    this.labelImage = kit.decals.stencil(String(dto.type).toUpperCase(), '#ffd166');
    this.labelMatrix = translation(0, 0, DEPTH + DECAL_LIFT);
  }

  get footprint() {
    return [SIZE, SIZE, DEPTH];
  }

  render(p) {
    p.push();
    p.noStroke();
    p.fill('#3a3f4a');
    p.translate(0, 0, DEPTH / 2);
    p.box(SIZE, SIZE, DEPTH);
    p.pop();
  }

  renderDecals(p) {
    drawDecal(p, this.labelQuad, this.labelImage, this.labelMatrix);
  }

  pickables() {
    return [{ part: null, mesh: this.mesh, matrix: identity() }];
  }
}
