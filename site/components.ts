/**
 * Layout components from Magic UI, ported to vanilla TypeScript.
 *
 *   Terminal         a sequenced typing console, the literal metaphor for this product
 *   AnimatedList     items arriving one at a time, spring 350/40
 *   Dock             magnification by pointer distance, 1.5x at the defaults
 *   BentoGrid        the 3 column grid with the hover lift
 *   Marquee          the translateX loop, 4 copies
 *   ProgressiveBlur  stacked backdrop-filter layers with 12.5% mask steps
 */

export interface TerminalLine {
  text?: string;
  html?: string;
  tone?: 'dim' | 'bright';
  typing?: boolean;
}

export interface TerminalOptions {
  lines: readonly TerminalLine[];
  /** Milliseconds per character. The reference default is 60. */
  duration?: number;
  /** Milliseconds between one line completing and the next starting. */
  delay?: number;
  command?: string;
}

export function terminal(node: HTMLElement, options: TerminalOptions): void {
  const duration = options.duration ?? 60;
  const delay = options.delay ?? 220;
  const command = options.command ?? 'binpeek';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bar = document.createElement('div');
  bar.className = 'mu-term-bar';
  for (const tone of ['red', 'amber', 'green']) {
    const dot = document.createElement('span');
    dot.className = 'mu-term-dot';
    dot.dataset.tone = tone;
    bar.append(dot);
  }
  const title = document.createElement('span');
  title.className = 'mu-term-title';
  title.textContent = 'binpeek';
  bar.append(title);

  const body = document.createElement('div');
  body.className = 'mu-term-body';
  const out = document.createElement('div');
  out.className = 'mu-term-line mu-term-prompt';
  out.textContent = `${command} $`;
  body.append(out);

  node.classList.add('mu-term');
  node.append(bar, body);

  const write = (text: string, tone: 'dim' | 'bright', type: boolean): Promise<void> =>
    new Promise((done) => {
      const line = document.createElement('div');
      line.className = `mu-term-line${tone === 'dim' ? ' is-dim' : ''}`;
      body.append(line);
      if (!type || reduced) {
        line.innerHTML = text;
        line.classList.add('is-in');
        window.setTimeout(done, 0);
        return;
      }
      const caret = document.createElement('span');
      caret.className = 'mu-term-caret';
      line.append(caret);
      let i = 0;
      const timer = window.setInterval(() => {
        if (i < text.length) {
          line.textContent = text.slice(0, i + 1);
          line.append(caret);
          i += 1;
          return;
        }
        window.clearInterval(timer);
        line.classList.add('is-in');
        done();
      }, duration);
    });

  let stopped = false;
  const run = async (): Promise<void> => {
    for (const line of options.lines) {
      if (stopped) return;
      await write(line.html ?? line.text ?? '', line.tone ?? 'dim', line.typing !== false);
      await new Promise((r) => window.setTimeout(r, delay));
    }
  };
  void run();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void run();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
  }
}

export interface ListItem {
  title: string;
  detail: string;
}

export interface AnimatedListOptions {
  items: readonly ListItem[];
  delay?: number;
}

/**
 * The reference re-adds a new item every `delay` and keeps the newest at the top.
 * This is the same, and it stops once it has shown everything.
 */
export function animatedList(node: HTMLElement, options: AnimatedListOptions): void {
  const delay = options.delay ?? 1400;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stack = document.createElement('div');
  stack.className = 'mu-list';
  node.classList.add('mu-list-host');
  node.append(stack);

  let index = -1;
  const shown: HTMLElement[] = [];

  const add = (): void => {
    if (index >= options.items.length - 1) return;
    index += 1;
    const item = options.items[index];
    if (item === undefined) return;
    const row = document.createElement('div');
    row.className = 'mu-list-item';
    const text = document.createElement('div');
    text.className = 'mu-list-text';
    const title = document.createElement('strong');
    title.textContent = item.title;
    const detail = document.createElement('span');
    detail.textContent = item.detail;
    text.append(title, detail);
    const dot = document.createElement('span');
    dot.className = 'mu-list-dot';
    row.append(dot, text);
    if (!reduced) row.classList.add('is-in');
    stack.prepend(row);
    shown.unshift(row);
    while (shown.length > 4) shown.pop()?.remove();
  };

  if (reduced) {
    for (let i = 0; i < options.items.length; i += 1) add();
    return;
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        add();
        const timer = window.setInterval(add, delay);
        document.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
  }
}

export interface DockOptions {
  /** Resting size in pixels. The reference default is 40. */
  size?: number;
  magnification?: number;
  distance?: number;
}

export function dock(node: HTMLElement, options: DockOptions = {}): void {
  const size = options.size ?? 40;
  const magnification = options.magnification ?? 60;
  const distance = options.distance ?? 140;
  let mouseX = Number.POSITIVE_INFINITY;

  node.classList.add('mu-dock');
  const icons = [...node.querySelectorAll<HTMLElement>('.mu-dock-icon')];

  const place = (): void => {
    for (const icon of icons) {
      const box = icon.getBoundingClientRect();
      const delta = mouseX - box.x - box.width / 2;
      const clamp = Math.max(-1, Math.min(1, delta / distance));
      const target = size + (magnification - size) * (1 - Math.abs(clamp));
      icon.style.width = `${target}px`;
      icon.style.height = `${target}px`;
    }
  };

  const onMove = (event: MouseEvent): void => {
    mouseX = event.pageX;
    place();
  };

  const onLeave = (): void => {
    mouseX = Number.POSITIVE_INFINITY;
    place();
  };

  node.addEventListener('mousemove', onMove);
  node.addEventListener('mouseleave', onLeave);
  document.addEventListener('pagehide', () => {
    node.removeEventListener('mousemove', onMove);
    node.removeEventListener('mouseleave', onLeave);
  });
  void node;
}

export interface MarqueeOptions {
  reverse?: boolean;
  pauseOnHover?: boolean;
  repeat?: number;
  duration?: number;
  gap?: number;
}

/** The reference renders `repeat` copies of the content and translates one width
 *  plus one gap. Same here, so the loop has no seam. */
export function marquee(node: HTMLElement, options: MarqueeOptions = {}): void {
  const repeat = options.repeat ?? 4;
  const duration = options.duration ?? 38;
  const gap = options.gap ?? 2.6;
  const first = node.querySelector<HTMLElement>('.marquee-track');
  if (first === null) return;

  node.style.setProperty('--marquee-duration', `${duration}s`);
  node.style.setProperty('--marquee-gap', `${gap}rem`);
  first.classList.toggle('is-reverse', options.reverse === true);
  if (options.pauseOnHover === true) node.classList.add('is-pausable');

  for (let i = 0; i < repeat - 1; i += 1) {
    const clone = first.cloneNode(true);
    if (clone instanceof HTMLElement) {
      clone.setAttribute('aria-hidden', 'true');
      node.append(clone);
    }
  }
}

export interface BlurOptions {
  height?: string;
  position?: 'top' | 'bottom' | 'both';
  blurLevels?: number[];
}

/**
 * One div per blur level, each with a single mask whose stops step by 12.5%, so
 * the blur ramps instead of jumping. The reference has no multi layer mask and
 * no mask-composite: every layer is its own element.
 */
export function progressiveBlur(node: HTMLElement, options: BlurOptions = {}): void {
  const height = options.height ?? '30%';
  const position = options.position ?? 'bottom';
  const levels = options.blurLevels ?? [0.5, 1, 2, 4, 8, 16, 32, 64];

  node.classList.add('mu-pblur');
  node.style.height = position === 'both' ? '100%' : height;
  node.dataset.position = position;

  const both = `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)`;

  levels.forEach((level, index) => {
    const layer = document.createElement('div');
    layer.className = 'mu-pblur-layer';
    layer.style.zIndex = String(index + 1);
    layer.style.backdropFilter = `blur(${level}px)`;

    let mask = both;
    if (position === 'bottom') {
      if (index === 0) {
        mask = `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 12.5%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 37.5%)`;
      } else if (index === levels.length - 1) {
        mask = `linear-gradient(to bottom, rgba(0,0,0,0) 87.5%, rgba(0,0,0,1) 100%)`;
      } else {
        const start = index * 12.5;
        mask = `linear-gradient(to bottom, rgba(0,0,0,0) ${start}%, rgba(0,0,0,1) ${start + 12.5}%, rgba(0,0,0,1) ${start + 25}%, rgba(0,0,0,0) ${start + 37.5}%)`;
      }
    } else if (position === 'top') {
      if (index === 0) {
        mask = `linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 12.5%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 37.5%)`;
      } else if (index === levels.length - 1) {
        mask = `linear-gradient(to top, rgba(0,0,0,0) 87.5%, rgba(0,0,0,1) 100%)`;
      } else {
        const start = index * 12.5;
        mask = `linear-gradient(to top, rgba(0,0,0,0) ${start}%, rgba(0,0,0,1) ${start + 12.5}%, rgba(0,0,0,1) ${start + 25}%, rgba(0,0,0,0) ${start + 37.5}%)`;
      }
    }

    layer.style.maskImage = mask;
    layer.style.webkitMaskImage = mask;
    node.append(layer);
  });
}

/** The bento grid is pure layout, so this only sets the reference's numbers. */
export function bentoGrid(node: HTMLElement, rows: number | null = null): void {
  node.classList.add('mu-bento');
  if (rows !== null) node.style.setProperty('--bento-rows', String(rows));
}
