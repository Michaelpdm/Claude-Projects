import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Delete, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../utils/api';

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
        // If no PINs are set at all, auto-login as owner
        if (!data.owner_pin && !data.staff_pin) {
          login('owner');
        }
      })
      .catch(() => {
        // API down or cold start — still allow access
        login('owner');
      });
  }, []);

  const handleRoleSelect = (role) => {
    const requiredPin = role === 'owner' ? settings?.owner_pin : settings?.staff_pin;
    if (!requiredPin) {
      login(role);
      return;
    }
    setSelectedRole(role);
    setPin('');
    setError('');
  };

  const handleKey = (digit) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) {
      setTimeout(() => checkPin(next), 150);
    }
  };

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setError('');
  };

  const checkPin = (entered) => {
    const requiredPin = selectedRole === 'owner' ? settings?.owner_pin : settings?.staff_pin;
    if (entered === requiredPin) {
      login(selectedRole);
    } else {
      setError('Wrong PIN. Try again.');
      setPin('');
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-violet-700 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-700 to-purple-900 flex flex-col items-center justify-center p-6">
      {/* Store name */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <ShieldCheck size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">{storeName}</h1>
        <p className="text-violet-200 text-sm mt-1">Staff Management System</p>
      </div>

      {!selectedRole ? (
        /* Role selection */
        <div className="w-full max-w-xs space-y-3">
          <p className="text-violet-200 text-center text-sm mb-5">Who is signing in?</p>

          <button
            onClick={() => handleRoleSelect('owner')}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} className="text-violet-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Owner</p>
              <p className="text-sm text-gray-400">Full access — reports, finances, settings</p>
            </div>
          </button>

          {settings.staff_pin ? (
            <button
              onClick={() => handleRoleSelect('staff')}
              className="w-full bg-white/15 border border-white/30 rounded-2xl p-5 flex items-center gap-4 active:scale-95 transition-transform backdrop-blur-sm"
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <User size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white">Staff</p>
                <p className="text-sm text-violet-200">Sales and stock management only</p>
              </div>
            </button>
          ) : (
            <button
              onClick={() => handleRoleSelect('staff')}
              className="w-full bg-white/15 border border-white/30 rounded-2xl p-5 flex items-center gap-4 active:scale-95 transition-transform backdrop-blur-sm"
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <User size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white">Staff</p>
                <p className="text-sm text-violet-200">Sales and stock management only</p>
              </div>
            </button>
          )}
        </div>
      ) : (
        /* PIN entry */
        <div className="w-full max-w-xs">
          <button
            onClick={() => setSelectedRole(null)}
            className="flex items-center gap-1.5 text-violet-200 text-sm mb-8"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="text-center mb-8">
            <div className={`w-12 h-12 ${selectedRole === 'owner' ? 'bg-white' : 'bg-white/20'} rounded-xl flex items-center justify-center mx-auto mb-3`}>
              {selectedRole === 'owner'
                ? <ShieldCheck size={24} className="text-violet-600" />
                : <User size={24} className="text-white" />}
            </div>
            <p className="text-white font-semibold text-lg capitalize">{selectedRole} PIN</p>
            {error && <p className="text-red-300 text-sm mt-1">{error}</p>}
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-4 mb-10">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  i < pin.length ? 'bg-white scale-110' : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button
                key={n}
                onClick={() => handleKey(String(n))}
                className="bg-white/15 border border-white/20 rounded-2xl h-16 text-white text-xl font-semibold active:bg-white/30 transition-colors"
              >
                {n}
              </button>
            ))}
            <div /> {/* empty */}
            <button
              onClick={() => handleKey('0')}
              className="bg-white/15 border border-white/20 rounded-2xl h-16 text-white text-xl font-semibold active:bg-white/30 transition-colors"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="bg-white/15 border border-white/20 rounded-2xl h-16 flex items-center justify-center active:bg-white/30 transition-colors"
            >
              <Delete size={20} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
