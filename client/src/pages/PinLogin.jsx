import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Briefcase, User, Delete, ArrowLeft } from 'lucide-react';
import { apiFetch, toast } from '../utils/api';

const ROLES = [
  {
    key: 'owner',
    label: 'Owner',
    desc: 'Full access — finances, reports, settings',
    icon: ShieldCheck,
    pinKey: 'owner_pin',
    dark: true,
  },
  {
    key: 'manager',
    label: 'Manager',
    desc: 'Sales, stock, customers & reports',
    icon: Briefcase,
    pinKey: 'manager_pin',
    dark: false,
  },
  {
    key: 'staff',
    label: 'Staff',
    desc: 'Sales and stock only',
    icon: User,
    pinKey: 'staff_pin',
    dark: false,
  },
];

export default function PinLogin() {
  const { login } = useAuth();
  const [settings, setSettings] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [storeName, setStoreName] = useState('The Fashion Store');

  useEffect(() => {
    apiFetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings(data);
        if (data.store_name) setStoreName(data.store_name);
      })
      .catch(() => setSettings({}));
  }, []);

  const handleRoleSelect = (roleKey) => {
    const roleDef = ROLES.find(r => r.key === roleKey);
    setSelectedRole(roleKey);
    setPin('');
    setError('');
  };

  const handleKey = (digit) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) setTimeout(() => checkPin(next), 150);
  };

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setError('');
  };

  const checkPin = async (entered) => {
    try {
      const res = await apiFetch('/api/settings/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ role: selectedRole, pin: entered }),
        silent: true,
      });
      if (res.status === 429) {
        setError('Too many attempts. Wait 15 minutes.');
        setPin('');
        return;
      }
      const data = await res.json();
      if (data.ok) {
        login(selectedRole, data.token);
        if (data.setup) toast('info', 'Welcome! Open Settings to set the Owner, Manager and Staff PINs.');
      } else {
        setError(data.error || 'Wrong PIN. Try again.');
        setPin('');
      }
    } catch {
      setError('Connection error. Try again.');
      setPin('');
    }
  };

  const selectedRoleDef = ROLES.find(r => r.key === selectedRole);

  if (!settings) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-5">
        <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
        <a href="/demo" className="btn-primary">Start demo</a>
      </div>
    );
  }

  const keyCls = 'bg-zinc-900 border border-zinc-700 rounded-xl h-14 text-zinc-100 text-xl font-semibold hover:bg-zinc-800 active:bg-zinc-700 transition-colors';

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl border border-zinc-700 bg-zinc-900 flex items-center justify-center mx-auto mb-4 text-lg font-bold text-gold-500">FS</div>
        <h1 className="text-xl font-semibold text-zinc-100">{storeName}</h1>
        <p className="text-zinc-400 text-sm mt-1">Who is signing in?</p>
      </div>

      {!selectedRole ? (
        <div className="w-full max-w-xs space-y-2.5">
          {ROLES.map(({ key, label, desc, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleRoleSelect(key)}
              className="w-full card !p-3.5 flex items-center gap-3.5 text-left hover:border-gold-500/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-gold-500" />
              </div>
              <div>
                <p className="font-semibold text-zinc-100">{label}</p>
                <p className="text-xs text-zinc-400">{desc}</p>
              </div>
            </button>
          ))}
          <a href="/demo" className="btn-primary w-full !py-3 mt-1">▶ Watch the demo</a>
          <a href="/demo?assistant=1" className="btn-secondary w-full !py-3">💬 See the WhatsApp assistant</a>
          <p className="text-center text-xs text-zinc-500">See the app with example data. Nothing is saved.</p>
        </div>
      ) : (
        <div className="w-full max-w-xs">
          <button onClick={() => setSelectedRole(null)} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 text-sm mb-6">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="text-center mb-6">
            <div className="w-11 h-11 rounded-xl bg-gold-500/10 flex items-center justify-center mx-auto mb-3">
              {selectedRoleDef && <selectedRoleDef.icon size={22} className="text-gold-500" />}
            </div>
            <p className="text-zinc-100 font-semibold text-lg">{selectedRoleDef?.label} PIN</p>
            <p role="alert" className="text-coral text-sm mt-1 min-h-[1.25rem]">{error}</p>
          </div>

          <div className="flex justify-center gap-4 mb-8" aria-label={`${pin.length} of 4 digits entered`}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all ${i < pin.length ? 'bg-gold-500 scale-110' : 'bg-zinc-700'}`} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} onClick={() => handleKey(String(n))} className={keyCls}>{n}</button>
            ))}
            <div />
            <button onClick={() => handleKey('0')} className={keyCls}>0</button>
            <button onClick={handleBackspace} aria-label="Delete last digit" className={`${keyCls} flex items-center justify-center`}>
              <Delete size={20} className="text-zinc-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
