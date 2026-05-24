import { useCallback, useEffect, useRef, useState } from 'react';
import { useVisible } from '@/use-visible';
import { ANNOTATIONS, AnnotationLines, computePath, DEFAULT_TARGETS, TEXT_GAP } from '../annotations';
import { Preview } from './preview';

const LERP_FACTOR = 0.12;
const SETTLE_THRESHOLD = 0.05;

export const DiagramOverlay = () => {
  const isVisible = useVisible();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const currentPositions = useRef(DEFAULT_TARGETS.map((t) => ({ x: t.x, y: t.y })));
  const isSettled = useRef(true);
  const rafId = useRef(0);
  const [isPositioned, setIsPositioned] = useState(false);

  const tick = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const inv = ctm.inverse();

    const railEl = document.querySelector('[data-inner-rail]');
    if (!railEl) return;
    const railRect = railEl.getBoundingClientRect();
    const pt = svg.createSVGPoint();
    pt.x = railRect.left;
    pt.y = 0;
    const railLeftSvg = pt.matrixTransform(inv).x;
    pt.x = railRect.right;
    const railRightSvg = pt.matrixTransform(inv).x;

    const markers = document.querySelectorAll<HTMLElement>('[data-annotation-marker]');

    let stillMoving = false;

    for (let i = 0; i < ANNOTATIONS.length; i++) {
      const annotation = ANNOTATIONS[i];
      const isLeft = annotation.side === 'left';
      const railX = isLeft ? railLeftSvg : railRightSvg;

      const g = svg.querySelector(`[data-annotation-group="${i}"]`);
      if (!g) continue;

      const labelDot = g.querySelector("[data-role='label-dot']");
      const labelText = g.querySelector("[data-role='label-text']");
      if (labelDot) {
        labelDot.setAttribute('cx', String(railX));
      }
      if (labelText) {
        const textX = isLeft ? railX - TEXT_GAP : railX + TEXT_GAP;
        labelText.setAttribute('x', String(textX));
      }

      const lineG = svg.querySelector(`[data-annotation-line="${i}"]`);
      if (!lineG) continue;
      const path = lineG.querySelector("[data-role='line']");
      const target = lineG.querySelector("[data-role='target']");
      if (!path || !target) continue;

      if (markers.length > 0) {
        const marker = markers[i] as HTMLElement | undefined;
        if (marker) {
          const rect = marker.getBoundingClientRect();
          const mPt = svg.createSVGPoint();
          mPt.x = rect.left + 0.5;
          mPt.y = rect.top + 0.5;
          const rawTarget = mPt.matrixTransform(inv);

          const cur = currentPositions.current[i];
          const dx = rawTarget.x - cur.x;
          const dy = rawTarget.y - cur.y;

          if (Math.abs(dx) > SETTLE_THRESHOLD || Math.abs(dy) > SETTLE_THRESHOLD) {
            cur.x += dx * LERP_FACTOR;
            cur.y += dy * LERP_FACTOR;
            stillMoving = true;
          } else {
            cur.x = rawTarget.x;
            cur.y = rawTarget.y;
          }

          target.setAttribute('cx', String(cur.x));
          target.setAttribute('cy', String(cur.y));
          path.setAttribute('d', computePath(railX, annotation.labelY, cur.x, cur.y));
        }
      } else {
        const def = DEFAULT_TARGETS[i];
        path.setAttribute('d', computePath(railX, annotation.labelY, def.x, def.y));
      }
    }

    if (stillMoving) {
      rafId.current = requestAnimationFrame(tick);
    } else {
      isSettled.current = true;
    }

    setIsPositioned(true);
  }, []);

  const startTracking = useCallback(() => {
    if (!isSettled.current) return;
    isSettled.current = false;
    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  const onPointerEnter = useCallback(() => {
    svgRef.current?.setAttribute('data-hovered', '');
    isSettled.current = false;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  const onPointerLeave = useCallback(() => {
    svgRef.current?.removeAttribute('data-hovered');
    isSettled.current = false;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(tick);

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('pointerenter', onPointerEnter);
    container.addEventListener('pointerleave', onPointerLeave);

    const onTransitionRun = () => startTracking();
    container.addEventListener('transitionstart', onTransitionRun, true);

    const onResize = () => {
      isSettled.current = false;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(tick);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId.current);
      container.removeEventListener('pointerenter', onPointerEnter);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('transitionstart', onTransitionRun, true);
      window.removeEventListener('resize', onResize);
    };
  }, [tick, startTracking, onPointerEnter, onPointerLeave]);

  useEffect(() => {
    if (!isVisible) {
      cancelAnimationFrame(rafId.current);
      return;
    }
    isSettled.current = false;
    rafId.current = requestAnimationFrame(tick);
  }, [isVisible, tick]);

  return (
    <div
      ref={containerRef}
      className={`group/section relative w-full overflow-visible flex-1 min-h-0 ${!isVisible ? 'paused' : ''}`}
    >
      <div className="relative w-full h-full">
        <svg
          role="presentation"
          aria-hidden="true"
          ref={svgRef}
          viewBox="0 0 1000 580"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
          overflow="visible"
          className={`absolute inset-0 w-full h-full pointer-events-none z-[103] hidden ${isPositioned ? 'lg:block' : ''}`}
        >
          <style>{`
            svg[data-hovered] .annotation-line { stroke-dashoffset: 0 !important; }
            svg[data-hovered] .annotation-target { opacity: 0.5 !important; }
          `}</style>
          <AnnotationLines />
        </svg>

        <div className="relative w-full h-full flex items-start justify-center sm:pt-[2%]">
          <Preview />
        </div>
      </div>
    </div>
  );
};
