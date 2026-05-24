interface Annotation {
  label: string;
  side: 'left' | 'right';
  labelY: number;
}

export const ANNOTATIONS: Annotation[] = [
  { label: 'PARALLEL', side: 'left', labelY: 205 },
  { label: 'CHAT SESSIONS', side: 'left', labelY: 285 },
  { label: 'MULTI-MODEL', side: 'left', labelY: 365 },
  { label: 'FILE CONTEXT', side: 'left', labelY: 445 },
  { label: 'DIFF VIEWER', side: 'right', labelY: 205 },
  { label: 'LOCAL FIRST', side: 'right', labelY: 285 },
  { label: 'FILE EDITS', side: 'right', labelY: 365 },
  { label: 'GIT WORKFLOW', side: 'right', labelY: 445 }
];

export const DEFAULT_TARGETS = [
  { x: 412, y: 115 },
  { x: 425, y: 195 },
  { x: 470, y: 275 },
  { x: 440, y: 338 },
  { x: 518, y: 112 },
  { x: 518, y: 150 },
  { x: 518, y: 248 },
  { x: 548, y: 348 }
];

const STROKE = '#2c2418';
const LINE_OPACITY = 0.5;
const DASH_TOTAL = 2000;
const DRAW_DURATION = 0.6;
const STAGGER_DELAY = 0.08;

export const TEXT_GAP = 16;
export const LABEL_DOT_R = 4.5;
export const TARGET_DOT_R = 3;

export const getLabelX = (side: 'left' | 'right') => (side === 'left' ? 0 : 1000);

export const computePath = (labelX: number, labelY: number, targetX: number, targetY: number) => {
  const isLeft = labelX < targetX;
  const dir = isLeft ? 1 : -1;
  const startX = labelX + dir * LABEL_DOT_R;
  const startY = labelY;
  const vertDir = targetY > startY ? -1 : 1;
  const endX = targetX;
  const endY = targetY + vertDir * TARGET_DOT_R;
  const curveEntry = isLeft ? targetX - 40 : targetX + 40;
  return `M ${startX} ${startY} L ${curveEntry} ${startY} Q ${targetX} ${startY} ${endX} ${endY}`;
};

export const AnnotationLines = () => {
  return (
    <g>
      {ANNOTATIONS.map((annotation, i) => {
        const labelX = getLabelX(annotation.side);
        const target = DEFAULT_TARGETS[i];
        const isLeft = annotation.side === 'left';
        const textX = isLeft ? labelX - TEXT_GAP : labelX + TEXT_GAP;
        const delay = i * STAGGER_DELAY;
        return (
          <g key={annotation.label} data-annotation-group={i}>
            <g data-annotation-line={i}>
              <path
                data-role="line"
                d={computePath(labelX, annotation.labelY, target.x, target.y)}
                fill="none"
                stroke={STROKE}
                strokeOpacity={LINE_OPACITY}
                strokeWidth={1}
                strokeDasharray={DASH_TOTAL}
                strokeDashoffset={-DASH_TOTAL}
                className="annotation-line"
                style={{
                  transition: `stroke-dashoffset ${DRAW_DURATION}s ease ${delay}s`
                }}
              />
              <circle
                data-role="target"
                cx={target.x}
                cy={target.y}
                r={TARGET_DOT_R}
                fill="none"
                stroke={STROKE}
                strokeWidth={1}
                opacity={0}
                className="annotation-target"
                style={{
                  transition: `opacity 0.3s ease ${delay + DRAW_DURATION * 0.5}s`
                }}
              />
            </g>
            <circle
              data-role="label-dot"
              cx={labelX}
              cy={annotation.labelY}
              r={LABEL_DOT_R}
              fill="var(--color-retro-cream)"
              stroke={STROKE}
              strokeOpacity={LINE_OPACITY}
              strokeWidth={1.25}
            />
            <text
              data-role="label-text"
              x={textX}
              y={annotation.labelY}
              textAnchor={isLeft ? 'end' : 'start'}
              dominantBaseline="central"
              fill={STROKE}
              fillOpacity={0.85}
              fontSize={18}
              fontFamily="var(--font-pixel)"
              letterSpacing="0.1em"
            >
              {annotation.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};
