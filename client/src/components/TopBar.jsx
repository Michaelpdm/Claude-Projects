import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, MessageCircle, Moon, Sun } from 'lucide-react';
import AssistantShowcase from './AssistantShowcase';
import { useAuth } from '../context/AuthContext';
import { isDemo } from '../demo/mockApi';

export default function TopBar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const demo = isDemo();
  const [params, setParams] = useSearchParams();
  const [showcase, setShowcase] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');

  // ?assistant=1 (used by the landing-page button) opens the showcase straight away
  useEffect(() => {
    if (params.get('assistant')) {
      setShowcase(true);
      params.delete('assistant');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('fs_theme', next); } catch { /* storage unavailable */ }
  };

  return (
    <div className="no-print flex h-10 shrink-0 items-center gap-2 border-b border-zinc-700 bg-zinc-950 px-3 text-[12px]">
      {demo ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-2.5 py-0.5 font-medium text-gold-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" /> Demo mode
          </span>
          <span className="hidden text-zinc-400 sm:inline">Made-up data · nothing is saved</span>
          <button onClick={() => { logout(); navigate('/'); }} className="ml-1 inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-medium text-zinc-200 hover:bg-zinc-800">
            <LogOut size={12} /> Exit demo
          </button>
        </>
      ) : <span className="text-zinc-500">The Fashion Store</span>}
      <button onClick={() => setShowcase(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-gold-500 px-2.5 py-1 font-semibold hover:bg-gold-400" style={{ color: 'rgb(var(--on-accent))' }}>
        <MessageCircle size={13} /> <span className="hidden sm:inline">Show WhatsApp assistant</span><span className="sm:hidden">Assistant</span>
      </button>
      <button onClick={toggle} aria-label="Switch between dark and light mode" className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      {showcase && <AssistantShowcase onClose={() => setShowcase(false)} />}
    </div>
  );
}
