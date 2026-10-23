import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MessageCircle, Plus, ReceiptText, ShoppingBag, UserPlus, PackageOpen, TriangleAlert } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { isDemo, demoAddActivity, demoRecordChatSale } from '../demo/mockApi';
import PhoneChat from '../demo/PhoneChat';
import {
  Card, Delta, Donut, Heatmap, Kpi, Ring, naira, nairaCompact, useChartColors, useCountUp,
} from '../components/dash';

const FEED_ICON = {
  sale: [ShoppingBag, 'text-gold-400 bg-gold-500/10'],
  lead: [UserPlus, 'text-peri bg-peri/10'],
  invoice: [ReceiptText, 'text-lilac bg-lilac/10'],
  reserve: [ReceiptText, 'text-lilac bg-lilac/10'],
  reply: [MessageCircle, 'text-rose bg-rose/10'],
};

const ago = (at, now) => {
  const m = Math.max(0, Math.round((now - at) / 60000));
  return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
};

export default function Home() {
  const C = useChartColors();
  const [d, setD] = useState(null);
  const [failed, setFailed] = useState(false);
  const [replies, setReplies] = useState(23);
  const [leads, setLeads] = useState(9);
  const demo = isDemo();

  const load = useCallback(async () => {
    const res = await apiFetch('/api/reports/dashboard', { silent: true });
    if (!res.ok) { setFailed(true); return; }
    setFailed(false);
    setD(await res.json());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, demo ? 4000 : 60000);
    return () => clearInterval(t);
  }, [load, demo]);

  const onChatEvent = useCallback((ev) => {
    if (ev.type === 'lead') {
      setLeads((n) => n + 1);
      setReplies((n) => n + 1);
      demoAddActivity({ type: 'lead', title: ev.label, meta: 'WhatsApp assistant' });
    } else {
      if (ev.type === 'sale') demoRecordChatSale(ev);
      demoAddActivity({ type: ev.type, title: ev.product, meta: `${ev.buyer} · ${ev.channel}`, amount: ev.amount });
    }
    load();
  }, [load]);

  const revenue = useCountUp(d?.today.revenue || 0, 900);

  if (!d) {
    return (
      <div className="p-6 text-center text-zinc-400">
        {failed
          ? <>We couldn’t load your dashboard. <button className="text-gold-400 underline" onClick={load}>Try again</button></>
          : 'Loading your dashboard…'}
      </div>
    );
  }

  const t = d.today;
  const empty = t.orders === 0 && d.daily.every((x) => x.revenue === 0);
  const catColors = [C.accent, C.peri, C.rose, C.sand, C.slate, C.lilac];
  const maxTop = d.top_products[0]?.revenue || 1;
  const dateText = new Date(d.now + 3600000).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <div className="mx-auto max-w-[1600px] p-3 md:p-5">
      {/* greeting */}
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 md:text-2xl">{d.greeting}, {d.store_name}</h1>
          <p className="text-sm text-zinc-400">{dateText}</p>
        </div>
        <Link to="/sales" className="btn-primary shrink-0"><Plus size={16} /> New sale</Link>
      </div>

      {empty && (
        <div className="card mb-3 flex items-center gap-3 !border-gold-500/40 text-sm text-zinc-300">
          <PackageOpen size={18} className="shrink-0 text-gold-500" />
          <span>Nothing sold yet. Add your products in <Link className="text-gold-400 underline" to="/inventory">Inventory</Link>, then make your first sale.</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        {/* hero: today's revenue */}
        <section className="card col-span-12 flex flex-col justify-between gap-4 !p-5 lg:col-span-5" style={{ background: 'linear-gradient(135deg, rgb(var(--gold-500) / 0.16), rgb(var(--z-900)) 65%)' }}>
          <div>
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span>Today’s revenue</span>
              <span className="flex items-center gap-1 text-xs text-zinc-400">vs yesterday <Delta value={d.change.revenue} /></span>
            </div>
            <div className="mt-2 text-[40px] font-semibold leading-none tracking-tight text-zinc-100">{naira(revenue)}</div>
            <div className="mt-2 text-sm text-zinc-300"><b className="text-zinc-100">{t.orders}</b> {t.orders === 1 ? 'sale' : 'sales'} made today · {t.items} items</div>
          </div>
          <div className="flex items-center gap-4">
            <Ring pct={d.rings.daily} size={96} stroke={9} color={C.accent}>
              <span className="text-lg font-semibold">{Math.round(d.rings.daily)}%</span>
            </Ring>
            <div className="text-sm">
              <div className="text-zinc-400">Daily target</div>
              <div className="font-semibold text-zinc-100">{nairaCompact(t.revenue)} <span className="font-normal text-zinc-400">of {nairaCompact(d.target)}</span></div>
              <div className="text-xs text-zinc-400">{t.revenue >= d.target ? 'Target reached 🎉' : `${nairaCompact(d.target - t.revenue)} to go`}</div>
            </div>
          </div>
        </section>

        {/* KPI grid */}
        <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7">
          <Kpi id="rev" label="Revenue" value={t.revenue} format={nairaCompact} change={d.change.revenue} spark={d.spark.revenue} color={C.accent} />
          <Kpi id="ord" label="Orders" value={t.orders} format={(v) => Math.round(v)} change={d.change.orders} spark={d.spark.orders} color={C.peri} />
          <Kpi id="itm" label="Items sold" value={t.items} format={(v) => Math.round(v)} change={d.change.items} spark={d.spark.orders} color={C.rose} />
          <Kpi id="aov" label="Avg order" value={t.aov} format={nairaCompact} change={d.change.aov} spark={d.spark.aov} color={C.sand} />
          <Kpi id="pro" label="Gross profit" value={t.profit} format={nairaCompact} change={d.change.profit} spark={d.spark.profit} color={C.lilac} />
          <Kpi id="dbt" label="Owed to you" value={t.debts} format={nairaCompact} change={null} spark={d.spark.revenue} color={C.slate} />
        </div>

        {/* left column */}
        <div className="col-span-12 grid grid-cols-12 content-start gap-3 xl:col-span-8">
          <Card className="col-span-12 lg:col-span-8" title="Revenue and profit · today" right={<span className="text-[11px] text-zinc-400">hourly</span>}>
            <div className="h-[230px]">
              <ResponsiveContainer>
                <AreaChart data={d.hourly} margin={{ top: 4, right: 6, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: C.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={nairaCompact} tick={{ fill: C.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={58} />
                  <Tooltip formatter={(v, n) => [naira(v), n === 'revenue' ? 'Revenue' : 'Profit']} contentStyle={{ background: C.tip, border: `1px solid ${C.grid}`, borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke={C.accent} strokeWidth={2} fill="url(#gRev)" />
                  <Area type="monotone" dataKey="profit" stroke={C.peri} strokeWidth={2} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-4" title="How you’re doing">
            <div className="grid grid-cols-2 gap-x-2 gap-y-4 pt-1">
              {[['Today’s target', d.rings.daily, C.accent], ['This month', d.rings.monthly, C.peri], ['Stock health', d.rings.stock, C.rose], ['Debt collected', d.rings.debt, C.sand]].map(([label, p, c]) => (
                <div key={label} className="flex flex-col items-center">
                  <Ring pct={p} size={84} stroke={8} color={c}><span className="text-[15px] font-semibold">{Math.round(p)}%</span></Ring>
                  <span className="mt-1.5 text-[11px] text-zinc-400">{label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-12" title="Last 30 days" right={<span className="text-[11px] text-zinc-400">revenue</span>}>
            <div className="h-[170px]">
              <ResponsiveContainer>
                <AreaChart data={d.daily} margin={{ top: 4, right: 6, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="gDay" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.peri} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.peri} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: C.tick, fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tickFormatter={nairaCompact} tick={{ fill: C.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={58} />
                  <Tooltip formatter={(v) => [naira(v), 'Revenue']} contentStyle={{ background: C.tip, border: `1px solid ${C.grid}`, borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke={C.peri} strokeWidth={2} fill="url(#gDay)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-4" title="Sales by category"><Donut data={d.categories} colors={catColors} tip={C.tip} /></Card>
          <Card className="col-span-12 md:col-span-6 lg:col-span-4" title="Payment method"><Donut data={d.payments} colors={[C.accent, C.peri, C.sand, C.rose]} tip={C.tip} /></Card>
          <Card className="col-span-12 lg:col-span-4" title="Busy hours"><Heatmap rows={d.heatmap} color={C.accent} /></Card>

          <Card className="col-span-12 md:col-span-6" title="Top products · 30 days">
            {d.top_products.length === 0 ? <p className="py-6 text-center text-sm text-zinc-500">No sales yet</p> : (
              <ul className="space-y-2.5">
                {d.top_products.map((p, i) => (
                  <li key={p.name} className="text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-zinc-500">{i + 1}</span>
                      <span className="truncate text-zinc-200">{p.name}</span>
                      <span className="ml-auto text-zinc-400">{p.units} sold</span>
                      <span className="w-16 text-right font-medium">{nairaCompact(p.revenue)}</span>
                    </div>
                    <div className="ml-6 mt-1 h-1 rounded-full bg-zinc-700"><div className="h-1 rounded-full bg-gold-500" style={{ width: `${(p.revenue / maxTop) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="col-span-12 md:col-span-6" title="Running low" right={d.low_stock.length ? <TriangleAlert size={14} className="text-amber" /> : null}>
            {d.low_stock.length === 0 ? <p className="py-6 text-center text-sm text-zinc-500">All items well stocked</p> : (
              <ul className="divide-y divide-zinc-700">
                {d.low_stock.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 py-2 text-[12px] first:pt-0">
                    <div className="min-w-0"><div className="truncate text-zinc-200">{p.name}</div><div className="text-zinc-400">{p.variant}</div></div>
                    <span className={`ml-auto badge ${p.left <= 1 ? 'badge-red' : 'badge-amber'}`}>{p.left === 0 ? 'Out' : `${p.left} left`}</span>
                    <Link to="/inventory" className="btn-secondary !px-2 !py-1 text-xs">Restock</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* right column */}
        <div className="col-span-12 flex flex-col gap-3 xl:col-span-4">
          {demo ? (
            <Card title="WhatsApp assistant" right={<span className="badge badge-green">Owner away · replying</span>}>
              <PhoneChat onEvent={onChatEvent} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[['Auto-replies', replies], ['Leads saved', leads], ['Avg reply', '3s']].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-zinc-800 py-2"><div className="text-[15px] font-semibold">{v}</div><div className="text-[10px] text-zinc-400">{l}</div></div>
                ))}
              </div>
            </Card>
          ) : (
            <Card title="WhatsApp assistant">
              <div className="py-4 text-center text-sm text-zinc-400">
                <MessageCircle className="mx-auto mb-2 text-gold-500" size={22} />
                Not connected yet. When it is, it will answer customers automatically while you’re away.
                <div className="mt-3"><Link to="/settings" className="btn-secondary">Open settings</Link></div>
              </div>
            </Card>
          )}

          <Card title="Live activity" right={<span className="flex items-center gap-1 text-[11px] text-zinc-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-peri" />live</span>}>
            {d.activity.length === 0 ? <p className="py-6 text-center text-sm text-zinc-500">Sales and messages will show up here</p> : (
              <ul className="space-y-2">
                {d.activity.map((f) => {
                  const [Icon, tone] = FEED_ICON[f.type] || FEED_ICON.sale;
                  return (
                    <li key={f.id} className="anim-slide-in flex items-center gap-2.5 text-[12px]">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={14} /></span>
                      <div className="min-w-0"><div className="truncate text-zinc-200">{f.title}</div><div className="truncate text-zinc-400">{f.meta}</div></div>
                      <div className="ml-auto text-right">{f.amount ? <div className="font-medium">{naira(f.amount)}</div> : null}<div className="text-[10px] text-zinc-500">{ago(f.at, d.now)}</div></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
