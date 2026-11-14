// This generates the textures for the bomb's parts, and the material presets for drawPart().
export const PALETTES = {
  fieldKit: {
    label: 'Field kit',
    base: { base: '#4b5233', light: '#7c8258', dark: '#2a2f1c' },
    panel: { base: '#7c828a', light: '#b5bac1', dark: '#4e545c' },
    cover: { base: '#3b402e', light: '#6d7457', dark: '#21251a' },
    pad: { base: '#1e5a3a', trace: '#c8964a', silk: '#e7efe2', hole: '#0c2317' },
    bolt: '#c9cdd3',
    connector: '#c39a45',
    keypad: { body: '#26292e', key: '#d9d5ca', legend: '#17191d', enter: '#2e9c5a', clear: '#c3423a', lcd: '#0f2419', lcdOn: '#7df0a3' },
    safe: { body: '#1c1d21', chrome: '#c7ccd2', chromeDark: '#666b72', text: '#f4f2ec', tick: '#24262a', index: '#d93b2f' },
    marker: '#1d2c7c',
    paper: { base: '#f3edde', line: '#a8c0d8', margin: '#d98c8c', ink: '#22304f' },
  },
  workshop: {
    label: 'Workshop',
    base: { base: '#d8a51f', light: '#f2cd5c', dark: '#8a6a12' },
    panel: { base: '#a9aeb4', light: '#d8dce0', dark: '#6f747a' },
    cover: { base: '#1f2023', light: '#4a4c52', dark: '#0d0d0f', stripes: '#e0b021' },
    pad: { base: '#1b3f73', trace: '#d9c27a', silk: '#f2f2f2', hole: '#0b1a33' },
    bolt: '#b8bcc2',
    connector: '#b78b39',
    keypad: { body: '#1d1f23', key: '#efe9da', legend: '#141518', enter: '#2e9c5a', clear: '#d0452d', lcd: '#21200d', lcdOn: '#ffd166' },
    safe: { body: '#2a2b2f', chrome: '#d4d7db', chromeDark: '#73777d', text: '#111214', tick: '#8c9096', index: '#e0b021' },
    marker: '#16161a',
    paper: { base: '#fbf7ea', line: '#b7c9de', margin: '#e09a9a', ink: '#1b1b22' },
  },
  prototype: {
    label: 'Prototype',
    base: { base: '#8e959d', light: '#c1c7ce', dark: '#5d636a' },
    panel: { base: '#c3c7cc', light: '#eceef0', dark: '#8a8f95' },
    cover: { base: '#a3271d', light: '#d0503f', dark: '#5c140f' },
    pad: { base: '#22262b', trace: '#d47a3a', silk: '#dde3ea', hole: '#0c0e10' },
    bolt: '#d6d9dd',
    connector: '#c9a24b',
    keypad: { body: '#e6e7e9', key: '#2b2e33', legend: '#f1f2f4', enter: '#3fbf73', clear: '#e5533f', lcd: '#101418', lcdOn: '#6fd3ff' },
    safe: { body: '#e3e5e8', chrome: '#9aa0a7', chromeDark: '#555a61', text: '#15171a', tick: '#7a7f86', index: '#a3271d' },
    marker: '#a3271d',
    paper: { base: '#f7f7f4', line: '#c9d6e6', margin: '#e3a3a3', ink: '#1f2a44' },
  },
};

export const PALETTE = PALETTES.fieldKit;

export const HANDWRITING = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// baking

export function bakeTexture(p, width, height, paint) {
  const g = p.createGraphics(width, height);
  g.pixelDensity(1);   // a texture needs exactly width x height pixels, whatever the screen's density
  g.clear();
  paint(g.drawingContext, width, height);
  const image = g.get();
  g.remove();
  return image;
}

export function makeTextures(p, seed, parts, palette = PALETTE) {
  const random = seededRandom(seed);
  return {
    palette,
    base: bakeTexture(p, 512, 512, (ctx, size) => paintPaintedMetal(ctx, size, palette.base, random)),
    panel: bakeTexture(p, 512, 512, (ctx, size) => paintBrushedMetal(ctx, size, palette.panel, random)),
    cover: bakeTexture(p, 512, 512, (ctx, size) => paintCoverPlate(ctx, size, palette.cover, random)),
    pad: bakeTexture(p, 512, 512, (ctx, size) => paintCircuitBoard(ctx, size, palette.pad, random)),
    dial: bakeTexture(p, 1024, 1024, (ctx, size) => paintDialFace(ctx, size, palette.safe, parts.safe)),
  };
}

// Material presets for drawPart()

export function makeLooks(textures) {
  const palette = textures.palette;
  return {
    base: { texture: textures.base, shine: [40, 40, 40], shininess: 8 },
    panel: { texture: textures.panel, shine: [130, 130, 130], shininess: 30 },
    cover: { texture: textures.cover, shine: [60, 60, 60], shininess: 12 },
    pad: { texture: textures.pad, shine: [70, 70, 70], shininess: 20 },
    bolt: { color: palette.bolt, shine: [255, 255, 255], shininess: 60, metal: 0.7 },
    connector: { color: palette.connector, shine: [255, 235, 180], shininess: 50, metal: 0.6 },
    keypadBody: { color: palette.keypad.body, shine: [30, 30, 30], shininess: 5 },
    key: { color: palette.keypad.key, shine: [90, 90, 90], shininess: 20 },
    safeBody: { color: palette.safe.body, shine: [80, 80, 80], shininess: 25 },
    dial: { texture: textures.dial, shine: [210, 210, 210], shininess: 50 },
    opener: { color: palette.safe.chrome, shine: [255, 255, 255], shininess: 80, metal: 0.8 },
  };
}


export function paintPaintedMetal(ctx, size, colors, random) {
  ctx.fillStyle = colors.base;
  ctx.fillRect(0, 0, size, size);

  // Found this cool function for making metal pain look a little realistic
  for (let i = 0; i < 26; i++) {
    const radius = size * (0.08 + random() * 0.22);
    const color = random() < 0.5 ? colors.light : colors.dark;
    const alpha = 0.06 + random() * 0.08;
    wrapped(size, random() * size, random() * size, radius, (x, y) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, withAlpha(color, alpha));
      gradient.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
  }

  speckle(ctx, size, colors, random, size * 5);
  scratches(ctx, size, colors.light, random, 22);
}

export function paintBrushedMetal(ctx, size, colors, random) {
  ctx.fillStyle = colors.base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < size * 1.5; i++) {
    const y = Math.floor(random() * size);
    const length = size * (0.2 + random() * 0.8);
    const x = random() * size;
    ctx.fillStyle = withAlpha(random() < 0.5 ? colors.light : colors.dark, 0.025 + random() * 0.05);
    for (const dx of [-size, 0]) ctx.fillRect(x + dx, y, length, 2);
  }

  scratches(ctx, size, colors.light, random, 8);
}

export function paintCoverPlate(ctx, size, colors, random) {
  paintPaintedMetal(ctx, size, colors, random);
  if (!colors.stripes) return;

  const period = size / 4;
  ctx.save();
  ctx.fillStyle = withAlpha(colors.stripes, 0.85);
  for (let k = -4; k < 8; k++) {
    ctx.beginPath();
    ctx.moveTo(k * period, 0);
    ctx.lineTo(k * period + period / 2, 0);
    ctx.lineTo(k * period + period / 2 - size, size);
    ctx.lineTo(k * period - size, size);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  speckle(ctx, size, colors, random, size * 2);
}

/** A circuit board for the wire pad: copper traces with 45 bends, pads and silkscreen marks. */
export function paintCircuitBoard(ctx, size, colors, random) {
  ctx.fillStyle = colors.base;
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, { light: colors.silk, dark: colors.hole }, random, size * 2);

  const grid = size / 16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 22; i++) {
    const x0 = Math.floor(random() * 16) * grid;
    const y0 = Math.floor(random() * 16) * grid;
    const run = (2 + Math.floor(random() * 5)) * grid;
    const bend = (1 + Math.floor(random() * 3)) * grid * (random() < 0.5 ? -1 : 1);
    const points = [[x0, y0], [x0 + run, y0], [x0 + run + Math.abs(bend), y0 + bend], [x0 + run * 2 + Math.abs(bend), y0 + bend]];

    ctx.strokeStyle = withAlpha(colors.trace, 0.75);
    ctx.lineWidth = grid * 0.18;
    ctx.beginPath();
    points.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();

    for (const [x, y] of [points[0], points[3]]) {
      ctx.fillStyle = colors.trace;
      ctx.beginPath();
      ctx.arc(x, y, grid * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.hole;
      ctx.beginPath();
      ctx.arc(x, y, grid * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = withAlpha(colors.silk, 0.55);
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const w = grid * (1 + Math.floor(random() * 3));
    const h = grid * (0.6 + random());
    ctx.strokeRect(Math.floor(random() * 14) * grid, Math.floor(random() * 14) * grid, w, h);
  }
}

// Safe dial face

export function paintDialFace(ctx, size, colors, dial) {
  const centre = size / 2;
  const perUnit = size / (2 * dial.outerRadius);
  const inner = dial.innerRadius * perUnit;
  const outer = dial.outerRadius * perUnit;

  const chrome = ctx.createRadialGradient(centre, centre, inner, centre, centre, outer);
  chrome.addColorStop(0, colors.chromeDark);
  chrome.addColorStop(0.35, colors.chrome);
  chrome.addColorStop(0.7, colors.chromeDark);
  chrome.addColorStop(1, colors.chrome);
  ctx.fillStyle = chrome;
  ctx.fillRect(0, 0, size, size);

  const middle = (inner + outer) / 2;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 ${Math.round((outer - inner) * 0.6)}px "Arial Narrow", Arial, sans-serif';
  for (let k = 0; k < dial.sides; k++) {
    const angle = dial.phase + k * dial.step;     // clockwise from straight up
    ctx.save();
    ctx.translate(centre + middle * Math.sin(angle), centre - middle * Math.cos(angle));
    ctx.rotate(angle);
    ctx.fillText(String(k + 1), 0, 0);
    ctx.restore();
  }

  ctx.strokeStyle = colors.tick;
  ctx.lineWidth = Math.max(2, size / 300);
  for (let k = 0; k < dial.sides; k++) {
    const angle = dial.phase + (k + 0.5) * dial.step;
    ctx.beginPath();
    ctx.moveTo(centre + (outer - (outer - inner) * 0.18) * Math.sin(angle), centre - (outer - (outer - inner) * 0.18) * Math.cos(angle));
    ctx.lineTo(centre + outer * Math.sin(angle), centre - outer * Math.cos(angle));
    ctx.stroke();
  }
}


export function paintLegend(ctx, size, text, color) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 ${Math.round(size * 0.8)}px Arial, sans-serif';
  ctx.fillText(text, size / 2, size * 0.54);
}

export function paintLcd(ctx, width, height, text, colors, glow = colors.lcdOn) {
  ctx.fillStyle = colors.lcd;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = glow;
  ctx.shadowColor = glow;
  ctx.shadowBlur = height * 0.12;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold ${Math.round(height * 0.62)}px Consolas, "Courier New", monospace';
  ctx.fillText(text, width / 2, height * 0.55);
}

export function paintStencil(ctx, width, height, text, color) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 ${Math.round(height * 0.8)}px Impact, "Arial Black", sans-serif';
  ctx.fillText(text, width / 2, height * 0.54);
}

export function paintMarker(ctx, width, height, text, color, random) {
  ctx.clearRect(0, 0, width, height);

  let size = Math.round(height * 0.36);
  let lines;
  for (;;) {
    ctx.font = 'bold ${size}px ${HANDWRITING}';
    lines = wrapText(ctx, text, width * 0.94);
    if (lines.length * size * 1.15 <= height * 0.92 || size <= 8) break;
    size = Math.floor(size * 0.9);
  }
  const lineHeight = size * 1.15;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((random() - 0.5) * 0.06);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lineHeight));
  ctx.restore();
}


// Helpers

function wrapped(size, x, y, reach, draw) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      const px = x + dx;
      const py = y + dy;
      if (px > -reach && px < size + reach && py > -reach && py < size + reach) draw(px, py);
    }
  }
}

function speckle(ctx, size, colors, random, count) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = withAlpha(random() < 0.5 ? colors.light : colors.dark, 0.05 + random() * 0.12);
    const s = random() < 0.85 ? 1 : 2;
    ctx.fillRect(Math.floor(random() * size), Math.floor(random() * size), s, s);
  }
}

function scratches(ctx, size, color, random, count) {
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const length = size * (0.02 + random() * 0.1);
    const angle = random() * Math.PI;
    const alpha = 0.12 + random() * 0.2;
    wrapped(size, random() * size, random() * size, length, (x, y) => {
      ctx.strokeStyle = withAlpha(color, alpha);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    });
  }
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? '${line} ${word}' : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})';
}
