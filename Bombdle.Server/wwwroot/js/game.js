import { replay } from './api.js';

export class Game {
  constructor(puzzle, bomb) {
    this.date = puzzle.date;
    this.maxStrikes = puzzle.maxStrikes;
    this.bomb = bomb;
    this.tools = new Set(puzzle.startingTools);
    this.notes = new Map();
    this.log = [];
    this.strikes = 0;
    this.outcome = 'inProgress';
    this.elapsedMs = 0;
    this.actionCount = 0;
    this.busy = false;
    this.startedAt = performance.now();
  }

  get isOver() {
    return this.outcome !== 'inProgress';
  }

  elapsed() {
    return Math.round(performance.now() - this.startedAt);
  }

  async click(module, part, tool) {
    if (this.busy || this.isOver || !module) return null;

    const target = module.onClick(part, tool);
    return target ? this.send(module, target, tool) : null;
  }

  async send(module, target, tool) {
    if (this.busy || this.isOver) return null;

    const action = { t: this.elapsed(), tool, moduleId: module.id, target };
    this.busy = true;
    try {
      const result = await replay(this.date, [...this.log, action]);
      this.log.push(action);
      const news = this.applyResult(result, this.log.length - 1);
      return { module, target, tool, verdict: result.results.at(-1), ...news };
    } finally {
      this.busy = false;
    }
  }


  applyResult(result, from = 0) {
    const modules = [];
    for (const { panelId, module } of result.revealedModules) {
      const created = this.bomb.reveal(panelId, module);
      if (created) modules.push(created);
    }

    for (let i = from; i < this.log.length; i++) {
      const verdict = result.results[i];
      if (verdict === 'ignored') continue;
      const { moduleId, target } = this.log[i];
      this.bomb.module(moduleId)?.apply(target, verdict);
    }
    this.strikes = result.strikes;
    this.outcome = result.outcome;
    this.elapsedMs = result.elapsedMs;
    this.actionCount = result.actionCount;

    const revealed = []; // ids of panels whose paper is new
    for (const note of result.revealed) {
      const paper = this.notes.get(note.panelId) ?? [];
      if (paper.some((n) => n.moduleId === note.moduleId)) continue;
      if (paper.length === 0) revealed.push(note.panelId);
      paper.push({ moduleId: note.moduleId, text: note.text });
      this.notes.set(note.panelId, paper);
    }

    const found = result.foundTools.map((t) => t.tool).filter((tool) => !this.tools.has(tool));
    for (const tool of found) this.tools.add(tool);

    return { revealed, found, modules };
  }
}
