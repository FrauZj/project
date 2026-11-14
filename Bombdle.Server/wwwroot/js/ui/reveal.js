import { motion } from './motion.js';

const FLY_IN_MS = 520;
const FILE_MS = 380;

const RESTING = { transform: 'translate(0px, 0px) scale(1) rotate(-1.5deg)', opacity: 1 };

export class PaperReveal {
  constructor(overlay) {
    this.overlay = overlay;
    this.stage = overlay.querySelector('.reveal-paper'); 
    this.resolveTap = null;
    overlay.addEventListener('click', () => this.dismiss());
  }

  get isOpen() {
    return !this.overlay.classList.contains('hidden');
  }

  async show(paper, from, target) {
    this.stage.replaceChildren(paper);
    this.overlay.classList.remove('hidden');
    this.stage.scrollTop = 0;
    this.overlay.focus(); 

    const tapped = new Promise((resolve) => (this.resolveTap = resolve));
    const [fromX, fromY] = from ?? [window.innerWidth / 2, window.innerHeight * 1.5];
    const outOfCover = { transform: `${this.offsetTo(fromX, fromY)} scale(0.06) rotate(-30deg)`, opacity: 0.3 };
    await this.fly(outOfCover, RESTING, FLY_IN_MS, 'cubic-bezier(0.2, 0.9, 0.3, 1.1)');
    await tapped;

    const tab = target.getBoundingClientRect();
    const intoTab = { transform: `${this.offsetTo(tab.left + tab.width / 2, tab.top + tab.height / 2)} scale(0.05) rotate(12deg)`, opacity: 0 };
    await this.fly(RESTING, intoTab, FILE_MS, 'cubic-bezier(0.5, 0, 0.8, 0.4)');

    this.overlay.classList.add('hidden');
    for (const animation of this.stage.getAnimations()) animation.cancel();
    this.stage.replaceChildren();
  }

  dismiss() {
    this.resolveTap?.();
    this.resolveTap = null;
  }

  offsetTo(x, y) {
    const box = this.stage.getBoundingClientRect();
    return `translate(${x - (box.left + box.width / 2)}px, ${y - (box.top + box.height / 2)}px)`;
  }

  fly(from, to, ms, easing) {
    return this.stage.animate([from, to], { duration: motion(ms), easing, fill: 'forwards' }).finished;
  }
}
