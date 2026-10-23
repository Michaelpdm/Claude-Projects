import { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, Sparkles, UserPlus, ReceiptText } from 'lucide-react';
import { buildScripts, replyTo } from '../../shared/assistant';
import { rng } from './demoData';

// A phone that plays customers messaging the store while the owner is away. Each customer line is answered
// by the real assistant engine (shared/assistant.js) using the store's current stock and settings.
export default function PhoneChat({ products, settings, ready = true, speed = 1, paused = false, onEvent, seed = 7 }) {
  const [person, setPerson] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(null); // 'bot' | 'customer' | null
  const [notice, setNotice] = useState(null);
  const scroller = useRef(null);
  const live = useRef({});
  live.current = { products, settings, ready, speed, paused, onEvent };

  useEffect(() => {
    let alive = true;
    const sleep = async (ms) => {
      let rest = ms;
      while (alive && rest > 0) {
        await new Promise((r) => setTimeout(r, 100));
        if (!live.current.paused) rest -= 100 * live.current.speed;
      }
    };
    (async () => {
      let uid = 0;
      let round = 0;
      while (alive) {
        while (alive && !live.current.ready) await new Promise((r) => setTimeout(r, 150)); // wait for the stock to load
        // rebuilt every round so the conversations reflect the stock as it is right now
        const scripts = buildScripts(live.current.products, rng(seed + round * 13));
        for (const script of scripts) {
          if (!alive) return;
          let ctx = { name: script.person[0], returning: script.returning };
          setPerson(script.person);
          setMessages([]);
          setNotice({ name: script.person[0], text: script.lines[0] });
          await sleep(2000);
          setNotice(null);
          await sleep(300);
          for (const line of script.lines) {
            if (!alive) return;
            setTyping('customer');
            await sleep(900 + line.length * 12);
            setTyping(null);
            setMessages((m) => [...m, { id: ++uid, from: 'customer', text: line }]);
            await sleep(700);
            const { products: pr, settings: st } = live.current;
            const out = replyTo(line, { products: pr || [], settings: st || {}, ctx });
            ctx = out.ctx;
            for (const rep of out.replies) {
              if (!alive) return;
              setTyping('bot');
              await sleep(900 + (rep.text || '').length * 9);
              setTyping(null);
              setMessages((m) => [...m, { id: ++uid, from: 'bot', ...rep }]);
              live.current.onEvent?.({ type: 'reply', customer: script.person[0], preview: line });
              for (const chip of rep.chips || []) if (chip.event) live.current.onEvent?.(chip.event);
              await sleep(1100);
            }
            await sleep(700);
          }
          await sleep(3800);
        }
        round++;
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  return (
    <div className="mx-auto w-[292px] max-w-full">
      <div className="relative overflow-hidden rounded-[36px] border-[6px] border-zinc-700 bg-zinc-950 shadow-xl">
        <div className="absolute left-1/2 top-0 z-20 h-4 w-24 -translate-x-1/2 rounded-b-2xl bg-zinc-700" />
        <div className="flex items-center justify-between px-5 pb-1 pt-2 text-[10px] text-zinc-400">
          <span>9:41</span><span>5G ▮▮▮</span>
        </div>

        {/* incoming-message notification */}
        {notice && (
          <div className="anim-slide-in absolute inset-x-2 top-7 z-10 rounded-2xl border border-zinc-700 bg-zinc-900/95 p-2.5 shadow-lg backdrop-blur">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400"><span className="h-2 w-2 rounded-sm bg-gold-500" /> WhatsApp · now</div>
            <div className="mt-0.5 text-[12px] font-semibold text-zinc-100">{notice.name}</div>
            <div className="line-clamp-2 text-[11px] text-zinc-300">{notice.text}</div>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-900 px-3 py-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gold-500/20 text-xs font-semibold text-gold-400">{person?.[0]?.[0] || '·'}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-zinc-100">{person?.[0] || 'Waiting for a message…'}</div>
            <div className="text-[10px] text-zinc-500">{typing === 'customer' ? 'typing…' : person?.[1] || ''}</div>
          </div>
        </div>

        <div ref={scroller} className="h-[390px] space-y-2 overflow-y-auto bg-zinc-950 px-3 py-3">
          <div className="mx-auto w-fit rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">Today · store is closed</div>
          {messages.map((m) => <Message key={m.id} m={m} />)}
          {typing && (
            <div className={`anim-pop-in flex ${typing === 'bot' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-1 rounded-2xl px-3 py-2 ${typing === 'bot' ? 'bg-gold-500/25' : 'bg-zinc-800'}`}>
                {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-zinc-400" style={{ animation: `dot 1.1s ${i * 0.15}s infinite` }} />)}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-700 bg-zinc-900 px-3 py-2">
          <div className="flex-1 rounded-full bg-zinc-800 px-3 py-1.5 text-[11px] text-zinc-500">Message</div>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-gold-500"><Check size={14} style={{ color: 'rgb(var(--on-accent))' }} /></div>
        </div>
      </div>
    </div>
  );
}

function Message({ m }) {
  const bot = m.from === 'bot';
  return (
    <div className={`anim-pop-in flex flex-col gap-1 ${bot ? 'items-end' : 'items-start'}`}>
      {m.text && (
        <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2 text-[12px] leading-snug text-zinc-100 ${bot ? 'rounded-br-md bg-gold-500/20' : 'rounded-bl-md bg-zinc-800'}`}>
          {m.text}
          {bot && (
            <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-zinc-500">
              <Sparkles size={9} className="text-gold-400" /> Auto-reply <CheckCheck size={11} className="text-peri" />
            </div>
          )}
        </div>
      )}
      {m.card && (
        <div className="w-[88%] rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-[11px]">
          <div className="mb-1.5 font-semibold text-zinc-100">{m.card.title}</div>
          <div className="space-y-1">
            {m.card.rows.map(([k, v], i) => (
              <div key={`${k}${i}`} className="flex justify-between gap-2 text-zinc-300"><span className="text-zinc-400">{k}</span><span className="shrink-0 font-medium">{v}</span></div>
            ))}
          </div>
          {m.card.price && <div className="mt-1.5 border-t border-zinc-700 pt-1.5 font-semibold text-gold-400">{m.card.price}</div>}
        </div>
      )}
      {(m.chips || []).map((c) => (
        <span key={c.label} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.event?.type === 'sale' ? 'border-peri/40 bg-peri/10 text-peri' : 'border-gold-500/40 bg-gold-500/10 text-gold-400'}`}>
          {c.event?.type === 'sale' ? <ReceiptText size={10} /> : <UserPlus size={10} />} {c.label}
        </span>
      ))}
    </div>
  );
}
