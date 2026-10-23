import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isDemo } from '../demo/mockApi';

export default function TopBar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const demo = isDemo();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');

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
      <button onClick={toggle} aria-label="Switch between dark and light mode" className="ml-auto grid h-7 w-7 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </div>
  );
}
