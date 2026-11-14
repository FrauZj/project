import { seededRandom } from '../model/textures.js';
import { motion } from './motion.js';

const TEAR_POINTS = 28;
const TEAR_DEPTH = 9;

const PULSE = [{ transform: 'scale(1)' }, { transform: 'scale(1.7)' }, { transform: 'scale(1)' }];
const PULSE_MS = 450;

export class Notes {
  constructor(list, count) {
    this.list = list;
    this.count = count;
  }

  render(scribbles, papers) {
    const cards = [];
    if (scribbles.length > 0) cards.push(paperElement('Scribbled on the bomb', scribbles, 0, 'scribbles'));
    for (const { title, lines, seed } of papers) cards.push(paperElement(title, lines, seed));

    if (cards.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'notes-empty';
      empty.textContent = 'Nothing yet. Bolted covers have something inside.';
      cards.push(empty);
    }
    this.list.replaceChildren(...cards);

    const total = scribbles.length + papers.reduce((sum, paper) => sum + paper.lines.length, 0);
    this.count.textContent = String(total);
  }

  pulse() {
    this.count.animate(PULSE, { duration: motion(PULSE_MS), iterations: 2 });
  }
}


export function paperElement(title, lines, seed, kind = '') {
  const heading = document.createElement('h3');
  heading.textContent = title;

  const list = document.createElement('ul');
  for (const line of lines) {
    const item = document.createElement('li');
    item.textContent = line;
    list.append(item);
  }

  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.style.clipPath = tornEdge(seededRandom(seed));
  sheet.append(heading, list);

  const paper = document.createElement('div');
  paper.className = kind ? 'paper ${kind}' : 'paper';
  paper.append(sheet);
  return paper;
}

// Nice torn effect
function tornEdge(random) {
  const top = [];
  for (let i = 0; i <= TEAR_POINTS; i++) {
    const depth = 2 + random() * (TEAR_DEPTH - 2);
    top.push('${((100 * i) / TEAR_POINTS).toFixed(2)}% ${depth.toFixed(1)}px');
  }
  return 'polygon(${top.join(', ')}, 100% 100%, 0% 100%)';
}
