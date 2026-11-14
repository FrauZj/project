//tools list
export const TOOLS = [
  { id: 'none', label: 'Hand', key: '1' },
  { id: 'wrench', label: 'Wrench', key: '2' },
  { id: 'wireCutters', label: 'Wire cutters', key: '3' },
];

export const FASTENER_TOOL = { bolt: 'wrench' };

export function toolName(toolId) {
  return (TOOLS.find((t) => t.id === toolId)?.label ?? toolId).toLowerCase();
}

export function toolForKey(key) {
  return TOOLS.find((t) => t.key === key.toLowerCase());
}
