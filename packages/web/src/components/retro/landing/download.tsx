import { useEffect, useRef } from 'react';

const STAR_COUNT = 140;
const FADE_IN_MS = 300;
const FADE_OUT_MS = 200;

const STAR_COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55'];

interface Star {
  angle: number;
  radius: number;
  speed: number;
  length: number;
  opacity: number;
  color: string;
}

const spawnStar = (): Star => ({
  angle: Math.random() * Math.PI * 2,
  radius: Math.random() * 0.1,
  speed: 0.8 + Math.random() * 1.2,
  length: 0.06 + Math.random() * 0.1,
  opacity: 0.7 + Math.random() * 0.3,
  color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
});

export const Download = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const rafRef = useRef(0);
  const isHovered = useRef(false);
  const fadeRef = useRef(0);
  const starsRef = useRef<Star[]>([]);
  const cursorRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const button = buttonRef.current;
    if (!canvas || !button) return;

    let dpr = window.devicePixelRatio || 1;
    let lastTime = 0;
    let isAnimating = false;
    let cssW = 0;
    let cssH = 0;
    let pendingCursor: { x: number; y: number } | null = null;
    let cachedRect: DOMRect | null = null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncSize = () => {
      const w = button.offsetWidth;
      const h = button.offsetHeight;
      if (w === cssW && h === cssH) return;
      cssW = w;
      cssH = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      cachedRect = null;
    };

    const syncDpr = () => {
      const next = window.devicePixelRatio || 1;
      if (next === dpr) return;
      dpr = next;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    };

    syncSize();
    starsRef.current = Array.from({ length: STAR_COUNT }, spawnStar);

    const ro = new ResizeObserver(syncSize);
    ro.observe(button);

    const dprMedia = window.matchMedia(`(resolution: ${dpr}dppx)`);
    dprMedia.addEventListener('change', syncDpr);

    const colorGroups = new Map<string, { alpha: number; x1: number; y1: number; x2: number; y2: number }[]>();

    const step = (now: number) => {
      const dt = lastTime > 0 ? now - lastTime : 16;
      lastTime = now;
      const dtSec = dt / 1000;

      if (pendingCursor) {
        cursorRef.current = pendingCursor;
        pendingCursor = null;
      }

      if (isHovered.current) {
        fadeRef.current = Math.min(1, fadeRef.current + dt / FADE_IN_MS);
      } else {
        fadeRef.current = Math.max(0, fadeRef.current - dt / FADE_OUT_MS);
      }

      if (fadeRef.current <= 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        isAnimating = false;
        lastTime = 0;
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = cursorRef.current.x * cssW;
      const cy = cursorRef.current.y * cssH;
      const maxR = Math.sqrt(cssW * cssW + cssH * cssH);
      const globalAlpha = fadeRef.current;

      ctx.clearRect(0, 0, cssW, cssH);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0, 0, cssW, cssH, 4);
      ctx.clip();
      ctx.lineWidth = 0.75;

      colorGroups.clear();

      for (const s of starsRef.current) {
        s.radius += s.speed * dtSec;

        if (s.radius > 1.1) {
          Object.assign(s, spawnStar());
        }

        const r = s.radius * maxR;
        const tailR = Math.max(0, (s.radius - s.length) * maxR);
        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);

        const x1 = cx + cos * tailR;
        const y1 = cy + sin * tailR;
        const x2 = cx + cos * r;
        const y2 = cy + sin * r;

        const distanceFade = Math.min(1, s.radius * 3);
        const alpha = globalAlpha * s.opacity * distanceFade;

        let group = colorGroups.get(s.color);
        if (!group) {
          group = [];
          colorGroups.set(s.color, group);
        }
        group.push({ alpha, x1, y1, x2, y2 });
      }

      for (const [color, lines] of colorGroups) {
        ctx.strokeStyle = color;
        for (const { alpha, x1, y1, x2, y2 } of lines) {
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(step);
    };

    const startLoop = () => {
      if (isAnimating) return;
      isAnimating = true;
      lastTime = 0;
      rafRef.current = requestAnimationFrame(step);
    };

    const invalidateRect = () => {
      cachedRect = null;
    };

    const getRect = () => {
      if (!cachedRect) cachedRect = button.getBoundingClientRect();
      return cachedRect;
    };

    const handleEnter = (e: MouseEvent) => {
      cachedRect = null;
      const rect = getRect();
      cursorRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      };
      starsRef.current = Array.from({ length: STAR_COUNT }, spawnStar);
      isHovered.current = true;
      startLoop();
    };

    const handleMove = (e: MouseEvent) => {
      const rect = getRect();
      pendingCursor = {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      };
    };

    const handleLeave = () => {
      isHovered.current = false;
    };

    window.addEventListener('scroll', invalidateRect, true);
    button.addEventListener('mouseenter', handleEnter);
    button.addEventListener('mousemove', handleMove);
    button.addEventListener('mouseleave', handleLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      dprMedia.removeEventListener('change', syncDpr);
      window.removeEventListener('scroll', invalidateRect, true);
      button.removeEventListener('mouseenter', handleEnter);
      button.removeEventListener('mousemove', handleMove);
      button.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <div className="inline-flex flex-col items-center">
      <a
        ref={buttonRef}
        href="https://github.com/sasicodes/start/releases/latest"
        target="_blank"
        rel="noopener noreferrer"
        className="relative inline-block cursor-pointer select-none overflow-hidden rounded-[4px] border-[1.5px] border-zinc-950 bg-neutral-200 px-6 py-1 font-pixel text-xl text-zinc-950 no-underline shadow-[inset_-1px_-1px_0_oklch(0.65_0_0),inset_1px_1px_0_oklch(0.98_0_0),0_0_0_1.5px_oklch(0.92_0_0),0_0_0_3.5px_oklch(0.18_0_0)] active:shadow-[inset_1px_1px_2px_oklch(0.58_0_0),0_0_0_1.5px_oklch(0.92_0_0),0_0_0_3.5px_oklch(0.18_0_0)]"
      >
        <span className="relative z-10">Download for Mac</span>
        <canvas ref={canvasRef} className="pointer-events-none absolute top-0 left-0 w-full h-full z-0" />
      </a>
    </div>
  );
};
