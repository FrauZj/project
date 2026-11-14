import { invert, transformPoint, transformDirection, sub, dot, cross, normalize } from './math3d.js';


const EPSILON = 1e-12;


export function cameraRay(camera, fovY, px, py, width, height) {
  const { eye, x, y, z } = cameraAxes(camera);

  const halfHeight = Math.tan(fovY / 2);
  const sx = ((2 * px) / width - 1) * halfHeight * (width / height);
  const sy = ((2 * py) / height - 1) * halfHeight;

  const dir = [0, 1, 2].map((i) => sx * x[i] + sy * y[i] - z[i]);
  return { origin: eye, dir: normalize(dir) };
}

export function worldToScreen(camera, fovY, point, width, height) {
  const { eye, x, y, z } = cameraAxes(camera);
  const d = sub(point, eye);
  const forward = -dot(d, z);
  if (forward <= 0) return null;

  const halfHeight = Math.tan(fovY / 2);
  const sx = dot(d, x) / forward;
  const sy = dot(d, y) / forward;
  return [
    ((sx / (halfHeight * (width / height)) + 1) * width) / 2,
    ((sy / halfHeight + 1) * height) / 2,
  ];
}

function cameraAxes(camera) {
  const eye = [camera.eyeX, camera.eyeY, camera.eyeZ];
  const z = normalize(sub(eye, [camera.centerX, camera.centerY, camera.centerZ]));
  const x = normalize(cross([camera.upX, camera.upY, camera.upZ], z));
  return { eye, x, y: cross(z, x), z };
}

// normalisation because of different initial direction
export function toBombSpace(ray, worldScale) {
  const [ox, oy, oz] = ray.origin;
  const [dx, dy, dz] = ray.dir;
  return {
    origin: [ox / worldScale, -oy / worldScale, oz / worldScale],
    dir: normalize([dx, -dy, dz]),
  };
}

export function pickNearest(ray, pickables) {
  let nearest = null;

  for (const pickable of pickables) {
    const inverse = pickable.inverse ?? invert(pickable.matrix);
    const local = {
      origin: transformPoint(inverse, ray.origin),
      dir: transformDirection(inverse, ray.dir),
    };
    if (!hitsBox(local, pickable.mesh.min, pickable.mesh.max)) continue;

    const t = nearestTriangle(local, pickable.mesh.positions);
    if (t === null) continue;

    const point = transformPoint(pickable.matrix, local.origin.map((o, i) => o + t * local.dir[i]));
    const distance = dot(sub(point, ray.origin), ray.dir);
    if (distance > 0 && (!nearest || distance < nearest.distance)) nearest = { pickable, distance, point };
  }

  return nearest;
}

function nearestTriangle(ray, positions) {
  let best = null;
  for (let i = 0; i < positions.length; i += 9) {
    const t = intersectTriangle(ray, positions, i);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

function intersectTriangle({ origin, dir }, p, i) {
  const a = [p[i], p[i + 1], p[i + 2]];
  const e1 = [p[i + 3] - a[0], p[i + 4] - a[1], p[i + 5] - a[2]];
  const e2 = [p[i + 6] - a[0], p[i + 7] - a[1], p[i + 8] - a[2]];
  const q = cross(dir, e2);
  const det = dot(e1, q);
  if (Math.abs(det) < EPSILON) return null; 

  const s = sub(origin, a);
  const b1 = dot(s, q) / det;
  if (b1 < 0 || b1 > 1) return null;

  const r = cross(s, e1);
  const b2 = dot(dir, r) / det;
  if (b2 < 0 || b1 + b2 > 1) return null;

  const t = dot(e2, r) / det;
  return t > 0 ? t : null; //behind the ray's start
}

function hitsBox({ origin, dir }, min, max) {
  let near = -Infinity;
  let far = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(dir[axis]) < EPSILON) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return false;
      continue;
    }
    let t0 = (min[axis] - origin[axis]) / dir[axis];
    let t1 = (max[axis] - origin[axis]) / dir[axis];
    if (t0 > t1) [t0, t1] = [t1, t0];
    near = Math.max(near, t0);
    far = Math.min(far, t1);
    if (near > far) return false;
  }
  return far > 0;
}

export function boxMesh(min, max) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const quads = [
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], // front
    [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], // back
    [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], // top
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], // bottom
    [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], // right
    [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], // left
  ];
  const positions = quads.flatMap(([a, b, c, d]) => [...a, ...b, ...c, ...a, ...c, ...d]);
  return { positions, min, max };
}
