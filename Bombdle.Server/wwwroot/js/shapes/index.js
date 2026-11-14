import { CubeShape } from './cube.js';

const SHAPES = {
  [CubeShape.id]: CubeShape,
};

export function getShape(shapeId) {
  const shape = SHAPES[shapeId];
  if (!shape) throw new Error(`Unknown shape '${shapeId}'. Is js/shapes/${shapeId}.js registered?`);
  return shape;
}
