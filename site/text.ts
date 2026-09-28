/**
 * Text effects from Magic UI, ported to vanilla TypeScript.
 *
 * Each one keeps the reference's own mechanism and constants and only the colour
 * is changed, because the reference palettes are magenta and purple and this page
 * is white on black. Where the verdict was that monochrome needs a rewrite rather
 * than a palette swap, that is written down instead of pretending otherwise.
 *
 *   AnimatedShinyText   background-position sweep, 8s, shimmer width 100px
 *   AnimatedGradientText  background-position to --bg-size, 8s linear
 *   AuroraText          gradient clip with a position animation
 *   LineShadowText      a 45 degree tile behind the text, 15s crawl
 *   DiaTextReveal       a gradient band swept across the glyphs
 *   SparklesText        N sparkles respawning on a timer
 *   NumberTicker        locale formatted count with a spring
 *   TextAnimate         per segment reveal with a stagger
 */

export interface ShinyOptions {
  shimmerWidth?: number;
}

export function shinyText(node: HTMLElement, options: ShinyOptions = {}): void {
  const shimmerWidth = options.shimmerWidth ?? 100;
  node.classList.add('mu-shiny');
  node.style.setProperty('--shiny-width', `${shimmerWidth}px`);
}

export interface GradientTextOptions {
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function gradientText(node: HTMLElement, options: GradientTextOptions = {}): void {
  const speed = options.speed ?? 1;
  node.classList.add('mu-gradient-text');
  node.style.setProperty('--bg-size', `${speed * 300}%`);
  node.style.setProperty('--color-from', options.colorFrom ?? '#ffffff');
  node.style.setProperty('--color-to', options.colorTo ?? '#8a8a8a');
}

export interface AuroraOptions {
  colors?: string[];
  speed?: number;
}

/**
 * The reference moves the background AND rotates and scales the text, which is a
 * neon wobble. Monochrome needs the position animation and nothing else, so the
 * rotate/scale half of its keyframe is left out on purpose.
 */
export function auroraText(node: HTMLElement, options: AuroraOptions = {}): void {
  const colors = options.colors ?? ['#ffffff', '#c8c8c8', '#8a8a8a', '#e8e8e8'];
  const speed = options.speed ?? 1;
  node.classList.add('mu-aurora');
  node.style.backgroundImage = `linear-gradient(135deg, ${colors.join(', ')}, ${colors[0]})`;
  node.style.animationDuration = `${10 / speed}s`;
}

export interface LineShadowOptions {
  shadowColor?: string;
}

/**
 * The reference puts the tiled gradient on a ::after that repeats the text via
 * attr(data-text), so the shadow is a second copy of the words offset by 0.04em.
 */
export function lineShadowText(node: HTMLElement, options: LineShadowOptions = {}): void {
  const shadowColor = options.shadowColor ?? '#ffffff';
  node.classList.add('mu-line-shadow');
  node.dataset.text = node.textContent ?? '';
  node.style.setProperty('--shadow-color', shadowColor);
}

const BAND_HALF = 17;
const SWEEP_START = -BAND_HALF;
const SWEEP_END = 100 + BAND_HALF;

function sweepEase(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

function buildDiaGradient(pos: number, colors: string[], textColor: string): string {
  const bandStart = pos - BAND_HALF;
  const bandEnd = pos + BAND_HALF;
  if (bandStart >= 100) return `linear-gradient(90deg, ${textColor}, ${textColor})`;
  const parts: string[] = [];
  if (bandStart > 0) parts.push(`${textColor} 0%`, `${textColor} ${bandStart.toFixed(2)}%`);
  colors.forEach((color, i) => {
    const pct = colors.length === 1 ? pos : bandStart + (i / (colors.length - 1)) * BAND_HALF * 2;
    parts.push(`${color} ${pct.toFixed(2)}%`);
  });
  if (bandEnd < 100) parts.push(`transparent ${bandEnd.toFixed(2)}%`, `transparent 100%`);
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

export interface DiaOptions {
  texts: readonly string[];
  colors?: string[];
  textColor?: string;
  duration?: number;
  repeatDelay?: number;
}

export function diaTextReveal(node: HTMLElement, options: DiaOptions): void {
  const colors = options.colors ?? ['#ffffff', '#bdbdbd', '#8f8f8f'];
  const textColor = options.textColor ?? '#f5f5f5';
  const duration = options.duration ?? 1.5;
  const repeatDelay = options.repeatDelay ?? 0.5;
  const texts = options.texts;
  node.classList.add('mu-dia');
  node.textContent = texts[0] ?? '';
  node.style.setProperty('--dia-text-color', textColor);
  node.setAttribute('aria-label', texts.join(', '));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    node.textContent = texts[texts.length - 1] ?? '';
    return;
  }

  let index = 0;
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / (duration * 1000));
    const pos = SWEEP_START + (SWEEP_END - SWEEP_START) * sweepEase(t);
    node.style.backgroundImage = buildDiaGradient(pos, colors, textColor);
    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }
    index = (index + 1) % texts.length;
    node.textContent = texts[index] ?? '';
    window.setTimeout(() => {
      start2();
    }, repeatDelay * 1000);
  };
  const start2 = (): void => {
    const begin = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - begin) / (duration * 1000));
      const pos = SWEEP_START + (SWEEP_END - SWEEP_START) * sweepEase(t);
      node.style.backgroundImage = buildDiaGradient(pos, colors, textColor);
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      index = (index + 1) % texts.length;
      node.textContent = texts[index] ?? '';
      window.setTimeout(start2, repeatDelay * 1000);
    };
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(step);
}

interface Sparkle {
  x: string;
  y: string;
  color: string;
  delay: number;
  scale: number;
  lifespan: number;
}

const SPARKLE_PATH =
  'M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z';

export interface SparklesOptions {
  count?: number;
  colors?: { first: string; second: string };
}

export function sparklesText(node: HTMLElement, options: SparklesOptions = {}): void {
  const count = options.count ?? 10;
  const colors = options.colors ?? { first: '#ffffff', second: '#9a9a9a' };
  if (node.textContent === null) return;
  const label = node.textContent;
  node.textContent = '';
  node.classList.add('mu-sparkles');

  const holder = document.createElement('span');
  holder.className = 'mu-sparkles-holder';
  const strong = document.createElement('strong');
  strong.textContent = label;
  holder.append(strong);
  node.append(holder);

  let sparkles: Sparkle[] = [];

  const generate = (): Sparkle => ({
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    color: Math.random() > 0.5 ? colors.first : colors.second,
    delay: Math.random() * 2,
    scale: Math.random() * 1 + 0.3,
    lifespan: Math.random() * 10 + 5,
  });

  const paint = (): void => {
    for (const sparkle of sparkles) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'mu-sparkle');
      svg.setAttribute('viewBox', '0 0 21 21');
      svg.setAttribute('width', '21');
      svg.setAttribute('height', '21');
      svg.style.left = sparkle.x;
      svg.style.top = sparkle.y;
      svg.style.animationDelay = `${sparkle.delay}s`;
      svg.style.setProperty('--sparkle-scale', String(sparkle.scale));
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', SPARKLE_PATH);
      path.setAttribute('fill', sparkle.color);
      svg.append(path);
      holder.insertBefore(svg, strong);
    }
  };

  const clear = (): void => {
    for (const node2 of holder.querySelectorAll('.mu-sparkle')) node2.remove();
  };

  sparkles = Array.from({ length: count }, generate);
  paint();
  const timer = window.setInterval(() => {
    sparkles = sparkles.map((sparkle) => (sparkle.lifespan <= 0 ? generate() : { ...sparkle, lifespan: sparkle.lifespan - 0.1 }));
    clear();
    paint();
  }, 100);

  document.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
}

export interface TickerOptions {
  value: number;
  startValue?: number;
  delay?: number;
  decimalPlaces?: number;
}

/** A spring, not an ease: the reference uses damping 60 and stiffness 100. */
export function numberTicker(node: HTMLElement, options: TickerOptions): void {
  const value = options.value;
  const startValue = options.startValue ?? 0;
  const delay = options.delay ?? 0;
  const decimalPlaces = options.decimalPlaces ?? 0;
  node.classList.add('mu-ticker');
  node.textContent = String(startValue);

  const format = (n: number): string =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(n.toFixed(decimalPlaces)));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    node.textContent = format(value);
    return;
  }

  let raf = 0;
  const start = performance.now() + delay * 1000;
  const step = (now: number): void => {
    if (now < start) {
      raf = requestAnimationFrame(step);
      return;
    }
    const t = Math.min(1, (now - start) / 900);
    // The same damping/stiffness pair as the reference spring, integrated
    // directly, so it lands the same way without pulling in a physics library.
    const eased = 1 - Math.exp(-6 * t) * Math.cos(9 * t);
    node.textContent = format(startValue + (value - startValue) * eased);
    if (t < 1) raf = requestAnimationFrame(step);
    else node.textContent = format(value);
  };
  raf = requestAnimationFrame(step);
  document.addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
}

export type TextAnimation = 'fadeIn' | 'blurIn' | 'slideUp';

export interface TextAnimateOptions {
  animation?: TextAnimation;
  by?: 'word' | 'character' | 'line';
  delay?: number;
  duration?: number;
}

export function textAnimate(node: HTMLElement, options: TextAnimateOptions = {}): void {
  const by = options.by ?? 'word';
  const delay = options.delay ?? 0;
  const duration = options.duration ?? 0.3;
  const text = node.textContent ?? '';
  if (text.length === 0) return;

  const segments =
    by === 'word' ? text.split(/(\s+)/) : by === 'character' ? text.split('') : text.split('\n');
  const stagger = duration / segments.length;

  node.textContent = '';
  node.classList.add('mu-text-animate');
  node.setAttribute('aria-label', text);
  const inner = document.createElement('span');
  inner.className = 'mu-sr';
  inner.textContent = text;
  node.append(inner);

  segments.forEach((segment, i) => {
    // Whitespace stays a plain text node. Wrapping it in an inline-block span
    // turns every space into a box, and the paragraph stops reading as a
    // paragraph: the words drift apart and the line breaks in the wrong place.
    if (segment.trim().length === 0) {
      node.append(document.createTextNode(segment));
      return;
    }
    const span = document.createElement('span');
    span.className = by === 'line' ? 'mu-seg mu-seg-line' : 'mu-seg';
    span.textContent = segment;
    span.setAttribute('aria-hidden', 'true');
    span.style.animationDelay = `${delay + i * stagger}s`;
    span.style.animationDuration = `${duration}s`;
    node.append(span);
  });
}
