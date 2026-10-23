import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const STYLE = {
  success: ['text-peri', CheckCircle2],
  error: ['text-coral', AlertCircle],
  info: ['text-gold-400', Info],
};

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let n = 0;
    const onToast = (e) => {
      const id = ++n;
      setItems((list) => [...list.slice(-3), { id, ...e.detail }]);
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), e.detail.type === 'error' ? 6000 : 2800);
    };
    window.addEventListener('fs-toast', onToast);
    return () => window.removeEventListener('fs-toast', onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6" aria-live="polite">
      {items.map((t) => {
        const [tone, Icon] = STYLE[t.type] || STYLE.info;
        return (
          <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto anim-slide-in flex max-w-sm items-start gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 shadow-lg">
            <Icon size={16} className={`mt-0.5 shrink-0 ${tone}`} />
            <span className="min-w-0 break-words">{t.message}</span>
            <button onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} aria-label="Dismiss" className="ml-1 text-zinc-500 hover:text-zinc-200"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
