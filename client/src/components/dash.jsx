import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export const naira = (n) => `₦${Math.round(n || 0).toLocaleString('en-NG')}`;
export const nairaCompact = (n) => {
  const v = Math.abs(n || 0);
  const s = v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : `${Math.round(v)}`;
  return `${n < 0 ? '-' : ''}₦${s}`;
};

const PALETTE = {
  dark:  { accent: '#C8A96A', peri: '#7C8CF8', rose: '#E27D8E', sand: '#D9B98C', slate: '#5C6B85', lilac: '#A992E2', grid: '#232833', tick: '#8A8F9A', tip: '#181C24' },
  light: { accent: '#A8874A', peri: '#5464D6', rose: '#C85268', sand: '#B8946A', slate: '#5C6B85', lilac: '#7F66C8', grid: '#E3DFD7', tick: '#6B6F78', tip: '#FFFFFF' },
};

// Re-renders when the theme is toggled so chart colours follow.
export function useChartColors() {
  const read = () => PALETTE[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
  const [c, setC] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setC(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return c;
}

export function useCountUp(target, ms = 700) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / ms);
      const val = a + (target - a) * (1 - Math.pow(1 - p, 3));
      from.current = val;
      setV(val);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function Card({ title, right, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between mb-3">
          <h2 className="panel-title">{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Delta({ value }) {
  if (value === null || value === undefined) return <span className="text-[11px] text-zinc-500">new</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] ${up ? 'text-peri' : 'text-coral'}`}>
      <Icon size={12} />{Math.abs(value)}%
    </span>
  );
}

export function Spark({ data, color, id }) {
  const gid = `sp-${id}`;
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gid})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Kpi({ id, label, value, format, change, spark, color }) {
  const shown = useCountUp(value);
  return (
    <div className="card !p-3">
      <div className="flex items-center justify-between text-[12px] text-zinc-400">
        <span>{label}</span>
        <Delta value={change} />
      </div>
      <div className="kpi-value mt-1.5 mb-1">{format(shown)}</div>
      <Spark id={id} data={spark} color={color} />
    </div>
  );
}

export function Ring({ pct, size = 150, stroke = 12, color, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const shown = useCountUp(pct, 900);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${Math.round(pct)} percent`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--z-700))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(Math.max(shown, 0), 100) / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Donut({ data, colors, tip }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return <div className="py-8 text-center text-sm text-zinc-500">No sales yet</div>;
  return (
    <div className="flex items-center gap-3">
      <div className="h-[118px] w-[118px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={36} outerRadius={56} paddingAngle={2} stroke="none">
              {data.map((d, i) => <Cell key={d.name} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => naira(v)} contentStyle={{ background: tip, border: '1px solid rgb(var(--z-700))', borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 min-w-0 space-y-1 text-[12px]">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="truncate text-zinc-300">{d.name}</span>
            <span className="ml-auto text-zinc-400">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Heatmap({ rows, color }) {
  return (
    <div className="space-y-[3px]">
      {rows.map((row) => (
        <div key={row.day} className="flex items-center gap-1.5">
          <span className="w-7 text-[10px] text-zinc-500">{row.day}</span>
          <div className="grid flex-1 grid-cols-12 gap-[3px]">
            {row.hours.map((v, i) => (
              <div key={i} className="h-[14px] rounded-[3px]" title={`${row.day} ${i + 9}:00`} style={{ background: color, opacity: 0.1 + v * 0.9 }} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-between pl-9 pt-1 text-[10px] text-zinc-500"><span>9am</span><span>3pm</span><span>8pm</span></div>
    </div>
  );
}
