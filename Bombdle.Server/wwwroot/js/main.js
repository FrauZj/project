import { fetchPuzzle, fetchModel } from './api.js';
import { getShape } from './shapes/index.js';
import { parseObj } from './model/obj.js';
import { buildParts } from './model/parts.js';
import { attachGeometry } from './model/geometry.js';
import { makeTextures, makeLooks } from './model/textures.js';
import { Decals } from './model/decals.js';
import { scaling, compose, transformPoint } from './math3d.js';
import { cameraRay, toBombSpace, pickNearest, worldToScreen } from './picking.js';
import { Bomb } from './bomb.js';
import { Game } from './game.js';
import { toolName, toolForKey } from './tools.js';
import { EdgeDrawer, shieldFromSketch } from './ui/drawer.js';
import { ToolsTable, ToolCursor, toolIcon } from './ui/toolsTable.js';
import { Notes, paperElement } from './ui/notes.js';
import { PaperReveal } from './ui/reveal.js';
import { Ps1Look } from './look/ps1.js';

// World units per bomb unit
const WORLD_SCALE = 360;

const ROOT = scaling(WORLD_SCALE, -WORLD_SCALE, WORLD_SCALE);

const START_EYE = [420, -330, 560];

const FOV_Y = Math.PI / 3;     
const NEAR = 10;
const FAR = 10000;

const CLICK_SLOP = 6;
const FOUND_TOOL_MS = 1500;
const MODULE_NAMES = { wireSet: 'wire panel', keypad: 'keypad', safe: 'safe' };

const REQUESTED_DATE = new URLSearchParams(location.search).get('date');

//DOM helpers
function setStatus(state, text) {
  const el = document.getElementById('status');
  el.className = 'status ${state}';
  el.textContent = text;
}

function showOverlay(message) {
  document.getElementById('overlay-text').textContent = message;
  document.getElementById('overlay').classList.remove('hidden');
}

document.getElementById('retry-btn')?.addEventListener('click', () => {
  location.reload();
});

document.getElementById('outcome-close').addEventListener('click', () => {
  document.getElementById('outcome').classList.add('hidden');
});

function usePaperColours({ paper, marker }) {
  const style = document.documentElement.style;
  style.setProperty('--paper', paper.base);
  style.setProperty('--paper-line', paper.line);
  style.setProperty('--paper-margin', paper.margin);
  style.setProperty('--ink', paper.ink);
  style.setProperty('--marker', marker);
}

function waitUntil(t) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, t - performance.now())));
}

function moduleName(module) {
  const name = MODULE_NAMES[module.type] ?? module.type;
  return module.label ? '${name} ${module.label}' : name;
}

function countOf(n, noun) {
  return "${n} ${noun}${n === 1 ? '' : 's'}";
}

/** "a", "a and b", "a, b and c". */
function listOf(items) {
  return items.length < 2 ? items.join('') : '${items.slice(0, -1).join(', ')} and ${items.at(-1)}';
}

/** 102 345 ms -> "1:42.3". */
function clockOf(ms) {
  const tenths = Math.floor(ms / 100);
  return "${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}";
}

shieldFromSketch(document.getElementById('ui'));

new p5((p) => {
  let bomb = null;         
  let game = null;        
  let camera = null;       
  let tools = null;        
  let cursor = null;      
  let notes = null;        
  let seed = 0;            // the puzzle's seed
  let pointerOnCanvas = false; // hover picking
  let revealing = false;   // a panel is coming off
  let press = null;        // the press in progress
  let zone = null;         
  let look = null;         // Ps1Look

  const toolsDrawer = new EdgeDrawer(document.getElementById('tools'), 'bottom');
  const notesDrawer = new EdgeDrawer(document.getElementById('notes'), 'right');
  const notesTab = document.querySelector('#notes .drawer-tab');
  const reveal = new PaperReveal(document.getElementById('reveal'));

  // setup
  p.setup = async () => {
    p.createCanvas(window.innerWidth, window.innerHeight, p.WEBGL);
    p.angleMode(p.RADIANS);
    p.textureMode(p.NORMAL);
    p.textureWrap(p.REPEAT);

    camera = p.createCamera();
    camera.camera(...START_EYE, 0, 0, 0, 0, 1, 0);
    camera.perspective(FOV_Y, p.width / p.height, NEAR, FAR);
    p.setCamera(camera);

    // ps1 style graphics selection
    try {
      look = new Ps1Look(p);
    } catch (err) {
      console.warn('PS1 look off: ${err.message}');
    }

    listenForPointer(p.canvas);

    try {
      const [puzzle, modelText] = await Promise.all([fetchPuzzle(REQUESTED_DATE), fetchModel()]);
      const parts = attachGeometry(p, buildParts(parseObj(modelText)));
      const textures = makeTextures(p, puzzle.seed, parts);
      const kit = {
        parts,
        textures,
        looks: makeLooks(textures),
        palette: textures.palette,
        decals: new Decals(p, textures.palette, puzzle.seed),
      };

      seed = puzzle.seed;
      bomb = new Bomb(puzzle, getShape(puzzle.shapeId), kit);
      game = new Game(puzzle, bomb);
      usePaperColours(kit.palette);

      cursor = new ToolCursor(document.getElementById('tool-cursor'), p.canvas);
      tools = new ToolsTable(document.getElementById('tool-slots'), puzzle.startingTools, showToolInHand);
      showToolInHand(tools.tool);
      notes = new Notes(document.getElementById('notes-list'), document.getElementById('notes-count'));

      document.getElementById('puzzle-date').textContent = puzzle.date;
      document.getElementById('lamps').replaceChildren(...Array.from({ length: game.maxStrikes }, () => document.createElement('i')));
      renderNotes();
      updateMeta();
      setStatus('ready', 'defuse me');
    } catch (err) {
      game = null;
      setStatus('error', 'failed to load puzzle');
      showOverlay('Could not load the puzzle.\n${err.message}');
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
    camera.perspective(FOV_Y, p.width / p.height, NEAR, FAR);
  };

  // draw
  p.draw = () => {
    p.background(12, 14, 24);

    if (!game) return;

    if (!press?.module) p.orbitControl(1, 1, 0.5); // drag scroll stuff
    if (!p.mouseIsPressed) updateHover();

    const now = performance.now();
    look?.beginScene();
    setLights();
    p.push();
    p.applyMatrix(ROOT);
    bomb.render(p, now);
    p.pop();
    look?.endScene(now);
  };

  // Some placeholder lights 
  function setLights() {
    p.ambientLight(62, 64, 74);
    p.directionalLight(255, 242, 224, -0.45, 0.65, -0.6);
    p.directionalLight(70, 90, 125, 0.5, -0.2, 0.8);
    p.pointLight(70, 70, 70, camera.eyeX, camera.eyeY, camera.eyeZ);
  }

  // Picking, hovering and clicking actions

  function rayAt(x, y) {
    return toBombSpace(cameraRay(camera, FOV_Y, x, y, p.width, p.height), WORLD_SCALE);
  }

  function pickAt(x, y) {
    return pickNearest(rayAt(x, y), bomb.pickables());
  }

  // Every frame check for hover status
  function updateHover() {
    const looking = pointerOnCanvas && !revealing && !game.isOver;
    const hit = looking ? pickAt(p.mouseX, p.mouseY) : null;
    bomb.setHover(hit, tools.tool);
    zone = hit?.pickable.module?.grabsPointer ? hit.pickable.module : null;
    p.canvas.style.cursor = bomb.hovered ? 'pointer' : zone ? 'default' : 'grab';
  }

  function listenForPointer(canvas) {
    canvas.addEventListener('pointerenter', () => (pointerOnCanvas = true));
    canvas.addEventListener('pointerleave', () => (pointerOnCanvas = false));

    const canvasXY = (e) => {
      const box = canvas.getBoundingClientRect();
      return [e.clientX - box.left, e.clientY - box.top];
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary || e.button !== 0) {
        press = null;
        return;
      }
      const hit = game && !revealing ? pickAt(...canvasXY(e)) : null;
      const module = hit?.pickable.module?.grabsPointer ? hit.pickable.module : null;
      press = { x: e.clientX, y: e.clientY, module, dragging: false };
      if (module && !game.isOver) {
        press.dragging = module.onPress(hit.pickable.part, tools.tool, rayAt(...canvasXY(e)));
        if (press.dragging) {
          canvas.setPointerCapture(e.pointerId); // keep the dial even if the pointer leaves the canvas
          canvas.style.cursor = 'grabbing';
        }
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (press?.dragging && e.isPrimary) press.module.onDrag(rayAt(...canvasXY(e)), e.pointerType);
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!press || !e.isPrimary) return;
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
      endPress();
      if (moved <= CLICK_SLOP) handleClick(...canvasXY(e));
    });
    canvas.addEventListener('pointercancel', endPress);
  }

  function endPress() {
    if (press?.dragging) press.module.onRelease();
    press = null;
  }

  function handleClick(x, y) {
    if (!game || revealing) return;
    const hit = pickAt(x, y);
    if (!hit?.pickable.module) return;
    act(game.click(hit.pickable.module, hit.pickable.part, tools.tool));
  }

  async function act(judging) {
    try {
      const judged = await judging;
      if (!judged) return;
      showVerdict(judged);
      if (judged.revealed.length > 0 || judged.found.length > 0 || judged.modules.length > 0) await openCoverSequence(judged);
      if (game.isOver) showOutcome();
    } catch (err) {
      setStatus('error', 'server error: ${err.message}');
    }
  }

  // Animation plays

  async function openCoverSequence({ module, revealed, found }) {
    revealing = true;
    try {
      await waitUntil(module.animationEndsAt);

      for (const coverId of revealed) {
        const cover = bomb.module(coverId);
        const lines = game.notes.get(coverId).map((note) => note.text);
        await reveal.show(paperElement(coverTitle(cover), lines, seed ^ coverId), screenPointOf(cover), notesTab);
        renderNotes();
        notes.pulse();
      }

      if (found.length > 0) toolsDrawer.peekFor(FOUND_TOOL_MS);
      for (const tool of found) tools.add(tool);
    } finally {
      revealing = false;
    }
  }

  function screenPointOf(module) {
    const world = transformPoint(compose(ROOT, module.matrix), [0, 0, 0]);
    return worldToScreen(camera, FOV_Y, world, p.width, p.height);
  }

  // HUD
  function showVerdict({ module, target, tool, verdict, revealed, found, modules }) {
    let what = module.describe(target, tool);
    const inside = [
      ...modules.map((m) => 'a ${moduleName(m)}'),
      ...revealed.map((panelId) => countOf(game.notes.get(panelId).length, 'note')),
      ...found.map((t) => 'the ${toolName(t)}'),
    ];
    if (inside.length > 0) what += ': ${listOf(inside)} inside!';

    if (game.outcome === 'exploded') setStatus('error', 'BOOM! ${what}');
    else if (game.outcome === 'defused') setStatus('ready', 'DEFUSED! ${what}');
    else if (verdict === 'ok') setStatus('ready', '✓ ${what}');
    else if (verdict === 'strike') setStatus('error', '✗ strike: ${what}');
    else setStatus('loading', 'no effect: ${what}');
    updateMeta();
  }

  function updateMeta() {
    [...document.getElementById('lamps').children].forEach((lamp, i) => lamp.classList.toggle('lit', i < game.strikes));
    const found = [...bomb.modules.values()].filter((m) => m.type in MODULE_NAMES).length;
    const missing = ['screwdriver', 'wrench', 'wireCutters'].filter((t) => !game.tools.has(t)).map(toolName);
    document.getElementById('meta').textContent =
      "${countOf(found, 'module')} found" + (missing.length ? " * ${missing.join(', ')} missing" : '');
  }

  // Defused or exploded screens
  function showOutcome() {
    const defused = game.outcome === 'defused';
    const title = document.getElementById('outcome-title');
    title.textContent = defused ? 'Defused!' : 'BOOM!';
    title.className = defused ? 'won' : 'lost';
    document.getElementById('outcome-text').textContent =
      "${defused ? 'Time' : 'Lasted'} ${clockOf(game.elapsedMs)} * ${countOf(game.strikes, 'strike')} * ${countOf(game.actionCount, 'action')}";
    document.getElementById('outcome').classList.remove('hidden');
  }

  // tools and notes
  function showToolInHand(tool) {
    cursor.setTool(tool);
    document.getElementById('tools-tab-icon').innerHTML = toolIcon(tool);
    toolsDrawer.close();
  }

  function renderNotes() {
    const scribbles = [...bomb.modules.values()].filter((m) => m.type === 'clue').map((m) => m.text);
    const papers = [...game.notes].map(([coverId, list]) => ({
      title: coverTitle(bomb.module(coverId)),
      lines: list.map((note) => note.text),
      seed: seed ^ coverId,
    }));
    notes.render(scribbles, papers);
  }

  function coverTitle(cover) {
    return "Inside the ${cover.face.name} ${cover.face.kind === 'side' ? 'panel' : 'cover'}";
  }

  // keybinds
  window.addEventListener('keydown', (e) => {
    if (!game || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();

    if (reveal.isOpen) {
      if (key === 'enter' || key === ' ' || key === 'escape') {
        e.preventDefault();
        reveal.dismiss();
      }
      return;
    }

    if (key === 'escape') {
      if (toolsDrawer.isOpen || notesDrawer.isOpen) {
        toolsDrawer.close();
        notesDrawer.close();
      } else {
        tools.select('none');
      }
      return;
    }
    if (key === 't' || key === 'n') {
      (key === 't' ? toolsDrawer : notesDrawer).toggle();
      return;
    }
    if (key === 'g') {
      look?.toggle(); // TODO: remove switch later 
      return;         // the PS1 look off and on, to compare with the plain render
    }

    const used = zone && !revealing && !game.isOver ? zone.onKey(key) : false;
    if (used) {
      e.preventDefault();
      if (typeof used === 'string') act(game.send(zone, used, 'none'));
      return;
    }

    const tool = toolForKey(key);
    if (tool) tools.select(tool.id);
  });
});
