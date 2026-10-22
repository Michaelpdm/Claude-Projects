import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Moon, Sun, Pause, Play, ArrowUpRight, ShoppingBag, MessageCircle, UserPlus, ReceiptText, ArrowLeft,
} from 'lucide-react';
import PhoneChat from '../demo/PhoneChat';
import {
  CATEGORIES, LOW_STOCK, PEAK, START, STORE, TOP_PRODUCTS,
  hourlySeries, makeSale, naira, nairaCompact, rng, sparkSeries,
} from '../demo/demoData';

const PALETTE = {
  dark:  { accent: '#C8A96A', peri: '#7C8CF8', rose: '#E27D8E', sand: '#D9B98C', slate: '#5C6B85', lilac: '#A992E2', grid: '#232833', tick: '#8A8F9A', tip: '#181C24' },
  light: { accent: '#A8874A', peri: '#5464D6', rose: '#C85268', sand: '#B8946A', slate: '#5C6B85', lilac: '#7F66C8', grid: '#E3DFD7', tick: '#6B6F78', tip: '#FFFFFF' },
};

const HOUR_LABELS = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'];

function useCountUp(target, ms = 700) {
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

function Card({ title, right, children, className = '' }) {
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

function Spark({ data, color }) {
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sp${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sp${color.slice(1)})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ label, value, format, delta, spark, color, flash }) {
  const shown = useCountUp(value);
  return (
    <div className={`card !p-3 transition-colors duration-500 ${flash ? 'border-gold-500/60' : ''}`}>
      <div className="flex items-center justify-between text-[12px] text-zinc-400">
        <span>{label}</span>
        <span className="inline-flex items-center gap-0.5 text-peri"><ArrowUpRight size={12} />{delta}</span>
      </div>
      <div className="kpi-value mt-1.5 mb-1">{format(shown)}</div>
      <Spark data={spark} color={color} />
    </div>
  );
}

function Ring({ pct, size = 150, stroke = 12, color, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const shown = useCountUp(pct, 900);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--z-700))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(shown, 100) / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

function Donut({ data, colors, tip }) {
  const total = data.reduce((a, d) => a + d.value, 0);
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

const FEED_ICON = {
  sale: [ShoppingBag, 'text-gold-400 bg-gold-500/10'],
  lead: [UserPlus, 'text-peri bg-peri/10'],
  invoice: [ReceiptText, 'text-lilac bg-lilac/10'],
  reserve: [ReceiptText, 'text-lilac bg-lilac/10'],
  reply: [MessageCircle, 'text-rose bg-rose/10'],
};

const SEED_FEED = [
  { id: 's1', type: 'sale', title: 'Silk Wrap Dress', meta: 'Kemi A. · In store', amount: 54000, t: '2m' },
  { id: 's2', type: 'reply', title: 'Auto-reply sent', meta: '"Is the agbada available?"', t: '6m' },
  { id: 's3', type: 'sale', title: 'Structured Tote Bag', meta: 'Uche M. · WhatsApp', amount: 46000, t: '11m' },
  { id: 's4', type: 'lead', title: 'Lead saved', meta: 'Halima Y. · WhatsApp', t: '15m' },
];

export default function Demo() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [stats, setStats] = useState(START);
  const [hourly, setHourly] = useState(hourlySeries);
  const [feed, setFeed] = useState(SEED_FEED);
  const [flash, setFlash] = useState(false);
  const [leads, setLeads] = useState(9);
  const [replies, setReplies] = useState(23);
  const idRef = useRef(100);
  const salesSinceHour = useRef(0);
  const rand = useRef(rng(42));
  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);
  pausedRef.current = paused;
  speedRef.current = speed;
  const C = PALETTE[theme];

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('fs_theme', next); } catch { /* storage unavailable */ }
  };

  const pushFeed = useCallback((item) => {
    setFeed((f) => [{ ...item, id: `n${++idRef.current}`, t: 'now' }, ...f].slice(0, 12));
  }, []);

  const recordSale = useCallback((amount, items = 1) => {
    setStats((s) => ({ ...s, revenue: s.revenue + amount, orders: s.orders + 1, items: s.items + items }));
    // every 4th sale the clock moves on to the next hour (up to 8pm)
    const advance = ++salesSinceHour.current >= 4;
    if (advance) salesSinceHour.current = 0;
    const profit = Math.round(amount * 0.38);
    setHourly((h) => {
      if (advance && h.length < HOUR_LABELS.length) {
        return [...h, { hour: HOUR_LABELS[h.length], revenue: amount, profit }];
      }
      return h.map((x, i) => (i === h.length - 1 ? { ...x, revenue: x.revenue + amount, profit: x.profit + profit } : x));
    });
    setFlash(true);
    setTimeout(() => setFlash(false), 900);
  }, []);

  const onChatEvent = useCallback((ev) => {
    if (ev.type === 'lead') {
      setLeads((n) => n + 1);
      setReplies((n) => n + 1);
      pushFeed({ type: 'lead', title: ev.label, meta: 'WhatsApp assistant' });
    } else if (ev.type === 'sale') {
      recordSale(ev.amount, ev.items);
      pushFeed({ type: 'sale', title: ev.product, meta: `${ev.buyer} · ${ev.channel}`, amount: ev.amount });
    } else {
      pushFeed({ type: ev.type, title: ev.product, meta: `${ev.buyer} · ${ev.channel}`, amount: ev.amount });
    }
  }, [pushFeed, recordSale]);

  // Live simulation: a new in-store sale every 6 to 12 seconds
  useEffect(() => {
    let alive = true;
    let timer;
    const schedule = () => {
      const wait = (6000 + rand.current() * 6000) / speedRef.current;
      timer = setTimeout(() => {
        if (!alive) return;
        if (!pausedRef.current) {
          const s = makeSale(rand.current);
          recordSale(s.amount, s.qty);
          pushFeed({ type: 'sale', title: s.product, meta: `${s.buyer} · ${s.channel}`, amount: s.amount });
        }
        schedule();
      }, wait);
    };
    schedule();
    return () => { alive = false; clearTimeout(timer); };
  }, [recordSale, pushFeed]);

  const pct = (stats.revenue / STORE.target) * 100;
  const profit = Math.round(stats.revenue * 0.38);
  const aov = stats.revenue / stats.orders;
  const sparks = useRef({
    rev: sparkSeries(1, 100), ord: sparkSeries(2, 60), itm: sparkSeries(3, 80),
    aov: sparkSeries(4, 90), pro: sparkSeries(5, 70), dbt: sparkSeries(6, 50),
  }).current;
  const catColors = [C.accent, C.peri, C.rose, C.sand, C.slate, C.lilac];
  const payData = [
    { name: 'Transfer', value: 41 }, { name: 'POS', value: 28 }, { name: 'Cash', value: 24 }, { name: 'Credit', value: 7 },
  ];
  const maxTop = TOP_PRODUCTS[0].revenue;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-700 bg-zinc-950/90 backdrop-blur px-3 md:px-4 py-2">
        <Link to="/" className="text-zinc-400 hover:text-zinc-100" aria-label="Back to app"><ArrowLeft size={16} /></Link>
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-bold text-gold-500">FS</div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold">{STORE.name}</div>
          <div className="text-[11px] text-zinc-400">{STORE.area}</div>
        </div>
        <span className="ml-2 hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-2.5 py-0.5 text-[11px] font-medium text-gold-400">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-500" /> Demo data
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden sm:flex items-center rounded-lg border border-zinc-700 bg-zinc-900 p-0.5 text-[12px]">
            {[1, 2, 4].map((s) => (
              <button key={s} onClick={() => setSpeed(s)} aria-pressed={speed === s}
                className={`rounded-md px-2 py-1 ${speed === s ? 'bg-gold-500 text-[rgb(var(--on-accent))]' : 'text-zinc-400 hover:text-zinc-100'}`}>{s}×</button>
            ))}
          </div>
          <button className="btn-secondary !px-2.5 !py-1.5" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Resume simulation' : 'Pause simulation'}>
            {paused ? <Play size={14} /> : <Pause size={14} />}
            <span className="hidden sm:inline">{paused ? 'Resume' : 'Pause'}</span>
          </button>
          <button className="btn-secondary !px-2.5 !py-1.5" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] grid-cols-12 gap-3 p-3 md:p-4">
        {/* KPI strip */}
        <div className="col-span-12 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Revenue today" value={stats.revenue} format={nairaCompact} delta="12.4%" spark={sparks.rev} color={C.accent} flash={flash} />
          <Kpi label="Orders" value={stats.orders} format={(v) => Math.round(v)} delta="8.1%" spark={sparks.ord} color={C.peri} flash={flash} />
          <Kpi label="Items sold" value={stats.items} format={(v) => Math.round(v)} delta="9.6%" spark={sparks.itm} color={C.rose} flash={flash} />
          <Kpi label="Avg order value" value={aov} format={nairaCompact} delta="3.2%" spark={sparks.aov} color={C.sand} />
          <Kpi label="Gross profit" value={profit} format={nairaCompact} delta="11.0%" spark={sparks.pro} color={C.lilac} flash={flash} />
          <Kpi label="Outstanding debts" value={START.debts} format={nairaCompact} delta="2.0%" spark={sparks.dbt} color={C.slate} />
        </div>

        {/* left column */}
        <div className="col-span-12 xl:col-span-8 grid grid-cols-12 gap-3 content-start">
          <Card className="col-span-12 lg:col-span-8" title="Revenue and profit · today"
            right={<span className="text-[11px] text-zinc-400">hourly</span>}>
            <div className="h-[230px]">
              <ResponsiveContainer>
                <AreaChart data={hourly} margin={{ top: 4, right: 6, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: C.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => nairaCompact(v)} tick={{ fill: C.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={58} />
                  <Tooltip formatter={(v, n) => [naira(v), n === 'revenue' ? 'Revenue' : 'Profit']}
                    contentStyle={{ background: C.tip, border: `1px solid ${C.grid}`, borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke={C.accent} strokeWidth={2} fill="url(#gRev)" />
                  <Area type="monotone" dataKey="profit" stroke={C.peri} strokeWidth={2} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-4" title="Daily target">
            <div className="flex flex-col items-center gap-3">
              <Ring pct={pct} color={C.accent}>
                <div>
                  <div className="text-[22px] font-semibold leading-none">{Math.round(pct)}%</div>
                  <div className="mt-1 text-[11px] text-zinc-400">{nairaCompact(stats.revenue)} of {nairaCompact(STORE.target)}</div>
                </div>
              </Ring>
              <div className="grid w-full grid-cols-3 gap-2 text-center">
                {[['Monthly', 74, C.peri], ['Stock health', 91, C.rose], ['Debt collected', 62, C.sand]].map(([l, p, c]) => (
                  <div key={l} className="flex flex-col items-center">
                    <Ring pct={p} size={52} stroke={6} color={c}><span className="text-[11px] font-semibold">{p}%</span></Ring>
                    <span className="mt-1 text-[10px] leading-tight text-zinc-400">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-4" title="Sales by category">
            <Donut data={CATEGORIES} colors={catColors} tip={C.tip} />
          </Card>
          <Card className="col-span-12 md:col-span-6 lg:col-span-4" title="Payment method">
            <Donut data={payData} colors={[C.accent, C.peri, C.sand, C.rose]} tip={C.tip} />
          </Card>
          <Card className="col-span-12 lg:col-span-4" title="Peak hours · 7 days">
            <div className="space-y-[3px]">
              {PEAK.map((row) => (
                <div key={row.day} className="flex items-center gap-1.5">
                  <span className="w-7 text-[10px] text-zinc-500">{row.day}</span>
                  <div className="grid flex-1 grid-cols-12 gap-[3px]">
                    {row.hours.map((v, i) => (
                      <div key={i} className="h-[14px] rounded-[3px]" title={`${i + 9}:00`}
                        style={{ background: C.accent, opacity: 0.1 + v * 0.9 }} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-between pl-9 pt-1 text-[10px] text-zinc-500"><span>9am</span><span>3pm</span><span>8pm</span></div>
            </div>
          </Card>

          <Card className="col-span-12 md:col-span-6" title="Top products">
            <ul className="space-y-2.5">
              {TOP_PRODUCTS.map((p, i) => (
                <li key={p.name} className="text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-zinc-500">{i + 1}</span>
                    <span className="truncate text-zinc-200">{p.name}</span>
                    <span className="ml-auto text-zinc-400">{p.units} sold</span>
                    <span className="w-16 text-right font-medium">{nairaCompact(p.revenue)}</span>
                  </div>
                  <div className="ml-6 mt-1 h-1 rounded-full bg-zinc-700">
                    <div className="h-1 rounded-full bg-gold-500" style={{ width: `${(p.revenue / maxTop) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="col-span-12 md:col-span-6" title="Low stock">
            <ul className="divide-y divide-zinc-700">
              {LOW_STOCK.map((p) => (
                <li key={p.name + p.variant} className="flex items-center gap-2 py-2 text-[12px] first:pt-0">
                  <div className="min-w-0">
                    <div className="truncate text-zinc-200">{p.name}</div>
                    <div className="text-zinc-400">{p.variant}</div>
                  </div>
                  <span className={`ml-auto badge ${p.left <= 1 ? 'badge-red' : 'badge-amber'}`}>{p.left} left</span>
                  <button className="btn-secondary !px-2 !py-1 text-xs">Restock</button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* right column: phone + feed */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-3">
          <Card title="WhatsApp assistant"
            right={<span className="badge badge-green">Owner away · replying</span>}>
            <PhoneChat speed={speed} paused={paused} onEvent={onChatEvent} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[['Auto-replies', replies], ['Leads', leads], ['Avg reply', '3s']].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-zinc-800 py-2">
                  <div className="text-[15px] font-semibold">{v}</div>
                  <div className="text-[10px] text-zinc-400">{l}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Live activity" right={<span className="flex items-center gap-1 text-[11px] text-zinc-400"><span className="h-1.5 w-1.5 rounded-full bg-peri animate-pulse" />live</span>}>
            <ul className="space-y-2">
              {feed.map((f) => {
                const [Icon, tone] = FEED_ICON[f.type] || FEED_ICON.sale;
                return (
                  <li key={f.id} className="flex items-center gap-2.5 text-[12px] anim-slide-in">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={14} /></span>
                    <div className="min-w-0">
                      <div className="truncate text-zinc-200">{f.title}</div>
                      <div className="truncate text-zinc-400">{f.meta}</div>
                    </div>
                    <div className="ml-auto text-right">
                      {f.amount && <div className="font-medium">{naira(f.amount)}</div>}
                      <div className="text-[10px] text-zinc-500">{f.t}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
