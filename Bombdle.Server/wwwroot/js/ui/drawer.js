//Cosmetic stuff

const DWELL_MS = 300;
const LEAVE_MS = 400;
const EDGE_PX = 16;
const SWIPE_PX = 40;

const INWARD = { bottom: [0, -1], right: [-1, 0] };

export class EdgeDrawer {
  constructor(element, edge) {
    this.element = element;
    this.edge = edge;
    this.tab = element.querySelector('.drawer-tab');
    this.mode = null;       // null = closed
    this.timers = new Map(); 

    this.tab.addEventListener('click', () => this.toggle());
    window.addEventListener('pointermove', (e) => this.followMouse(e), { capture: true });

    this.strip = document.createElement('div');
    this.strip.className = `edge-strip edge-${edge}`;
    element.after(this.strip);
    const inward = INWARD[edge];
    onSwipe(this.strip, inward, () => this.open('pinned'));
    onSwipe(this.tab, inward, () => this.open('pinned'));
    onSwipe(element, [-inward[0], -inward[1]], () => this.close());

    this.refresh();
  }

  get isOpen() {
    return this.mode !== null;
  }

  open(mode) {
    this.cancel('dwell');
    this.cancel('leave');
    if (this.mode === 'pinned' && mode === 'peek') return;
    this.mode = mode;
    this.refresh();
  }

  close() {
    for (const name of [...this.timers.keys()]) this.cancel(name);
    this.mode = null;
    this.refresh();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open('pinned');
  }

  peekFor(ms) {
    if (this.mode === 'pinned') return;
    this.open('peek');
    this.later('leave', ms, () => this.close());
  }

  followMouse(e) {
    if (e.pointerType !== 'mouse') return;
    const { clientX: x, clientY: y } = e;

    if (this.mode === null) {
      if (this.onEdge(x, y) && e.buttons === 0) {
        if (!this.timers.has('dwell')) this.later('dwell', DWELL_MS, () => this.open('peek'));
      } else {
        this.cancel('dwell');
      }
    } else if (this.mode === 'peek') {
      if (this.onEdge(x, y) || [this.element, this.tab].some((el) => isInside(el, x, y))) this.cancel('leave');
      else if (!this.timers.has('leave')) this.later('leave', LEAVE_MS, () => this.close());
    }
  }

  onEdge(x, y) {
    const nearBottom = window.innerHeight - y <= EDGE_PX;
    return this.edge === 'bottom' ? nearBottom : window.innerWidth - x <= EDGE_PX && !nearBottom;
  }

  refresh() {
    this.element.classList.toggle('open', this.isOpen);
    this.tab.setAttribute('aria-expanded', String(this.isOpen));
  }

  later(name, ms, action) {
    this.cancel(name);
    this.timers.set(name, setTimeout(() => {
      this.timers.delete(name);
      action();
    }, ms));
  }

  cancel(name) {
    clearTimeout(this.timers.get(name));
    this.timers.delete(name);
  }
}


export function shieldFromSketch(element) {
  for (const type of ['pointerdown', 'pointermove', 'wheel']) {
    element.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
  }
}

function onSwipe(element, [dx, dy], action) {
  let start = null;
  element.addEventListener('pointerdown', (e) => {
    start = e.pointerType === 'mouse' ? null : { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  element.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const mx = e.clientX - start.x;
    const my = e.clientY - start.y;
    const along = mx * dx + my * dy;
    const across = Math.abs(mx * dy - my * dx);
    if (along >= SWIPE_PX && along > across) {
      start = null;
      action();
    }
  });
  for (const type of ['pointerup', 'pointercancel']) element.addEventListener(type, () => (start = null));
}

function isInside(element, x, y) {
  const box = element.getBoundingClientRect();
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}
