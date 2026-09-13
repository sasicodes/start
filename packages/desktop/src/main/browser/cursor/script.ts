export const cursorScript: string = `
(() => {
  if (window.__startCursor__) return;

  const SIZE = 24;
  const TIP_X = 9.2;
  const TIP_Y = 6.72;
  const ACCENT = '#ff3f00';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ARROW_PATH = 'M12 3L5 18.5l.5.5L12 14.5l6.5 4.5 .5-.5z';
  const SHADOW = 'drop-shadow(0 1.5px 1.5px rgba(0,0,0,.34))';
  const GLOW = ' drop-shadow(0 0 8px ' + ACCENT + '33) drop-shadow(0 0 18px ' + ACCENT + '14)';
  const STEP = 1 / 240;
  const MAX_FRAME = 1 / 20;
  const RESPONSE = 0.26;
  const DAMPING = 0.9;
  const ARRIVE_PX = 0.6;
  const ARRIVE_SPEED = 12;
  const TRAVEL_TIMEOUT_MS = 1400;
  const WATCHDOG_MS = 200;
  const WAITING_MS = 700;
  const TAP_MS = 260;
  const ENTRY_MS = 280;
  const WAIT_MS = 2200;
  const TAKEOVER_GRACE_MS = 500;
  const TAKEOVER_PX = 3;
  const REENTRY_MS = 400;
  const STRETCH_SPEED = 9000;
  const MAX_STRETCH = 0.12;
  const MAX_TILT = 18;
  const ENTRY_X = 0.58;
  const ENTRY_Y = 0.62;

  const stiffness = Math.pow((Math.PI * 2) / RESPONSE, 2);
  const damping = (4 * Math.PI * DAMPING) / RESPONSE;

  const host = document.createElement('div');
  host.id = '__start_cursor__';
  Object.assign(host.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '2147483646', overflow: 'hidden'
  });
  const shadow = host.attachShadow({ mode: 'closed' });

  const root = document.createElement('div');
  Object.assign(root.style, {
    position: 'absolute', left: '0', top: '0', opacity: '0', willChange: 'transform,opacity',
    width: SIZE + 'px', height: SIZE + 'px', transition: 'opacity 160ms ease-out',
    transform: 'translate3d(-100px,-100px,0)'
  });

  const arrow = document.createElement('div');
  Object.assign(arrow.style, {
    width: '100%', height: '100%', transformOrigin: TIP_X + 'px ' + TIP_Y + 'px'
  });

  const glyph = document.createElement('div');
  Object.assign(glyph.style, {
    width: '100%', height: '100%', filter: SHADOW + GLOW,
    transformOrigin: '13px 15px', transition: 'filter 200ms ease-out'
  });

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(SIZE));
  svg.setAttribute('height', String(SIZE));
  svg.setAttribute('viewBox', '-6 -6 36 36');
  const outline = document.createElementNS(SVG_NS, 'path');
  outline.setAttribute('d', ARROW_PATH);
  outline.setAttribute('fill', '#0d0d0d');
  outline.setAttribute('stroke', '#ffffff');
  outline.setAttribute('stroke-width', '5.4');
  outline.setAttribute('stroke-linejoin', 'round');
  outline.setAttribute('stroke-linecap', 'round');
  outline.setAttribute('transform', 'rotate(-28 12 12)');
  const body = outline.cloneNode(false);
  body.setAttribute('stroke', '#0d0d0d');
  body.setAttribute('stroke-width', '1.8');
  svg.appendChild(outline);
  svg.appendChild(body);
  glyph.appendChild(svg);
  arrow.appendChild(glyph);
  const halo = document.createElement('div');
  Object.assign(halo.style, {
    position: 'absolute', left: '-18px', top: '-12px', width: '60px', height: '60px',
    background: 'radial-gradient(ellipse, ' + ACCENT + '33 0%, ' + ACCENT + '18 30%, transparent 70%)'
  });
  root.appendChild(halo);
  root.appendChild(arrow);
  shadow.appendChild(root);

  const spring = (value) => ({ value: value, velocity: 0, target: value });
  const axis = { x: spring(0), y: spring(0) };
  const tilt = spring(0);

  let visible = false;
  let waiting = false;
  let waitAnimation = null;
  let frameId = 0;
  let lastFrame = 0;
  let watchdog = 0;
  let arrivals = [];
  let commandAt = 0;
  let hiddenAt = 0;
  let taps = 0;
  let pointer = null;
  let expectedInput = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const viewportPoint = (x, y) => ({
    x: clamp(x, 0, Math.max(0, window.innerWidth)),
    y: clamp(y, 0, Math.max(0, window.innerHeight))
  });

  const advance = (part, seconds) => {
    let remaining = seconds;
    while (remaining > 0) {
      const step = Math.min(STEP, remaining);
      const force = (part.target - part.value) * stiffness - part.velocity * damping;
      part.velocity += force * step;
      part.value += part.velocity * step;
      remaining -= step;
    }
  };

  const settled = () => {
    const dx = axis.x.target - axis.x.value;
    const dy = axis.y.target - axis.y.value;
    const speed = Math.hypot(axis.x.velocity, axis.y.velocity);
    return Math.hypot(dx, dy) <= ARRIVE_PX && speed <= ARRIVE_SPEED &&
      Math.abs(tilt.value) < 0.05 && Math.abs(tilt.velocity) < 0.5;
  };

  const busy = () => frameId !== 0 || arrivals.length > 0 || taps > 0;

  const render = () => {
    const speed = Math.hypot(axis.x.velocity, axis.y.velocity);
    const stretch = clamp(speed / STRETCH_SPEED, 0, MAX_STRETCH);
    const angle = speed > 1 ? (Math.atan2(axis.y.velocity, axis.x.velocity) * 180) / Math.PI : 0;
    root.style.transform =
      'translate3d(' + (axis.x.value - TIP_X).toFixed(2) + 'px,' + (axis.y.value - TIP_Y).toFixed(2) + 'px,0)';
    arrow.style.transform = 'rotate(' + tilt.value.toFixed(2) + 'deg) ' + (stretch > 0.001
      ? 'rotate(' + angle.toFixed(2) + 'deg) scale(' + (1 + stretch).toFixed(3) + ',' + (1 - stretch).toFixed(3) +
        ') rotate(' + (-angle).toFixed(2) + 'deg)'
      : 'scale(1)');
  };

  const resolveArrivals = (cancelled = false) => {
    const pending = arrivals;
    arrivals = [];
    for (const resolve of pending) resolve(cancelled);
  };

  const frame = (now) => {
    frameId = 0;
    const seconds = Math.min(MAX_FRAME, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    advance(axis.x, seconds);
    advance(axis.y, seconds);
    tilt.target = clamp(axis.x.velocity * 0.014 + axis.y.velocity * 0.005, -MAX_TILT, MAX_TILT);
    advance(tilt, seconds);
    render();
    if (!settled()) {
      schedule();
      return;
    }
    axis.x.value = axis.x.target;
    axis.y.value = axis.y.target;
    axis.x.velocity = 0;
    axis.y.velocity = 0;
    tilt.value = 0;
    tilt.velocity = 0;
    tilt.target = 0;
    render();
    resolveArrivals();
  };

  const schedule = () => {
    if (frameId) return;
    frameId = window.requestAnimationFrame(frame);
  };

  const stopFrames = () => {
    if (!frameId) return;
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stopWaiting = () => {
    if (!waiting) return;
    waiting = false;
    root.style.opacity = visible ? '1' : '0';
    glyph.style.filter = SHADOW + GLOW;
    if (waitAnimation) waitAnimation.cancel();
    waitAnimation = null;
  };

  const startWaiting = () => {
    if (waiting) return;
    waiting = true;
    root.style.opacity = '0.55';
    glyph.style.filter = SHADOW + GLOW;
    if (reducedMotion()) return;
    waitAnimation = glyph.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(-4deg)', offset: 0.35 },
        { transform: 'rotate(4deg)', offset: 0.7 },
        { transform: 'rotate(0deg)' }
      ],
      { duration: WAIT_MS, easing: 'ease-in-out', iterations: Number.POSITIVE_INFINITY }
    );
  };

  const hide = () => {
    if (!visible) return;
    visible = false;
    taps = 0;
    hiddenAt = performance.now();
    stopWaiting();
    root.style.opacity = '0';
    stopFrames();
    window.clearInterval(watchdog);
    watchdog = 0;
    resolveArrivals(true);
  };

  const watch = () => {
    if (!visible) {
      window.clearInterval(watchdog);
      watchdog = 0;
      return;
    }
    const idle = performance.now() - commandAt;
    if (idle > WAITING_MS && !busy()) startWaiting();
  };

  const keepAlive = () => {
    commandAt = performance.now();
    stopWaiting();
    if (!watchdog) watchdog = window.setInterval(watch, WATCHDOG_MS);
  };

  const placeAt = (point) => {
    axis.x.value = point.x;
    axis.y.value = point.y;
    axis.x.target = point.x;
    axis.y.target = point.y;
    axis.x.velocity = 0;
    axis.y.velocity = 0;
    tilt.value = 0;
    tilt.velocity = 0;
    tilt.target = 0;
    render();
  };

  const show = () => {
    if (!host.isConnected) (document.body || document.documentElement).appendChild(host);
    if (!visible) {
      visible = true;
      if (performance.now() - hiddenAt > REENTRY_MS) {
        placeAt(viewportPoint(window.innerWidth * ENTRY_X, window.innerHeight * ENTRY_Y));
        if (!reducedMotion()) glyph.animate([{ transform: 'scale(0.9)' }, { transform: 'scale(1)' }], {
          duration: ENTRY_MS,
          easing: 'cubic-bezier(0.2, 1.3, 0.35, 1)'
        });
      }
      root.style.opacity = '1';
    }
    keepAlive();
  };

  const moveTo = (x, y) => {
    show();
    const point = viewportPoint(x, y);
    axis.x.target = point.x;
    axis.y.target = point.y;
    if (reducedMotion() || settled()) {
      stopFrames();
      resolveArrivals();
      placeAt(point);
      return Promise.resolve();
    }
    lastFrame = performance.now();
    schedule();
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (cancelled = false) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        if (cancelled) reject(new Error('Browser cursor movement was cancelled or timed out. Take a fresh snapshot before retrying.'));
        else resolve();
      };
      const timer = window.setTimeout(() => {
        stopFrames();
        resolveArrivals(true);
      }, TRAVEL_TIMEOUT_MS);
      arrivals.push(finish);
    });
  };

  const tap = () => {
    show();
    taps += 1;
    if (reducedMotion()) {
      taps -= 1;
      return Promise.resolve();
    }
    glyph.animate([
      { filter: SHADOW + GLOW },
      { filter: SHADOW + ' drop-shadow(0 0 8px ' + ACCENT + '66) drop-shadow(0 0 18px ' + ACCENT + '22)', offset: 0.35 },
      { filter: SHADOW + GLOW }
    ], {
      duration: TAP_MS,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    });
    return new Promise((resolve) => {
      window.setTimeout(() => {
        taps = Math.max(0, taps - 1);
        resolve();
      }, TAP_MS * 0.6);
    });
  };

  const elementPoint = (element) => {
    const rect = element.getBoundingClientRect();
    return viewportPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const pointAt = async (element) => {
    const point = elementPoint(element);
    await moveTo(point.x, point.y);
  };

  const tapElement = async (element) => {
    await pointAt(element);
    await tap();
  };

  const expectInput = (type, x, y) => {
    expectedInput = { type, x, y, until: performance.now() + 1000 };
  };

  const agentInput = (event) => {
    const expected = expectedInput;
    if (!expected || !event.isTrusted || event.type !== expected.type) return false;
    expectedInput = null;
    return performance.now() <= expected.until &&
      Math.abs(event.clientX - expected.x) <= 1 && Math.abs(event.clientY - expected.y) <= 1;
  };

  const userTakesOver = (event) => {
    if (event.isTrusted && !agentInput(event)) hide();
  };

  const userMoved = (event) => {
    if (!event.isTrusted || agentInput(event)) return;
    const previous = pointer;
    pointer = { x: event.clientX, y: event.clientY };
    if (!previous || Math.hypot(pointer.x - previous.x, pointer.y - previous.y) < TAKEOVER_PX) return;
    if (performance.now() - commandAt < TAKEOVER_GRACE_MS) return;
    hide();
  };

  const pageHidden = () => {
    if (document.visibilityState !== 'visible') hide();
  };

  window.addEventListener('pointerdown', userTakesOver, { capture: true, passive: true });
  window.addEventListener('wheel', userTakesOver, { capture: true, passive: true });
  window.addEventListener('pointermove', userMoved, { capture: true, passive: true });
  window.addEventListener('pagehide', hide, { capture: true, passive: true });
  document.addEventListener('visibilitychange', pageHidden, { capture: true, passive: true });

  window.__startCursor__ = {
    expectInput: expectInput,
    tap: tap,
    hide: hide,
    show: show,
    moveTo: moveTo,
    pointAt: pointAt,
    tapElement: tapElement,
    isVisible: () => visible
  };
})();
`;
