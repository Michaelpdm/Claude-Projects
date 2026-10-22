import { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, Sparkles, UserPlus, ReceiptText } from 'lucide-react';
import { SCENARIOS, STORE } from './demoData';

// A looping, scripted WhatsApp conversation: customer texts, the assistant
// types and replies automatically while the owner is away.
export default function PhoneChat({ speed = 1, paused = false, onEvent }) {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(null); // 'bot' | 'customer' | null
  const scroller = useRef(null);
  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  const onEventRef = useRef(onEvent);
  speedRef.current = speed;
  pausedRef.current = paused;
  onEventRef.current = onEvent;

  useEffect(() => {
    let alive = true;
    const sleep = async (ms) => {
      let left = ms;
      while (alive && left > 0) {
        await new Promise((r) => setTimeout(r, 100));
        if (!pausedRef.current) left -= 100 * speedRef.current;
      }
    };
    (async () => {
      let idx = 0;
      let uid = 0;
      while (alive) {
        const sc = SCENARIOS[idx % SCENARIOS.length];
        setScenario(sc);
        setMessages([]);
        await sleep(900);
        for (const step of sc.steps) {
          if (!alive) return;
          if (step.from === 'bot' || step.from === 'customer') {
            setTyping(step.from);
            await sleep(step.from === 'bot' ? 1300 : 1100);
            if (!alive) return;
            setTyping(null);
          } else {
            await sleep(700);
          }
          setMessages((m) => [...m, { ...step, id: ++uid }]);
          if (step.event) onEventRef.current?.(step.event);
          await sleep(step.from === 'customer' ? 900 : 1300);
        }
        await sleep(4200);
        idx++;
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  return (
    <div className="mx-auto w-[300px] max-w-full">
      <div className="rounded-[38px] border-[6px] border-zinc-700 bg-zinc-950 shadow-xl overflow-hidden relative">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-4 w-24 rounded-b-2xl bg-zinc-700 z-10" />
        {/* status bar */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[10px] text-zinc-400">
          <span>9:41</span>
          <span>5G ▮▮▮</span>
        </div>
        {/* chat header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-700">
          <div className="h-8 w-8 rounded-full bg-gold-500/20 text-gold-400 grid place-items-center text-xs font-semibold">
            {scenario.customer.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-zinc-100 truncate">{scenario.customer.name}</div>
            <div className="text-[10px] text-zinc-500">{typing === 'customer' ? 'typing…' : scenario.customer.phone}</div>
          </div>
        </div>

        {/* thread */}
        <div ref={scroller} className="h-[400px] overflow-y-auto px-3 py-3 space-y-2 bg-zinc-950">
          <div className="mx-auto w-fit rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
            Today · {STORE.name} is closed
          </div>
          {messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}
          {typing && (
            <div className={`flex ${typing === 'bot' ? 'justify-end' : 'justify-start'} anim-pop-in`}>
              <div className={`rounded-2xl px-3 py-2 flex gap-1 ${typing === 'bot' ? 'bg-gold-500/25' : 'bg-zinc-800'}`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                    style={{ animation: `dot 1.1s ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* input bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-t border-zinc-700">
          <div className="flex-1 rounded-full bg-zinc-800 px-3 py-1.5 text-[11px] text-zinc-500">Message</div>
          <div className="h-7 w-7 rounded-full bg-gold-500 grid place-items-center">
            <Check size={14} style={{ color: 'rgb(var(--on-accent))' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ m }) {
  if (m.from === 'sale') {
    return (
      <div className="flex justify-center anim-pop-in">
        <span className="inline-flex items-center gap-1 rounded-full border border-peri/40 bg-peri/10 px-2.5 py-1 text-[10px] font-medium text-peri">
          <ReceiptText size={11} /> {m.label}
        </span>
      </div>
    );
  }
  const bot = m.from === 'bot';
  return (
    <div className={`flex flex-col ${bot ? 'items-end' : 'items-start'} gap-1 anim-pop-in`}>
      {m.text && (
        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-snug whitespace-pre-line ${
          bot ? 'bg-gold-500/20 text-zinc-100 rounded-br-md' : 'bg-zinc-800 text-zinc-100 rounded-bl-md'}`}>
          {m.text}
          <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-zinc-500">
            {bot && <><Sparkles size={9} className="text-gold-400" /> Auto-reply</>}
            {bot && <CheckCheck size={11} className="text-peri" />}
          </div>
        </div>
      )}
      {m.card && (
        <div className="w-[85%] rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-[11px]">
          <div className="font-semibold text-zinc-100 mb-1.5">{m.card.title}</div>
          <div className="space-y-1">
            {m.card.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between text-zinc-300">
                <span className="text-zinc-400">{k}</span><span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          {m.card.price && <div className="mt-1.5 pt-1.5 border-t border-zinc-700 text-gold-400 font-semibold">{m.card.price}</div>}
        </div>
      )}
      {m.event?.type === 'lead' && (
        <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-[10px] font-medium text-gold-400">
          <UserPlus size={10} /> {m.event.label}
        </span>
      )}
    </div>
  );
}
