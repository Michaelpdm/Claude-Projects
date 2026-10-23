import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Pause, Play, X } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { isDemo, demoAddActivity, demoRecordChatSale } from '../demo/mockApi';
import PhoneChat from '../demo/PhoneChat';

const KEY = 'fs_phone_open';
const wide = () => window.matchMedia('(min-width: 1280px)').matches;

// The WhatsApp assistant "phone" that lives on the side of the app. It answers from the store's real stock
// and settings. In Demo Mode, chats that end in an order also move the dashboard numbers.
export default function AssistantDock() {
  const demo = isDemo();
  const [open, setOpen] = useState(() => {
    try { const v = localStorage.getItem(KEY); return v === null ? wide() : v === '1'; } catch { return wide(); }
  });
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [stats, setStats] = useState({ replies: demo ? 23 : 0, leads: demo ? 9 : 0, orders: demo ? 4 : 0 });

  const toggle = (v) => {
    setOpen(v);
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* storage unavailable */ }
  };

  const refresh = useCallback(async () => {
    const [p, s] = await Promise.all([apiFetch('/api/products', { silent: true }), apiFetch('/api/settings', { silent: true })]);
    if (p.ok) setProducts(await p.json());
    if (s.ok) setSettings(await s.json());
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [open, refresh]);

  const onEvent = useCallback((ev) => {
    if (ev.type === 'reply') {
      setStats((s) => ({ ...s, replies: s.replies + 1 }));
      if (demo) demoAddActivity({ type: 'reply', title: 'Auto-reply sent', meta: `${ev.customer}: “${ev.preview.slice(0, 38)}”` });
    } else if (ev.type === 'lead') {
      setStats((s) => ({ ...s, leads: s.leads + 1 }));
      if (demo) demoAddActivity({ type: 'lead', title: ev.label, meta: 'WhatsApp assistant' });
    } else if (ev.type === 'sale') {
      setStats((s) => ({ ...s, orders: s.orders + 1 }));
      if (demo) {
        demoRecordChatSale(ev); // moves revenue, orders and stock on the dashboard
        demoAddActivity({ type: 'sale', title: ev.product, meta: `${ev.buyer} · WhatsApp`, amount: ev.amount });
      }
    }
  }, [demo]);

  const noBank = !settings.account_number;

  return (
    <>
      {!open && (
        <button onClick={() => toggle(true)} aria-label="Open the WhatsApp assistant"
          className="no-print fixed bottom-20 right-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-gold-500/50 bg-zinc-900 px-3 py-2 text-[12px] font-medium text-gold-400 shadow-lg hover:bg-zinc-800 md:bottom-5 md:right-5">
          <MessageCircle size={15} /> Assistant
        </button>
      )}

      {open && <div className="fixed inset-0 z-40 bg-black/60 xl:hidden" onClick={() => toggle(false)} />}

      {open && (
        <aside aria-label="WhatsApp assistant" className="no-print fixed inset-y-0 right-0 z-50 flex w-[340px] max-w-full flex-col overflow-y-auto border-l border-zinc-700 bg-zinc-950 xl:sticky xl:top-0 xl:z-auto xl:h-screen xl:shrink-0">
          <div className="flex items-center gap-2 border-b border-zinc-700 px-3 py-2.5">
            <MessageCircle size={16} className="text-gold-500" />
            <h2 className="panel-title">WhatsApp assistant</h2>
            <span className={`badge ml-auto ${demo ? 'badge-green' : 'badge-amber'}`}>{demo ? 'Owner away · replying' : 'Preview'}</span>
            <button onClick={() => toggle(false)} aria-label="Close assistant panel" className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><X size={16} /></button>
          </div>

          <div className="px-3 pt-3">
            <p className="mb-3 text-[12px] leading-snug text-zinc-400">
              {demo
                ? 'When customers message while you are away, the assistant replies instantly using your live stock and prices.'
                : 'Preview: this is how the assistant will answer customers using your real stock. It is not connected to WhatsApp yet.'}
            </p>
            <PhoneChat products={products} settings={settings} speed={speed} paused={paused} onEvent={onEvent} />
          </div>

          <div className="space-y-2.5 p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Auto-replies', stats.replies], ['Leads saved', stats.leads], ['Orders', stats.orders]].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-zinc-800 py-2"><div className="text-[15px] font-semibold">{v}</div><div className="text-[10px] text-zinc-400">{l}</div></div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-secondary !px-2.5 !py-1.5 text-xs" onClick={() => setPaused((p) => !p)}>
                {paused ? <Play size={13} /> : <Pause size={13} />} {paused ? 'Resume' : 'Pause'}
              </button>
              <div className="ml-auto flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5 text-[12px]">
                {[1, 2, 4].map((s) => (
                  <button key={s} onClick={() => setSpeed(s)} aria-pressed={speed === s}
                    className={`rounded-md px-2 py-0.5 ${speed === s ? 'bg-gold-500 text-[rgb(var(--on-accent))]' : 'text-zinc-400 hover:text-zinc-100'}`}>{s}×</button>
                ))}
              </div>
            </div>
            {!demo && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-[12px] text-zinc-300">
                {products.length === 0
                  ? <>Add products in <Link className="text-gold-400 underline" to="/inventory">Inventory</Link> and the assistant will answer with your real stock.</>
                  : noBank
                    ? <>Add your bank details in <Link className="text-gold-400 underline" to="/settings">Settings</Link> so it can send the account number when a customer is ready to pay.</>
                    : <>Connect WhatsApp in <Link className="text-gold-400 underline" to="/settings">Settings</Link> to start answering real customers.</>}
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
