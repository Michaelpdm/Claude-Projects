import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { isDemo } from '../demo/mockApi';
import PhoneChat from '../demo/PhoneChat';

// Full-screen, recording-friendly view of the WhatsApp assistant: one big phone, the whole conversation from the start.
export default function AssistantShowcase({ onClose }) {
  const demo = isDemo();
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [run, setRun] = useState(0); // changing this restarts the conversation from the beginning
  const [stats, setStats] = useState({ replies: 0, leads: 0, orders: 0 });
  const [zoom, setZoom] = useState(1.3);

  useEffect(() => {
    const fit = () => setZoom(Math.max(0.9, Math.min(1.6, (window.innerHeight - 200) / 540)));
    fit();
    window.addEventListener('resize', fit);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, s] = await Promise.all([apiFetch('/api/products', { silent: true }), apiFetch('/api/settings', { silent: true })]);
      if (!alive) return;
      if (p.ok) setProducts(await p.json());
      if (s.ok) setSettings(await s.json());
      setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  const onEvent = useCallback((ev) => {
    setStats((s) => ({
      replies: s.replies + (ev.type === 'reply' ? 1 : 0),
      leads: s.leads + (ev.type === 'lead' ? 1 : 0),
      orders: s.orders + (ev.type === 'sale' ? 1 : 0),
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center overflow-y-auto bg-zinc-950/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="WhatsApp assistant">
      <div className="flex w-full max-w-3xl items-center gap-2 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-100">WhatsApp assistant</h2>
          <p className="text-[12px] text-zinc-400">
            {demo ? 'Replies instantly while the owner is away, using live stock and prices.' : 'Preview using your real stock. Not connected to WhatsApp yet.'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => { setStats({ replies: 0, leads: 0, orders: 0 }); setRun((r) => r + 1); }}>
            <RotateCcw size={13} /> Restart
          </button>
          <button className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play size={13} /> : <Pause size={13} />} {paused ? 'Resume' : 'Pause'}
          </button>
          <div className="hidden rounded-lg border border-zinc-700 bg-zinc-900 p-0.5 text-[12px] sm:flex">
            {[1, 2].map((s) => (
              <button key={s} onClick={() => setSpeed(s)} aria-pressed={speed === s}
                className={`rounded-md px-2 py-0.5 ${speed === s ? 'bg-gold-500 text-[rgb(var(--on-accent))]' : 'text-zinc-400 hover:text-zinc-100'}`}>{s}×</button>
            ))}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-300 hover:bg-zinc-800"><X size={16} /></button>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center pb-6 pt-1">
        <div style={{ zoom }}>
          <PhoneChat key={run} products={products} settings={settings} ready={ready} speed={speed} paused={paused} onEvent={onEvent} seed={7} />
        </div>
      </div>

      <div className="mb-5 grid w-full max-w-md grid-cols-3 gap-2 px-4 text-center">
        {[['Auto-replies', stats.replies], ['Leads saved', stats.leads], ['Orders', stats.orders]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-zinc-700 bg-zinc-900 py-2"><div className="text-[17px] font-semibold">{v}</div><div className="text-[11px] text-zinc-400">{l}</div></div>
        ))}
      </div>
    </div>
  );
}
