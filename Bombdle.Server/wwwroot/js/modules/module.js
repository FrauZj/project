export class Module {
  constructor(dto, face, kit) {
    this.id = dto.id;
    this.type = dto.type;
    this.face = face;
    this.kit = kit;
    this.matrix = null;
    this.removed = false;
    this.hover = null;
    this.animationEndsAt = 0;
    this.carrier = null;
  }

  get mount() {
    return 'front';
  }

  get footprint() {
    return [0, 0, 0];
  }

  get replacesPanel() {
    return false;
  }

  render(p, now) {}

  renderDecals(p, now) {}

  pickables() {
    return [];
  }

  partAt(part, tool) {
    return null;
  }

  canUse(part, tool) {
    return false;
  }

  onClick(part, tool) {
    return this.partAt(part, tool);
  }

  get grabsPointer() {
    return false;
  }

  onPress(part, tool, ray) {
    return false;
  }

  onDrag(ray, pointerType) {}

  onRelease() {}

  onKey(key) {
    return false;
  }

  apply(target, verdict) {}

  describe(target, tool) {
    return `${this.type} ${target}`;
  }
}

export const P5 = p5.prototype;

const HOVER_GLOW = [110, 82, 20];

export function drawPart(p, part, look, matrix = null, glow = false) {
  p.push();
  if (matrix) p.applyMatrix(matrix);
  p.noStroke();
  if (look.texture) p.texture(look.texture);
  else p.fill(look.color);
  if (look.shine) {
    p.specularMaterial(look.shine);
    p.shininess(look.shininess ?? 30);
  }
  if (look.metal) p.metalness(look.metal);
  if (glow) p.emissiveMaterial(...HOVER_GLOW);
  p.model(part.geometry);
  p.pop();
}

export function drawDecal(p, quad, image, matrix) {
  p.push();
  p.applyMatrix(matrix);
  p.noStroke();
  p.texture(image);
  p.model(quad);
  p.pop();
}

export const DECAL_LIFT = 0.002;
