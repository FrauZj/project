// Parses a Wavefront OBJ file into a Map of named meshes, each with positions and normals.
export function parseObj(text) {
  const positions = [];
  const normals = [];
  const groups = new Map();
  let group = null;

  for (const rawLine of text.split('\n')) {
    const words = rawLine.trim().split(/\s+/);
    switch (words[0]) {
      case 'v':
        positions.push(words.slice(1, 4).map(Number));
        break;
      case 'vn':
        normals.push(words.slice(1, 4).map(Number));
        break;
      case 'g':
        group = groupNamed(groups, words.slice(1).join(' '));
        break;
      case 'f':
        if (group) addFace(group, words.slice(1), positions, normals);
        break;
      default:
        break; // vt, s, mtllib, usemtl, comments
    }
  }
  // Due to how maya does its exports, some groups may be empty, so we remove them.
  for (const [name, mesh] of groups) if (mesh.positions.length === 0) groups.delete(name);
  return groups;
}

function groupNamed(groups, name) {
  if (!groups.has(name)) groups.set(name, { positions: [], normals: [] });
  return groups.get(name);
}

function addFace(group, corners, positions, normals) {
  const refs = corners.map((corner) => {
    const [v, , vn] = corner.split('/');
    return { position: positions[index(v, positions)], normal: vn ? normals[index(vn, normals)] : null };
  });

  for (let i = 1; i + 1 < refs.length; i++) {
    const triangle = [refs[0], refs[i], refs[i + 1]];
    const flat = flatNormal(triangle.map((r) => r.position));
    for (const ref of triangle) {
      group.positions.push(...ref.position);
      group.normals.push(...(ref.normal ?? flat));
    }
  }
}

function index(text, list) {
  const n = Number(text);
  return n < 0 ? list.length + n : n - 1;
}

// When there is no normal
function flatNormal([a, b, c]) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...n) || 1;
  return n.map((x) => x / length);
}
