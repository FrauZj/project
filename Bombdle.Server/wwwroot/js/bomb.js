import { createModule } from './modules/index.js';
import { drawPart } from './modules/module.js';
import { recessLift } from './model/parts.js';
import { identity, compose, translation, frame, cross, scale, invert } from './math3d.js';

export class Bomb {
  constructor(puzzle, shape, kit) {
    this.kit = kit;
    this.faces = shape.faces.map((face) => this.buildFace(face, shape, puzzle));
    this.modules = new Map(this.faces.flatMap((f) => f.modules).map((m) => [m.id, m]));
    this.hovered = null;

    // difference between the solid parts of the bomb and the pickables of the modules
    this.solid = [
      { module: null, part: null, mesh: kit.parts.base, matrix: identity() },
      ...this.faces
        .filter((face) => face.plainPanel)
        .map((face) => ({ module: null, part: null, mesh: face.plainPanel, matrix: face.frame })),
    ].map((item) => ({ ...item, inverse: invert(item.matrix) }));
  }

  buildFace(face, shape, puzzle) {
    const panels = this.kit.parts.panels[face.kind];
    const faceFrame = frameOf(face, shape.mountDepth[face.kind]);
    const front = compose(faceFrame, translation(0, 0, panels.front));

    const dto = puzzle.faces.find((f) => f.id === face.id);
    const modules = (dto?.modules ?? []).map((m) => createModule(m, face, this.kit));
    for (const module of modules) module.matrix = module.mount === 'face' ? faceFrame : front;

    // A scribble on a bolted panel 
    const panel = modules.find((m) => m.replacesPanel) ?? null;
    for (const module of modules) if (module !== panel) module.carrier = panel;

    return {
      ...face,
      frame: faceFrame,
      modules,
      plainPanel: panel ? null : panels.plain,
    };
  }

  module(id) {
    return this.modules.get(id);
  }

  reveal(panelId, dto) {
    if (this.modules.has(dto.id)) return null;

    const panel = this.modules.get(panelId);
    const face = this.faces.find((f) => f.id === panel.face.id);
    const module = createModule(dto, face, this.kit);
    const lift = recessLift(this.kit.parts.panels[face.kind].recess, module.footprint);
    module.matrix = compose(face.frame, translation(0, 0, lift));

    face.modules.push(module);
    this.modules.set(module.id, module);
    return module;
  }

  render(p, now) {
    const looks = this.kit.looks;
    drawPart(p, this.kit.parts.base, looks.base);

    for (const face of this.faces) {
      if (face.plainPanel) drawPart(p, face.plainPanel, face.kind === 'cap' ? looks.cover : looks.panel, face.frame);
      for (const module of face.modules) inModuleSpace(p, module, () => module.render(p, now));
    }

    // Transparent decals last
    for (const module of this.modules.values()) inModuleSpace(p, module, () => module.renderDecals(p, now));
  }

  pickables() {
    const items = [...this.solid];
    for (const module of this.modules.values()) {
      for (const item of module.pickables()) {
        items.push({ module, part: item.part, mesh: item.mesh, matrix: compose(module.matrix, item.matrix) });
      }
    }
    return items;
  }


  setHover(hit, tool) {
    const module = hit?.pickable.module ?? null;
    const part = module && module.canUse(hit.pickable.part, tool) ? hit.pickable.part : null;
    const target = part ? module : null;

    if (this.hovered && this.hovered !== target) this.hovered.hover = null;
    if (target) target.hover = part;
    this.hovered = target;
  }
}

function inModuleSpace(p, module, draw) {
  p.push();
  p.applyMatrix(module.matrix);
  draw();
  p.pop();
}

function frameOf(face, depth) {
  const right = cross(face.up, face.normal);
  return frame(right, face.up, face.normal, scale(face.normal, depth));
}
