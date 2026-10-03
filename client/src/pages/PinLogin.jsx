import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Briefcase, User, Delete, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../utils/api';

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
    const pinStatus = settings?.[roleDef.pinKey];
    if (!pinStatus) {
      login(roleKey);
      return;
    }
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
      });
      if (res.status === 429) {
        setError('Too many attempts. Wait 15 minutes.');
        setPin('');
        return;
      }
      const { ok } = await res.json();
      if (ok) {
        login(selectedRole);
      } else {
        setError('Wrong PIN. Try again.');
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
      <div className="min-h-screen bg-emerald-700 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-700 to-purple-900 flex flex-col items-center justify-center p-6">
      {/* Store name */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-zinc-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <ShieldCheck size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">{storeName}</h1>
        <p className="text-emerald-200 text-sm mt-1">Who is signing in?</p>
      </div>

      {!selectedRole ? (
        /* Role selection */
        <div className="w-full max-w-xs space-y-3">
          {ROLES.map(({ key, label, desc, icon: Icon, dark }) => (
            <button
              key={key}
              onClick={() => handleRoleSelect(key)}
              className={`w-full rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-transform ${
                dark
                  ? 'bg-zinc-900 shadow-lg'
                  : 'bg-zinc-900/15 border border-white/30 backdrop-blur-sm'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                dark ? 'bg-emerald-100' : 'bg-zinc-900/20'
              }`}>
                <Icon size={22} className={dark ? 'text-emerald-600' : 'text-white'} />
              </div>
              <div className="text-left">
                <p className={`font-bold ${dark ? 'text-zinc-50' : 'text-white'}`}>{label}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* PIN entry */
        <div className="w-full max-w-xs">
          <button
            onClick={() => setSelectedRole(null)}
            className="flex items-center gap-1.5 text-emerald-200 text-sm mb-8"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-zinc-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              {selectedRoleDef && <selectedRoleDef.icon size={24} className="text-white" />}
            </div>
            <p className="text-white font-semibold text-lg">{selectedRoleDef?.label} PIN</p>
            {error && <p className="text-red-300 text-sm mt-1">{error}</p>}
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-4 mb-10">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full transition-all ${
                i < pin.length ? 'bg-zinc-900 scale-110' : 'bg-zinc-900/30'
              }`} />
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button
                key={n}
                onClick={() => handleKey(String(n))}
                className="bg-zinc-900/15 border border-white/20 rounded-2xl h-16 text-white text-xl font-semibold active:bg-zinc-900/30 transition-colors"
              >
                {n}
              </button>
            ))}
            <div />
            <button
              onClick={() => handleKey('0')}
              className="bg-zinc-900/15 border border-white/20 rounded-2xl h-16 text-white text-xl font-semibold active:bg-zinc-900/30 transition-colors"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="bg-zinc-900/15 border border-white/20 rounded-2xl h-16 flex items-center justify-center active:bg-zinc-900/30 transition-colors"
            >
              <Delete size={20} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

