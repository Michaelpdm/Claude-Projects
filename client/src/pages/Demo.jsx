import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { enterDemo } from '../demo/mockApi';

// /demo: switches the real app into Demo Mode (made-up data, nothing saved) and opens the dashboard.
export default function Demo() {
  const { login } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    enterDemo();
    try { localStorage.setItem('fs_phone_open', '1'); } catch { /* storage unavailable */ } // always show the phone in the demo
    login('owner', 'demo-token');
    navigate('/home', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="grid min-h-screen place-items-center bg-zinc-950 text-sm text-zinc-400">Opening demo…</div>;
}
