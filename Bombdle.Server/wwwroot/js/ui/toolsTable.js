import { TOOLS } from '../tools.js';
import { motion } from './motion.js';

const ICONS = {
  none: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <g fill="#d8b07a">
      <rect class="body" x="19" y="13" width="7" height="25" rx="3.5"/>
      <rect class="body" x="26.5" y="8" width="7" height="30" rx="3.5"/>
      <rect class="body" x="34" y="10" width="7" height="28" rx="3.5"/>
      <rect class="body" x="41.5" y="15" width="7" height="23" rx="3.5"/>
      <rect class="body" x="7" y="31" width="19" height="8" rx="4" transform="rotate(38 24 38)"/>
      <rect class="body" x="18" y="27" width="31" height="25" rx="9"/>
    </g>
    <rect class="body" x="21" y="50" width="26" height="9" rx="2" fill="#7c8258"/>
    <g class="shade" fill="none" stroke-linecap="round">
      <path d="M21 16h3M28.5 11h3M36 13h3M43.5 18h3" stroke="#f3d6aa" stroke-width="2"/>
      <path d="M47 31v14a8 8 0 0 1-6 6" stroke="#a77f4c" stroke-width="2.4"/>
      <path d="M22 57.5h24" stroke="#565b3c" stroke-width="2.4"/>
    </g>
  </svg>`,

  wrench: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <g transform="rotate(-45 32 32)" fill="#bfc4ca">
      <rect class="body" x="14" y="28.5" width="32" height="7" rx="3.5"/>
      <path class="body" d="M59.2 28A10 10 0 1 0 59.2 36H50V28Z"/>
      <path class="body" fill-rule="evenodd" d="M5 32a8 8 0 1 0 16 0a8 8 0 1 0-16 0ZM8.8 32a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0-8.4 0Z"/>
      <g class="shade" stroke-linecap="round">
        <rect x="20" y="29.6" width="22" height="1.6" rx=".8" fill="#eef0f3"/>
        <rect x="20" y="33" width="22" height="1.6" rx=".8" fill="#7d838b"/>
        <path d="M42.6 27.2A9 9 0 0 1 51 23" stroke="#eef0f3" stroke-width="1.6" fill="none"/>
        <path d="M6.6 29.5A7 7 0 0 1 12 25.1" stroke="#eef0f3" stroke-width="1.4" fill="none"/>
      </g>
    </g>
  </svg>`,

  wireCutters: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <g transform="rotate(-45 32 32)">
      <g fill="#9aa1a9">
        <rect class="body" x="22" y="29.5" width="18" height="5" rx="2.5" transform="rotate(14 38 32)"/>
        <rect class="body" x="22" y="29.5" width="18" height="5" rx="2.5" transform="rotate(-14 38 32)"/>
      </g>
      <g fill="#c3423a">
        <rect class="body" x="4" y="28" width="22" height="8" rx="4" transform="rotate(14 38 32)"/>
        <rect class="body" x="4" y="28" width="22" height="8" rx="4" transform="rotate(-14 38 32)"/>
      </g>
      <path class="body" d="M36 28.6C46 26.4 54 27.4 60 31.6L38 33Z" fill="#b8bec5"/>
      <path class="body" d="M36 35.4C46 37.6 54 36.6 60 32.4L38 31Z" fill="#9aa1a9"/>
      <circle class="body" cx="38" cy="32" r="4" fill="#d6d9dd"/>
      <g class="shade">
        <rect x="7" y="29.4" width="16" height="1.8" rx=".9" fill="#ec8a80" transform="rotate(14 38 32)"/>
        <rect x="7" y="29.4" width="16" height="1.8" rx=".9" fill="#ec8a80" transform="rotate(-14 38 32)"/>
        <path d="M41 32H58.5" stroke="#5d636a" stroke-width=".8"/>
        <circle cx="38" cy="32" r="1.5" fill="#6b7178"/>
      </g>
    </g>
  </svg>`,
};

// A found tool falls into its slot from above
const DROP_IN = [
  { transform: 'translateY(-90px) rotate(-40deg)', opacity: 0 },
  { opacity: 1, offset: 0.35 },
  { transform: 'none', opacity: 1 },
];
const DROP_MS = 650;
const FLASH = [
  { boxShadow: '0 0 0 0 rgba(125, 216, 125, 0.9)' },
  { boxShadow: '0 0 0 14px rgba(125, 216, 125, 0)' },
];
const FLASH_MS = 1100;

const CURSOR_OFFSET = [14, 12];

export function toolIcon(toolId) {
  return ICONS[toolId] ?? '';
}

export class ToolsTable {
  constructor(tray, startingTools, onChange) {
    this.tool = 'none';
    this.available = new Set(['none', ...startingTools]);
    this.onChange = onChange;
    this.slots = new Map(); // tool id -> its slot 

    for (const tool of TOOLS) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'slot';
      slot.innerHTML = `<span class="slot-icon">${toolIcon(tool.id)}</span>` +
        `<span class="slot-label"><kbd>${tool.key.toUpperCase()}</kbd> ${tool.label}</span>`;
      slot.addEventListener('click', () => this.select(tool.id));
      tray.append(slot);
      this.slots.set(tool.id, slot);
    }
    this.refresh();
  }

  select(toolId) {
    if (!this.available.has(toolId)) return;
    this.tool = toolId;
    this.refresh();
    this.onChange(toolId);
  }

  add(toolId) {
    this.available.add(toolId);
    this.refresh();
    const slot = this.slots.get(toolId);
    if (!slot) return;
    slot.querySelector('svg').animate(DROP_IN, { duration: motion(DROP_MS), easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
    slot.animate(FLASH, { duration: motion(FLASH_MS), iterations: 2 });
  }

  refresh() {
    for (const { id, label, key } of TOOLS) {
      const slot = this.slots.get(id);
      const missing = !this.available.has(id);
      slot.disabled = missing;
      slot.classList.toggle('missing', missing);
      slot.classList.toggle('selected', id === this.tool);
      slot.setAttribute('aria-pressed', String(id === this.tool));
      slot.title = missing ? `${label}: not on the table. Maybe it's hidden somewhere...` : `${label} (key ${key.toUpperCase()})`;
    }
  }
}

// Icon of a tool in hand

export class ToolCursor {
  constructor(element, canvas) {
    this.element = element;
    this.tool = 'none';
    this.overCanvas = false;

    canvas.addEventListener('pointermove', (e) => {
      this.overCanvas = e.pointerType === 'mouse';
      if (this.overCanvas) {
        this.element.style.transform = `translate(${e.clientX + CURSOR_OFFSET[0]}px, ${e.clientY + CURSOR_OFFSET[1]}px)`;
      }
      this.refresh();
    });
    canvas.addEventListener('pointerleave', () => {
      this.overCanvas = false;
      this.refresh();
    });
  }

  setTool(toolId) {
    this.tool = toolId;
    this.element.innerHTML = toolIcon(toolId);
    this.refresh();
  }

  refresh() {
    this.element.classList.toggle('visible', this.overCanvas && this.tool !== 'none');
  }
}
