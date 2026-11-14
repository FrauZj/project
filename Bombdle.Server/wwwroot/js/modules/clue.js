import { Module, drawDecal, DECAL_LIFT } from './module.js';
import { identity, compose, translation } from '../math3d.js';

const FILL_WIDTH = 0.94;
const BOLT_CLEARANCE = 0.06;

export class ClueModule extends Module {
  constructor(dto, face, kit) {
    super(dto, face, kit);
    this.text = dto.text;
    this.decal = null; 
  }

  get mount() {
    return 'face';
  }

  renderDecals(p, now) {
    if (this.decal === null) this.decal = this.makeDecal() ?? false;
    if (!this.decal) return;

    const panelMatrix = this.carrier ? this.carrier.panelMatrixAt(now) : identity();
    if (!panelMatrix) return;
    drawDecal(p, this.decal.quad, this.decal.image, compose(panelMatrix, this.decal.placement));
  }


  makeDecal() {
    const panels = this.kit.parts.panels[this.face.kind];
    const front = this.carrier ? panels.secretFlatFront : panels.flatFront;
    if (!front) return null;

    const boltsAt = Math.min(...panels.seats.map(([, y]) => Math.abs(y)));
    const width = 2 * front.halfWidth * FILL_WIDTH;
    const height = 2 * Math.min(front.halfHeight, boltsAt - BOLT_CLEARANCE);
    return {
      quad: this.kit.decals.quad(width, height),
      image: this.kit.decals.marker(this.text, width / height),
      placement: translation(0, 0, front.z + DECAL_LIFT),
    };
  }

  describe() {
    return 'a scribbled clue';
  }
}
