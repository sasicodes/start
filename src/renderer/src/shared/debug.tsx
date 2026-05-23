import type { DebugMetrics, DebugProcessMetric } from '@preload/index';
import { cn } from '@renderer/utils/cn';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

type ToolbarPosition = {
  x: number;
  y: number;
};

type RendererMemory = {
  jsHeapLimitMb: number;
  jsHeapUsedMb: number;
};

type PerformanceWithMemory = Performance & {
  memory?: {
    jsHeapSizeLimit: number;
    usedJSHeapSize: number;
  };
};

const debugToolbarPositionStorageKey = 'start-debug-toolbar-position';
const toolbarMargin = 20;
const toolbarWidth = 312;

const defaultPosition = (): ToolbarPosition => ({
  x: Math.max(8, window.innerWidth - toolbarWidth - toolbarMargin),
  y: toolbarMargin
});

const bytesToMegabytes = (value: number) => Math.round((value / 1024 / 1024) * 10) / 10;

const formatMegabytes = (value: number | undefined) => (value === undefined ? 'n/a' : `${Math.round(value)} MB`);

const formatPercent = (value: number | undefined) => (value === undefined ? 'n/a' : `${value.toFixed(1)}%`);

const clampStoredPosition = (position: ToolbarPosition): ToolbarPosition => ({
  x: Math.min(Math.max(8, position.x), Math.max(8, window.innerWidth - toolbarWidth - 8)),
  y: Math.min(Math.max(8, position.y), Math.max(8, window.innerHeight - 180))
});

const readPosition = (): ToolbarPosition => {
  const rawPosition = window.localStorage.getItem(debugToolbarPositionStorageKey);
  if (!rawPosition) return defaultPosition();

  try {
    const parsed = JSON.parse(rawPosition) as Partial<ToolbarPosition>;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return clampStoredPosition({ x: parsed.x, y: parsed.y });
    }
  } catch {
    return defaultPosition();
  }

  return defaultPosition();
};

const readRendererMemory = (): RendererMemory | undefined => {
  const memory = (performance as PerformanceWithMemory).memory;
  if (!memory) return undefined;

  return {
    jsHeapLimitMb: bytesToMegabytes(memory.jsHeapSizeLimit),
    jsHeapUsedMb: bytesToMegabytes(memory.usedJSHeapSize)
  };
};

const DebugProcessNode = ({ depth, metric }: { depth: number; metric: DebugProcessMetric }) => (
  <>
    <div class="contents">
      <div class="min-w-0 truncate font-mono" style={{ paddingLeft: `${depth * 10}px` }}>
        <span class="text-soft">{depth > 0 ? '└ ' : ''}</span>
        {metric.name}
        <span class="ml-1 text-soft">#{metric.pid}</span>
      </div>
      <div class="text-right font-mono tabular-nums">{formatMegabytes(metric.memoryMb)}</div>
      <div class="text-right font-mono tabular-nums">{formatPercent(metric.cpuPercent)}</div>
    </div>
    {metric.children?.map((child) => (
      <DebugProcessNode key={`${child.pid}:${child.name}`} depth={depth + 1} metric={child} />
    ))}
  </>
);

const DebugProcessTree = ({ metrics }: { metrics: DebugMetrics | undefined }) => {
  if (!metrics?.processes.length) return null;

  return (
    <div class="mt-2 border-t border-line pt-2">
      <div class="mb-1 grid grid-cols-[1fr_3.25rem_2.75rem] gap-2 text-[11px] leading-3 text-soft">
        <div>start process</div>
        <div class="text-right">ram</div>
        <div class="text-right">cpu</div>
      </div>
      <div class="grid grid-cols-[1fr_3.25rem_2.75rem] gap-x-2 gap-y-1">
        {metrics.processes.map((metric) => (
          <DebugProcessNode key={`${metric.pid}:${metric.name}`} depth={0} metric={metric} />
        ))}
        <div class="mt-1 border-t border-line pt-1 font-medium text-soft">total</div>
        <div class="mt-1 border-t border-line pt-1 text-right font-mono font-medium tabular-nums">
          {formatMegabytes(metrics.appMemoryMb)}
        </div>
        <div class="mt-1 border-t border-line pt-1 text-right font-mono font-medium tabular-nums">
          {formatPercent(metrics.cpuPercent)}
        </div>
      </div>
    </div>
  );
};

export const DebugToolbar = () => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ moved: false, originX: 0, originY: 0, pointerX: 0, pointerY: 0 });
  const [fps, setFps] = useState(0);
  const [collapsed, setCollapsed] = useState(true);
  const [metrics, setMetrics] = useState<DebugMetrics>();
  const [position, setPosition] = useState(readPosition);
  const [rendererMemory, setRendererMemory] = useState<RendererMemory>();

  useEffect(() => {
    if (collapsed) {
      setFps(0);
      return;
    }

    let frame = 0;
    let frames = 0;
    let startedAt = performance.now();

    const measure = (now: number) => {
      frames += 1;
      if (now - startedAt >= 1000) {
        setFps(Math.round((frames * 1000) / (now - startedAt)));
        frames = 0;
        startedAt = now;
      }
      frame = requestAnimationFrame(measure);
    };

    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [collapsed]);

  useEffect(() => {
    if (collapsed) return;

    const refresh = () => {
      void window.pi.app.debugMetrics().then(setMetrics);
      setRendererMemory(readRendererMemory());
    };

    refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => window.clearInterval(interval);
  }, [collapsed]);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (toolbar) toolbar.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
  }, [position]);

  const rows = useMemo(
    () => [
      ['FPS', fps ? `${fps}` : 'n/a'],
      [
        'JS Heap',
        rendererMemory
          ? `${formatMegabytes(rendererMemory.jsHeapUsedMb)} / ${formatMegabytes(rendererMemory.jsHeapLimitMb)}`
          : 'n/a'
      ],
      ['Processes', metrics ? `${metrics.processCount}` : 'n/a']
    ],
    [fps, metrics, rendererMemory]
  );

  const clampPosition = (x: number, y: number) => {
    const toolbar = toolbarRef.current;
    const maxX = Math.max(8, window.innerWidth - (toolbar?.offsetWidth ?? toolbarWidth) - 8);
    const maxY = Math.max(8, window.innerHeight - (toolbar?.offsetHeight ?? 180) - 8);
    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY)
    };
  };

  const handlePointerDown = (event: PointerEvent) => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    event.preventDefault();
    toolbar.setPointerCapture(event.pointerId);
    dragRef.current = {
      moved: false,
      originX: position.x,
      originY: position.y,
      pointerX: event.clientX,
      pointerY: event.clientY
    };
  };

  const handlePointerMove = (event: PointerEvent) => {
    const toolbar = toolbarRef.current;
    if (!toolbar?.hasPointerCapture(event.pointerId)) return;

    const deltaX = event.clientX - dragRef.current.pointerX;
    const deltaY = event.clientY - dragRef.current.pointerY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) dragRef.current.moved = true;

    const nextPosition = clampPosition(dragRef.current.originX + deltaX, dragRef.current.originY + deltaY);
    toolbar.style.transform = `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0)`;
  };

  const handlePointerUp = (event: PointerEvent) => {
    const toolbar = toolbarRef.current;
    if (!toolbar?.hasPointerCapture(event.pointerId)) return;

    toolbar.releasePointerCapture(event.pointerId);
    const nextPosition = clampPosition(
      dragRef.current.originX + event.clientX - dragRef.current.pointerX,
      dragRef.current.originY + event.clientY - dragRef.current.pointerY
    );
    window.localStorage.setItem(debugToolbarPositionStorageKey, JSON.stringify(nextPosition));
    setPosition(nextPosition);
    if (!dragRef.current.moved) setCollapsed((value) => !value);
  };

  const handleHeaderClick = (event: MouseEvent) => {
    if (event.detail === 0) setCollapsed((value) => !value);
  };

  return (
    <div
      ref={toolbarRef}
      class="fixed top-0 left-0 z-50 w-78 rounded-2xl bg-composer py-1.25 pr-1.5 pl-1.75 text-ink shadow-panel select-none [-webkit-app-region:no-drag]"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <button
        type="button"
        class={cn(
          'flex w-full cursor-grab items-center justify-center rounded-xl border-0 bg-control px-2 py-1 text-ink active:cursor-grabbing',
          !collapsed && 'mb-1.5'
        )}
        aria-expanded={!collapsed}
        onPointerDown={handlePointerDown}
        onClick={handleHeaderClick}
      >
        <div class="text-[11px] leading-4 font-semibold tracking-[0.08em] text-soft uppercase">Debug</div>
      </button>
      {!collapsed && (
        <div class="px-1 py-0.5 text-xs leading-4">
          <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {rows.map(([label, value]) => (
              <div class="contents" key={label}>
                <div class="text-soft">{label}</div>
                <div class="truncate text-right font-mono tabular-nums">{value}</div>
              </div>
            ))}
          </div>
          <DebugProcessTree metrics={metrics} />
        </div>
      )}
    </div>
  );
};
