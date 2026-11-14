/**
 * tools list 
 */
export const TOOLS = [
  { id: 'none', label: 'Hand', key: 'h' },
  { id: 'screwdriver', label: 'Screwdriver', key: 's' },
  { id: 'wrench', label: 'Wrench', key: 'w' },
  { id: 'wireCutters', label: 'Wire cutters', key: 'c' },
];

export const FASTENER_TOOL = { bolt: 'wrench', screw: 'screwdriver' };

export function toolName(toolId) {
  return (TOOLS.find((t) => t.id === toolId)?.label ?? toolId).toLowerCase();
}

export function toolForKey(key) {
  return TOOLS.find((t) => t.key === key.toLowerCase());
}
