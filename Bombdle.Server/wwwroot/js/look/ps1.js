export const LINES = 240;

const GRAIN = 0.05;
const VIGNETTE = 0.22;

// Vertex wobble

const WOBBLE_HOOK = `(Vertex inputs) {
  vec4 clip = uProjectionMatrix * vec4(inputs.position, 1.0);
  if (uWobble > 0.5 && clip.w > 0.0) {
    vec2 perUnit = uCells * 0.5;  
    vec2 ndc = clip.xy / clip.w;
    vec2 delta = floor(ndc * perUnit + 0.5) / perUnit - ndc;
    inputs.position.x += delta.x * clip.w / uProjectionMatrix[0][0];
    inputs.position.y += delta.y * clip.w / uProjectionMatrix[1][1];
  }
  return inputs;
}`;

// GLSL ES 1.0 
const POST_FRAG = `
precision highp float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform vec2 uCells;
uniform float uTime;

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 cell = floor(vTexCoord * uCells);
  vec3 color = texture2D(tex0, (cell + 0.5) / uCells).rgb;

  color = floor(color * 31.0 + bayer4(gl_FragCoord.xy)) / 31.0;

  vec2 fromCentre = vTexCoord - 0.5;
  color *= 1.0 - ${VIGNETTE.toFixed(3)} * 2.0 * dot(fromCentre, fromCentre);
  color += (hash(gl_FragCoord.xy + fract(uTime) * 917.0) - 0.5) * ${(2 * GRAIN).toFixed(3)};

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export class Ps1Look {
  constructor(p) {
    this.p = p;
    this.enabled = true;
    this.stillGrain = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const cells = () => [LINES * (p.width / p.height), LINES];
    this.material = p.baseMaterialShader().modify({
      uniforms: {
        'vec2 uCells': cells,
        'float uWobble': () => (this.enabled ? 1 : 0),
      },
      'Vertex getCameraInputs': WOBBLE_HOOK, 
    });
    this.post = p.createFilterShader(POST_FRAG);
    this.cells = cells;
  }

  // debug toggle
  toggle() {
    this.enabled = !this.enabled;
  }

  beginScene() {
    this.p.shader(this.material);
  }

  // post process pass
  endScene(now) {
    if (!this.enabled) return;
    this.post.setUniform('uCells', this.cells());
    this.post.setUniform('uTime', this.stillGrain ? 0 : now / 1000);
    this.p.filter(this.post);
  }
}
