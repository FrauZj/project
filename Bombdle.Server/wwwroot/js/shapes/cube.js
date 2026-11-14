export const CubeShape = {
  id: 'cube',
  mountDepth: { side: 0.354, cap: 0.3 },
  faces: [
    { id: 0, name: 'front', kind: 'side', normal: [0, 0, 1], up: [0, 1, 0] },
    { id: 1, name: 'back', kind: 'side', normal: [0, 0, -1], up: [0, 1, 0] },
    { id: 2, name: 'right', kind: 'side', normal: [1, 0, 0], up: [0, 1, 0] },
    { id: 3, name: 'left', kind: 'side', normal: [-1, 0, 0], up: [0, 1, 0] },
    { id: 4, name: 'top', kind: 'cap', normal: [0, 1, 0], up: [0, 0, -1] },
    { id: 5, name: 'bottom', kind: 'cap', normal: [0, -1, 0], up: [0, 0, 1] },
  ],
};
