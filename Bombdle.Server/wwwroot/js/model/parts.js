import {
  identity, compose, translation, rotationX, rotationY, rotationZ,
  transformPoint, transformDirection, sub, cross, normalize,
} from '../math3d.js';

const FACING = {
  '+z': identity(),
  '+x': rotationY(-Math.PI / 2),   // (x, y, z) -> (−z, y, x)
  '+y': rotationX(Math.PI / 2),    // (x, y, z) -> (x, −z, y)
};

const UV_REPEATS_PER_UNIT = 1;

const tokensOf = (name) => name.split(' ');
const has = (...tokens) => (name) => tokens.every((t) => tokensOf(name).includes(t));
const only = (token) => (name) => tokensOf(name).every((t) => t === token);
const hasBoltToken = (name) => tokensOf(name).some((t) => /^bolt\d*$/.test(t));
const KEYCAP = /^keycap_(\w)$/;

export const GROUPS = {
  base: only('base'),
  sidePanel: has('plate_side'),
  sidePanelBolt: (name) => has('plate_side_full')(name) && hasBoltToken(name),
  sideSecret: has('plate_side_secret'),
  capPanel: has('plate_top'),
  capPanelBolt: (name) => has('plate_top_full')(name) && hasBoltToken(name),
  capSecret: has('plate_top_secret'),
  bolt: only('bolt'),
  wirePad: only('wirepad'),
  wire: has('pasted__wire', 'wire_connectors'),
  wireConnector: (name) => has('wire_connectors')(name) && (has('pCube2')(name) || has('pCube3')(name)),
  keypad: only('keypad'),
  keycap: (name) => tokensOf(name).some((t) => KEYCAP.test(t)),
  safeBody: has('pCube4'),
  safeRing: has('pCylinder1'),
  safeHub: has('pCylinder2'),
  safePointer: has('pCylinder3'),
  safeGrip: has('pCylinder4'),
};

export function buildParts(groups) {
  const find = (key) => {
    const meshes = [...groups].filter(([name]) => GROUPS[key](name)).map(([, mesh]) => mesh);
    if (meshes.length === 0) throw new Error('The 3D model has no "${key}" part (see docs/MODELS.md §2).');
    return meshes;
  };

  const boltMeshes = find('bolt');
  return {
    base: makePart(find('base'), identity()),
    bolt: makePart(boltMeshes, placementOf(boltMeshes, '+z')),
    panels: {
      side: panelKind(find('sidePanel'), find('sidePanelBolt'), find('sideSecret'), '+z'),
      cap: panelKind(find('capPanel'), find('capPanelBolt'), find('capSecret'), '+y'),
    },
    wires: wireParts(find),
    keypad: keypadParts(groups, find),
    safe: safeParts(find),
  };
}

// Assemblies


function panelKind(plainMeshes, boltMeshes, secretMeshes, facing) {
  const placement = placementOf(plainMeshes, facing);
  const plain = makePart(plainMeshes, placement);
  const secret = makePart(secretMeshes, placementOf(secretMeshes, facing));

  const seats = boltMeshes.map((mesh) => {
    const { min, max } = boundsOf(cornersOf(mesh.positions).map((p) => transformPoint(placement, p)));
    return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, min[2]];
  });
  const lift = secret.max[2] - plain.max[2];

  return {
    plain,
    secret,
    seats,
    secretSeats: seats.map(([x, y, z]) => [x, y, z + lift]),
    front: plain.max[2],                 // where a module is mounted
    flatFront: flatFrontOf(plain),        // where scribbles go
    secretFlatFront: flatFrontOf(secret), // and on a bolted one
    recess: recessOf(plain),             // the hole the panel fills
  };
}

function recessOf(panel) {
  const back = facesBox(panel, (corner) => corner[2] < panel.min[2] + 1e-4);
  return {
    floor: [back.max[0] - back.min[0], back.max[1] - back.min[1]],
    mouth: [panel.max[0] - panel.min[0], panel.max[1] - panel.min[1]],
    depth: panel.max[2] - panel.min[2],
  };
}

export function recessLift(recess, [width, height, depth], margin = 0.005) {
  const needed = [width + 2 * margin, height + 2 * margin];
  const frontHeights = [0, 1].map((axis) => {
    const extra = needed[axis] - recess.floor[axis];
    return extra <= 0 ? 0 : (extra / (recess.mouth[axis] - recess.floor[axis])) * recess.depth;
  });
  return Math.max(0, Math.max(...frontHeights) - depth);
}

function flatFrontOf(panel) {
  const { min, max } = facesBox(panel, (corner) => corner[2] > panel.max[2] - 1e-4);
  return { halfWidth: Math.min(-min[0], max[0]), halfHeight: Math.min(-min[1], max[1]), z: panel.max[2] };
}

function wireParts(find) {
  const padMeshes = find('wirePad');
  const padPlacement = placementOf(padMeshes, '+x');
  const pad = makePart(padMeshes, padPlacement);

  const tube = makePart(find('wire'), padPlacement);
  const connectors = makePart(find('wireConnector'), padPlacement);
  const toRow = compose(
    rotationZ(-Math.PI / 2),
    translation(-(connectors.min[0] + connectors.max[0]) / 2, -(connectors.min[1] + connectors.max[1]) / 2, 0),
  );
  const unitTube = transformPart(tube, toRow);
  const unitConnectors = transformPart(connectors, toRow);

  return {
    pad,
    connectors: unitConnectors,
    left: keepTriangles(unitTube, (centroid) => centroid[0] < 0),
    right: keepTriangles(unitTube, (centroid) => centroid[0] >= 0),
    length: unitConnectors.max[0] - unitConnectors.min[0],
    depth: (unitTube.min[2] + unitTube.max[2]) / 2,
  };
}

function keypadParts(groups, find) {
  const bodyMeshes = find('keypad');
  const placement = placementOf(bodyMeshes, '+x');
  const body = makePart(bodyMeshes, placement);

  const keys = [...groups]
    .filter(([name]) => GROUPS.keycap(name))
    .map(([name, mesh]) => ({
      label: tokensOf(name).map((t) => t.match(KEYCAP)).find(Boolean)[1],
      part: makePart([mesh], placement),
    }));

  return { body, keys, display: frontFaceBox(body), plate: frontPlaneZ(body) };
}

function frontPlaneZ(part) {
  let z = -Infinity;
  forEachTriangle(part, (triangle, normal) => {
    if (normal[2] > 0.95 && triangle.some((c) => Math.abs(c[0] - part.min[0]) < 1e-4)) z = Math.max(z, triangle[0][2]);
  });
  return z;
}


function safeParts(find) {
  const bodyMeshes = find('safeBody');
  const placement = placementOf(bodyMeshes, '+x');
  const body = makePart(bodyMeshes, placement);

  const hubOnSheet = makePart(find('safeHub'), placement);
  const pivot = [(hubOnSheet.min[0] + hubOnSheet.max[0]) / 2, (hubOnSheet.min[1] + hubOnSheet.max[1]) / 2, 0];
  const toPivot = compose(translation(-pivot[0], -pivot[1], 0), placement);

  const ring = makePart(find('safeRing'), toPivot);
  const pointer = makePart(find('safePointer'), toPivot);
  const opener = makePart([...find('safeHub'), ...find('safePointer'), ...find('safeGrip')], toPivot);
  const hub = makePart(find('safeHub'), toPivot);
  const spokes = makePart([...find('safePointer'), ...find('safeGrip')], toPivot);

  const ringCorners = cornersOf(ring.positions);
  const outerRadius = Math.max(...ringCorners.map(([x, y]) => Math.hypot(x, y)));
  const innerRadius = Math.min(...ringCorners.map(([x, y]) => Math.hypot(x, y)));
  const sides = countSides(ringCorners, outerRadius);
  const step = (2 * Math.PI) / sides;

  const [cx, cy] = ringCorners.find(([x, y]) => Math.hypot(x, y) > outerRadius - 1e-3);
  const phase = positiveModulo(clockAngle(cx, cy) + step / 2, step);

  const pointerCorners = cornersOf(pointer.positions);
  const [ax, ay] = [0, 1].map((axis) => pointerCorners.reduce((sum, c) => sum + c[axis], 0) / pointerCorners.length);

  return {
    body,
    ring: withPlanarUvs(ring, outerRadius),
    opener,
    hub,
    spokes,
    pivot,
    outerRadius,
    innerRadius,
    sides,
    step,
    phase, // clock angle
    pointerAngle: clockAngle(ax, ay),
  };
}


// Building blocks

function placementOf(meshes, facing) {
  const turn = FACING[facing];
  const box = boundsOf(meshes.flatMap((m) => cornersOf(m.positions)).map((p) => transformPoint(turn, p)));
  return compose(
    translation(-(box.min[0] + box.max[0]) / 2, -(box.min[1] + box.max[1]) / 2, -box.min[2]),
    turn,
  );
}

function makePart(meshes, matrix) {
  const positions = [];
  const normals = [];
  for (const mesh of meshes) {
    for (const p of cornersOf(mesh.positions)) positions.push(...transformPoint(matrix, p));
    for (const n of cornersOf(mesh.normals)) normals.push(...transformDirection(matrix, n));
  }
  return finish(positions, normals);
}

export function transformPart(part, matrix) {
  return makePart([part], matrix);
}

function keepTriangles(part, test) {
  const positions = [];
  const normals = [];
  for (let i = 0; i < part.positions.length; i += 9) {
    const corners = [0, 3, 6].map((k) => part.positions.slice(i + k, i + k + 3));
    const centroid = [0, 1, 2].map((axis) => (corners[0][axis] + corners[1][axis] + corners[2][axis]) / 3);
    if (!test(centroid)) continue;
    positions.push(...part.positions.slice(i, i + 9));
    normals.push(...part.normals.slice(i, i + 9));
  }
  return finish(positions, normals);
}

function finish(positions, normals) {
  const { min, max } = boundsOf(cornersOf(positions));
  return { positions, normals, uvs: boxUvs(positions), min, max };
}

function boxUvs(positions) {
  const uvs = [];
  for (let i = 0; i < positions.length; i += 9) {
    const [a, b, c] = [0, 3, 6].map((k) => positions.slice(i + k, i + k + 3));
    const n = cross(sub(b, a), sub(c, a)).map(Math.abs);
    for (const [x, y, z] of [a, b, c]) {
      const [u, v] = n[2] >= n[0] && n[2] >= n[1] ? [x, -y] : n[0] >= n[1] ? [z, -y] : [x, z];
      uvs.push(u * UV_REPEATS_PER_UNIT, v * UV_REPEATS_PER_UNIT);
    }
  }
  return uvs;
}

function withPlanarUvs(part, radius) {
  const uvs = [];
  for (const [x, y] of cornersOf(part.positions)) uvs.push(0.5 + x / (2 * radius), 0.5 - y / (2 * radius));
  return { ...part, uvs };
}

function frontFaceBox(part) {
  return facesBox(part, (corner) => corner[2] > part.max[2] - 1e-4);
}

function facesBox(part, test) {
  const corners = [];
  forEachTriangle(part, (triangle) => {
    if (triangle.every(test)) corners.push(...triangle);
  });
  return boundsOf(corners);
}

function forEachTriangle(part, visit) {
  for (let i = 0; i < part.positions.length; i += 9) {
    const triangle = [0, 3, 6].map((k) => part.positions.slice(i + k, i + k + 3));
    visit(triangle, normalize(cross(sub(triangle[1], triangle[0]), sub(triangle[2], triangle[0]))));
  }
}

function countSides(corners, outerRadius) {
  const angles = new Set(corners
    .filter(([x, y]) => Math.hypot(x, y) > outerRadius - 1e-3)
    .map(([x, y]) => Math.round(positiveModulo(clockAngle(x, y), 2 * Math.PI) * 180 / Math.PI)));
  return angles.size;
}

export function clockAngle(x, y) {
  return Math.atan2(x, y);
}

function positiveModulo(a, m) {
  return ((a % m) + m) % m;
}

export function cornersOf(flat) {
  const corners = [];
  for (let i = 0; i < flat.length; i += 3) corners.push([flat[i], flat[i + 1], flat[i + 2]]);
  return corners;
}

export function boundsOf(points) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
    }
  }
  return { min, max };
}
