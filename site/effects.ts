/**
 * Special effects from Magic UI, ported to vanilla TypeScript.
 *
 * Same rule as the text module: the reference mechanism and constants are kept,
 * only the colours become white and grey.
 *
 *   Ripple        concentric circles, 210px growing by 70, 8 of them
 *   BorderBeam    an offset-path square travelling the border
 *   MagicCard     a cursor-following radial, plus the border version
 *   Meteors       shooting stars, 20 of them, 215 degrees
 *   ShineBorder   the conic gradient ring, with the longhand mask
 *   Particles     the same field the desktop app uses
 */

export interface RippleOptions {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
}

export function ripple(host: HTMLElement, options: RippleOptions = {}): void {
  const mainCircleSize = options.mainCircleSize ?? 210;
  const mainCircleOpacity = options.mainCircleOpacity ?? 0.24;
  const numCircles = options.numCircles ?? 8;

  const layer = document.createElement('div');
  layer.className = 'mu-ripple';
  for (let i = 0; i < numCircles; i += 1) {
    const circle = document.createElement('div');
    circle.className = 'mu-ripple-circle';
    const size = mainCircleSize + i * 70;
    circle.style.setProperty('--ripple-i', String(i));
    circle.style.width = `${size}px`;
    circle.style.height = `${size}px`;
    circle.style.opacity = String(mainCircleOpacity - i * 0.03);
    circle.style.animationDelay = `${i * 0.06}s`;
    layer.append(circle);
  }
  host.append(layer);
}

export interface BeamOptions {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
}

/**
 * The reference drives this with the Web Animations API through a motion value.
 * Here it is a keyframe, which is the same motion, and the geometry is the part
 * that matters: offset-path rect() with a rounded corner the size of the beam.
 */
export function borderBeam(host: HTMLElement, options: BeamOptions = {}): void {
  const size = options.size ?? 50;
  const duration = options.duration ?? 6;
  const delay = options.delay ?? 0;
  const initialOffset = options.initialOffset ?? 0;
  const borderWidth = options.borderWidth ?? 1;
  const reverse = options.reverse ?? false;

  const layer = document.createElement('div');
  layer.className = 'mu-beam';
  layer.style.setProperty('--border-beam-width', `${borderWidth}px`);

  const beam = document.createElement('div');
  beam.className = 'mu-beam-dot';
  beam.style.width = `${size}px`;
  beam.style.offsetPath = `rect(0 auto auto 0 round ${size}px)`;
  beam.style.setProperty('--color-from', options.colorFrom ?? '#ffffff');
  beam.style.setProperty('--color-to', options.colorTo ?? '#4a4a4a');
  beam.style.setProperty('--beam-from', `${initialOffset}%`);
  beam.style.setProperty('--beam-to', `${(reverse ? -initialOffset : 100 + initialOffset).toFixed(2)}%`);
  beam.style.animationDuration = `${duration}s`;
  beam.style.animationDelay = `${-delay}s`;
  if (reverse) beam.style.animationDirection = 'reverse';

  layer.append(beam);
  host.append(layer);
}

export interface MagicCardOptions {
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

export function magicCard(node: HTMLElement, options: MagicCardOptions = {}): void {
  const gradientSize = options.gradientSize ?? 200;
  const gradientColor = options.gradientColor ?? '#1c1c1c';
  const gradientOpacity = options.gradientOpacity ?? 0.8;
  const gradientFrom = options.gradientFrom ?? '#ffffff';
  const gradientTo = options.gradientTo ?? '#3a3a3a';

  node.classList.add('mu-magic-card');

  const fill = document.createElement('div');
  fill.className = 'mu-magic-fill';
  const glow = document.createElement('div');
  glow.className = 'mu-magic-glow';
  const content = document.createElement('div');
  content.className = 'mu-magic-content';
  while (node.firstChild !== null) content.append(node.firstChild);
  node.append(fill, glow, content);

  let x = -gradientSize;
  let y = -gradientSize;
  let frame = 0;
  const xValue = { current: -gradientSize };
  const yValue = { current: -gradientSize };

  const paint = (): void => {
    xValue.current += (x - xValue.current) * 0.18;
    yValue.current += (y - yValue.current) * 0.18;
    fill.style.background = `linear-gradient(rgba(8,8,8,0.92) 0 0) padding-box, radial-gradient(${gradientSize}px circle at ${xValue.current}px ${yValue.current}px, ${gradientFrom}, ${gradientTo}, rgba(255,255,255,0.1) 100%) border-box`;
    glow.style.background = `radial-gradient(${gradientSize}px circle at ${xValue.current}px ${yValue.current}px, ${gradientColor}, transparent 100%)`;
    glow.style.opacity = String(node.classList.contains('is-lit') ? gradientOpacity : 0);
    if (Math.abs(x - xValue.current) > 0.4 || Math.abs(y - yValue.current) > 0.4) {
      frame = requestAnimationFrame(paint);
    } else {
      frame = 0;
    }
  };

  const wake = (): void => {
    if (frame === 0) frame = requestAnimationFrame(paint);
  };

  const onMove = (event: PointerEvent): void => {
    const box = node.getBoundingClientRect();
    x = event.clientX - box.left;
    y = event.clientY - box.top;
    node.classList.add('is-lit');
    wake();
  };

  const onLeave = (): void => {
    x = -gradientSize;
    y = -gradientSize;
    node.classList.remove('is-lit');
    wake();
  };

  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerleave', onLeave);
  node.addEventListener('pointerenter', wake);
  document.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(frame);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    },
    { once: true },
  );
}

export interface MeteorsOptions {
  number?: number;
  minDelay?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  angle?: number;
}

export function meteors(host: HTMLElement, options: MeteorsOptions = {}): void {
  const number = options.number ?? 20;
  const minDelay = options.minDelay ?? 0.2;
  const maxDelay = options.maxDelay ?? 1.2;
  const minDuration = options.minDuration ?? 2;
  const maxDuration = options.maxDuration ?? 10;
  const angle = options.angle ?? 215;

  const layer = document.createElement('div');
  layer.className = 'mu-meteors';
  for (let i = 0; i < number; i += 1) {
    const head = document.createElement('span');
    head.className = 'mu-meteor';
    head.style.setProperty('--angle', `${-angle}deg`);
    head.style.top = '-5%';
    head.style.left = `calc(0% + ${Math.floor(Math.random() * window.innerWidth)}px)`;
    head.style.animationDelay = `${Math.random() * (maxDelay - minDelay) + minDelay}s`;
    head.style.animationDuration = `${Math.floor(Math.random() * (maxDuration - minDuration) + minDuration)}s`;
    const tail = document.createElement('span');
    tail.className = 'mu-meteor-tail';
    head.append(tail);
    layer.append(head);
  }
  host.append(layer);
}

export interface ShineBorderOptions {
  borderWidth?: number;
  duration?: number;
  colors?: string[];
}

export function shineBorder(node: HTMLElement, options: ShineBorderOptions = {}): void {
  const width = options.borderWidth ?? 1;
  const duration = options.duration ?? 14;
  const colors = options.colors ?? ['#ffffff', '#9a9a9a', '#3a3a3a', '#e8e8e8'];
  node.classList.add('mu-shine-border');
  node.style.setProperty('--shine-border-width', `${width}px`);
  node.style.setProperty('--shine-duration', `${duration}s`);
  node.style.setProperty(
    '--shine-colors',
    `conic-gradient(from var(--shine-angle), transparent 0deg, ${colors[0]} 60deg, ${colors[1]} 120deg, transparent 200deg, ${colors[2]} 300deg, transparent 360deg)`,
  );
}

interface Circle {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

export interface ParticleOptions {
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  color?: string;
}

function hexToRgb(hex: string): number[] {
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const hexInt = parseInt(value, 16);
  return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255];
}

function remapValue(value: number, start1: number, end1: number, start2: number, end2: number): number {
  const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
  return remapped > 0 ? remapped : 0;
}

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('this browser has no 2d canvas context');
  return context;
}

export function particles(host: HTMLElement, options: ParticleOptions = {}): void {
  const quantity = options.quantity ?? 100;
  const staticity = options.staticity ?? 50;
  const ease = options.ease ?? 80;
  const size = options.size ?? 0.4;
  const vx = 0;
  const vy = 0;

  const container = document.createElement('div');
  container.className = 'mu-particles';
  container.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  container.append(canvas);
  host.append(container);

  const ctx = requireContext(canvas);
  const circles: Circle[] = [];
  const mouse = { x: 0, y: 0 };
  const canvasSize = { w: 0, h: 0 };
  const dpr = window.devicePixelRatio || 1;
  let raf = 0;
  let resizeTimer = 0;

  const circleParams = (): Circle => ({
    x: Math.floor(Math.random() * canvasSize.w),
    y: Math.floor(Math.random() * canvasSize.h),
    translateX: 0,
    translateY: 0,
    size: Math.floor(Math.random() * 2) + size,
    alpha: 0,
    targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
    dx: (Math.random() - 0.5) * 0.1,
    dy: (Math.random() - 0.5) * 0.1,
    magnetism: 0.1 + Math.random() * 4,
  });

  const rgb = hexToRgb(options.color ?? '#ffffff');

  const drawCircle = (circle: Circle, update = false): void => {
    ctx.translate(circle.translateX, circle.translateY);
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.size, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(${rgb.join(', ')}, ${circle.alpha})`;
    ctx.fill();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!update) circles.push(circle);
  };

  const clearContext = (): void => {
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
  };

  const resizeCanvas = (): void => {
    canvasSize.w = container.offsetWidth;
    canvasSize.h = container.offsetHeight;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    ctx.scale(dpr, dpr);
    circles.length = 0;
    for (let i = 0; i < quantity; i += 1) drawCircle(circleParams());
  };

  const animate = (): void => {
    clearContext();
    for (let i = 0; i < circles.length; i += 1) {
      const circle = circles[i]!;
      const edge = [
        circle.x + circle.translateX - circle.size,
        canvasSize.w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        canvasSize.h - circle.y - circle.translateY - circle.size,
      ];
      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = parseFloat(remapValue(closestEdge, 0, 20, 0, 1).toFixed(2));
      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) circle.alpha = circle.targetAlpha;
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }
      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;
      circle.translateX += (mouse.x / (staticity / circle.magnetism) - circle.translateX) / ease;
      circle.translateY += (mouse.y / (staticity / circle.magnetism) - circle.translateY) / ease;
      drawCircle(circle, true);
      if (
        circle.x < -circle.size ||
        circle.x > canvasSize.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > canvasSize.h + circle.size
      ) {
        circles.splice(i, 1);
        drawCircle(circleParams());
      }
    }
    raf = window.requestAnimationFrame(animate);
  };

  const onMove = (event: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - canvasSize.w / 2;
    const y = event.clientY - rect.top - canvasSize.h / 2;
    if (x < canvasSize.w / 2 && x > -canvasSize.w / 2 && y < canvasSize.h / 2 && y > -canvasSize.h / 2) {
      mouse.x = x;
      mouse.y = y;
    }
  };

  const onResize = (): void => {
    if (resizeTimer !== 0) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeCanvas();
      for (let i = 0; i < quantity; i += 1) drawCircle(circleParams());
    }, 200);
  };

  resizeCanvas();
  animate();
  window.addEventListener('mousemove', onMove);
  window.addEventListener('resize', onResize);
  document.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
    },
    { once: true },
  );
}
