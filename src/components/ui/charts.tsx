// Lightweight hand-rolled SVG charts — no external dependency.

export function Sparkline({
  data,
  color = '#c2410c',
  fill = true,
  className = 'h-8 w-full',
}: {
  data: number[];
  color?: string;
  fill?: boolean;
  className?: string;
}) {
  const W = 100;
  const H = 30;
  if (data.length < 2) {
    return <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden />;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 6) - 3;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      {fill && <path d={area} fill={color} opacity={0.1} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BarLineChart({
  bars,
  line,
  barColor = '#c2410c',
  lineColor = '#4d7c0f',
  className = 'h-56 w-full',
}: {
  bars: number[];
  line: number[];
  barColor?: string;
  lineColor?: string;
  className?: string;
}) {
  const W = 360;
  const H = 150;
  const pad = 6;
  const n = Math.max(bars.length, 1);
  const slot = W / n;
  const barW = slot * 0.5;
  const barMax = Math.max(1, ...bars);
  const lineMax = Math.max(1, ...line);
  const plotH = H - pad * 2;

  const grid = [0.25, 0.5, 0.75, 1].map((g) => H - pad - g * plotH);
  const linePts = line.map((v, i) => {
    const x = i * slot + slot / 2;
    const y = H - pad - (v / lineMax) * plotH;
    return [x, y] as const;
  });
  const linePath = linePts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      {grid.map((y, i) => (
        <line key={i} x1={0} y1={y} x2={W} y2={y} stroke="#e7e5e4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {bars.map((v, i) => {
        const h = (v / barMax) * plotH;
        const x = i * slot + (slot - barW) / 2;
        const y = H - pad - h;
        return <rect key={i} x={x} y={y} width={barW} height={Math.max(h, 0.5)} rx={1.5} fill={barColor} opacity={0.85} />;
      })}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      {linePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.4} fill="#fff" stroke={lineColor} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

export function Donut({
  segments,
  size = 168,
  thickness = 22,
  centerTop,
  centerSub,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerSub?: string;
}) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#f0ece4" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${c} ${c})`}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      {(centerTop || centerSub) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerTop && <div className="text-[26px] font-bold leading-none" style={{ color: '#1c1917' }}>{centerTop}</div>}
          {centerSub && <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: '#78716c' }}>{centerSub}</div>}
        </div>
      )}
    </div>
  );
}
