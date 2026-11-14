// Builds p5.Geometry objects from the parts tree returned by buildParts(). 
// Each part has a 'geometry' property with a p5.Geometry for that part's triangles, normals and UVs. 
// The geometry is used to draw the part in 3D with a texture.

const PART_DATA = new Set(['positions', 'normals', 'uvs', 'min', 'max', 'geometry']);

// Adds a 'geometry' property to every part in the tree, recursively.
export function attachGeometry(p, node) {
  if (Array.isArray(node)) {
    for (const item of node) attachGeometry(p, item);
  } else if (node && typeof node === 'object') {
    if (Array.isArray(node.positions)) node.geometry = toGeometry(p, node);
    for (const [key, value] of Object.entries(node)) {
      if (!PART_DATA.has(key)) attachGeometry(p, value);
    }
  }
  return node;
}

export function toGeometry(p, part) {
  const geometry = p.buildGeometry(() => {
    p.noStroke();
    p.fill(255);
    p.beginShape(p.TRIANGLES);
    for (let corner = 0; corner < part.positions.length / 3; corner++) {
      const i = corner * 3;
      p.normal(part.normals[i], part.normals[i + 1], part.normals[i + 2]);
      p.vertex(part.positions[i], part.positions[i + 1], part.positions[i + 2],
        part.uvs[corner * 2], part.uvs[corner * 2 + 1]);
    }
    p.endShape();
  });
  geometry.clearColors();
  return geometry;
}


export function quadGeometry(p, width, height, [u0, v0, u1, v1] = [0, 0, 1, 1]) {
  const [x0, x1, y0, y1] = [-width / 2, width / 2, -height / 2, height / 2];
  return toGeometry(p, {
    positions: [x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y0, 0, x1, y1, 0, x0, y1, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    uvs: [u0, v1, u1, v1, u1, v0, u0, v1, u1, v0, u0, v0],
  });
}
