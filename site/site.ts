/**
 * The site is static on purpose: no framework, no runtime, nothing to keep up to
 * date. These are the three pieces of behaviour the layout cannot express on its
 * own, and each one is deliberately small.
 */

/** A spotlight that follows the pointer. The CSS only knows how to draw it at
 *  `--x` / `--y`, so the script only has to publish two numbers. It is driven
 *  from a single rAF instead of one listener per card, and cards register
 *  themselves through a data attribute so the markup stays declarative. */
const spotlights = [...document.querySelectorAll<HTMLElement>('[data-spotlight]')];
const pointer = { x: 0, y: 0, seen: false };
let queued = false;

function paint(): void {
  queued = false;
  for (const card of spotlights) {
    const box = card.getBoundingClientRect();
    if (box.width === 0) continue;
    card.style.setProperty('--x', `${pointer.x - box.left}px`);
    card.style.setProperty('--y', `${pointer.y - box.top}px`);
  }
}

function onMove(event: PointerEvent): void {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.seen = true;
  if (queued) return;
  queued = true;
  requestAnimationFrame(paint);
}

if (spotlights.length > 0) {
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', () => {
    pointer.seen = false;
  });
  // Touch has no pointer position to follow, so park the light in the middle of
  // the card instead of leaving it dark.
  for (const card of spotlights) {
    card.addEventListener('touchstart', () => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--x', `${box.width / 2}px`);
      card.style.setProperty('--y', `${box.height / 2}px`);
    });
  }
}

/**
 * Numbers that count up when they scroll into view. The final value lives in the
 * markup, so the page is still correct with JavaScript switched off; this only
 * animates the way there.
 */
const tickers = [...document.querySelectorAll<HTMLElement>('[data-count]')];

function runTicker(node: HTMLElement): void {
  const raw = node.dataset.count ?? '0';
  const target = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  const decimals = (raw.split('.')[1] ?? '').length;
  const prefix = raw.startsWith('$') ? '$' : '';
  const suffix = raw.replace(/^[\$0-9.]/, '');
  if (!Number.isFinite(target) || target === 0) {
    node.textContent = raw;
    return;
  }
  const duration = 900;
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    // easeOutExpo: fast out of the gate, then settle, so it reads as a counter
    // landing on a value rather than a linear slide.
    const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
    const value = (target * eased).toFixed(decimals);
    node.textContent = `${prefix}${value}${suffix}`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

for (const node of tickers) {
  node.textContent = node.dataset.count ?? '0';
}

if (tickers.length > 0 && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        runTicker(entry.target as HTMLElement);
      }
    },
    { threshold: 0.6 },
  );
  for (const node of tickers) observer.observe(node);
} else {
  for (const node of tickers) runTicker(node);
}

/**
 * The marquee duplicates its content once in CSS, and this keeps the clone's
 * aria-hidden in sync so a screen reader does not read the row twice.
 */
for (const track of document.querySelectorAll<HTMLElement>('[data-marquee]')) {
  const clone = track.cloneNode(true);
  if (clone instanceof HTMLElement) {
    clone.setAttribute('aria-hidden', 'true');
    track.parentElement?.append(clone);
  }
}
