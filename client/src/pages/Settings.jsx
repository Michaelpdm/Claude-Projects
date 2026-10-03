import { useState, useEffect } from 'react';
import { Save, Wifi, WifiOff, RefreshCw, LogOut, ShieldCheck, Eye, EyeOff, Key, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Settings() {
  const [settings, setSettings] = useState({ owner_available: 'true', store_name: '', store_phone: '', owner_pin: '', staff_pin: '', currency: 'NGN' });
  const [saving, setSaving] = useState('');
  const [waStatus, setWaStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Change PIN state
  const [pinModal, setPinModal] = useState(null); // 'owner' | 'staff' | null
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const loadSettings = async () => {
    const data = await apiFetch('/api/settings').then(r => r.json());
    setSettings(data);
  };

  const loadWaStatus = async () => {
    try {
      const data = await apiFetch('/api/whatsapp/status').then(r => r.json());
      setWaStatus(data.status);
    } catch {}
  };

  const loadQr = async () => {
    setQrLoading(true);
    try {
      const data = await apiFetch('/api/whatsapp/qr').then(r => r.json());
      setQrCode(data.qr);
      setWaStatus(data.status);
    } catch {}
    setQrLoading(false);
  };

  useEffect(() => { loadSettings(); loadWaStatus(); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadWaStatus();
      if (waStatus === 'qr_pending') loadQr();
      if (waStatus === 'connected') setQrCode(null);
    }, 5000);
    return () => clearInterval(interval);
  }, [waStatus]);

  const saveSetting = async (key, value) => {
    setSaving(key);
    await apiFetch(`/api/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    setSaving('');
    loadSettings();
  };

  const openPinModal = (role) => {
    setPinModal(role);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    setShowNew(false);
    setShowConfirm(false);
  };

  const pinKeyFor = (role) => role === 'owner' ? 'owner_pin' : role === 'manager' ? 'manager_pin' : 'staff_pin';

  const savePin = async () => {
    if (!newPin) {
      setPinSaving(true);
      await saveSetting(pinKeyFor(pinModal), '');
      setPinSaving(false);
      setPinModal(null);
      return;
    }
    if (!/^\d{4}$/.test(newPin)) { setPinError('PIN must be exactly 4 digits.'); return; }
    if (newPin !== confirmPin) { setPinError('PINs do not match.'); return; }
    setPinSaving(true);
    await saveSetting(pinKeyFor(pinModal), newPin);
    setPinSaving(false);
    setPinModal(null);
  };

  const toggleOwner = async () => {
    const next = settings.owner_available === 'true' ? 'false' : 'true';
    await saveSetting('owner_available', next);
  };

  const connectWa = async () => {
    await apiFetch('/api/whatsapp/connect', { method: 'POST' });
    setQrLoading(true);
    setTimeout(loadQr, 3000);
  };

  const disconnectWa = async () => {
    if (!confirm('Disconnect WhatsApp? You will need to scan the QR code again.')) return;
    await apiFetch('/api/whatsapp/disconnect', { method: 'POST' });
    setWaStatus('disconnected');
    setQrCode(null);
  };

  const isAvailable = settings.owner_available === 'true';

  const statusInfo = {
    connected: { label: 'Connected', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Wifi },
    qr_pending: { label: 'Waiting for QR scan...', color: 'text-amber-600', bg: 'bg-amber-50', icon: RefreshCw },
    disconnected: { label: 'Disconnected', color: 'text-zinc-400', bg: 'bg-zinc-950', icon: WifiOff },
    error: { label: 'Error — restart server', color: 'text-red-600', bg: 'bg-red-50', icon: WifiOff },
  }[waStatus] || { label: waStatus, color: 'text-zinc-400', bg: 'bg-zinc-950', icon: WifiOff };

  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-50">Settings</h1>

      {/* ── HANDOVER TO CLIENT ── */}
      <div className="card border-2 border-emerald-100 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Key size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-50">Client Handover</h2>
            <p className="text-xs text-zinc-500">Set PINs before giving the app to a client</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {[
            { role: 'owner', label: 'Owner PIN', desc: 'Full access to everything', pinKey: 'owner_pin', style: 'btn-primary' },
            { role: 'manager', label: 'Manager PIN', desc: 'Sales, stock, customers & reports', pinKey: 'manager_pin', style: 'btn-secondary' },
            { role: 'staff', label: 'Staff PIN', desc: 'Sales and stock only', pinKey: 'staff_pin', style: 'btn-secondary' },
          ].map(({ role, label, desc, pinKey, style }) => (
            <div key={role} className="rounded-xl border border-zinc-800 p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-100">{label}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${settings[pinKey] ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-800 text-zinc-500'}`}>
                    {settings[pinKey] ? 'Set' : 'Not set'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
              <button onClick={() => openPinModal(role)} className={`${style} text-sm py-2 px-3 whitespace-nowrap flex-shrink-0`}>
                <Key size={13} /> {settings[pinKey] ? 'Change' : 'Set PIN'}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex gap-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Before handing over: set the Owner PIN to something only the client knows, update the store name, and clear any test data from the database.
          </p>
        </div>
      </div>

      {/* ── STORE INFORMATION ── */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-zinc-50">Store Information</h2>
        {[
          { key: 'store_name', label: 'Store Name', placeholder: 'My Clothing Store' },
          { key: 'store_phone', label: 'Store Phone', placeholder: '+234...' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={placeholder}
                value={settings[key] || ''}
                onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
              />
              <button
                className="btn-primary"
                disabled={saving === key}
                onClick={() => saveSetting(key, settings[key])}
              >
                {saving === key ? 'Saving...' : <><Save size={14} /> Save</>}
              </button>
            </div>
          </div>
        ))}

        <div>
          <label className="label">Currency</label>
          <div className="flex gap-2">
            <select
              className="input flex-1"
              value={settings.currency || 'NGN'}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
            >
              <option value="NGN">NGN — Nigerian Naira (₦)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="GBP">GBP — British Pound (£)</option>
              <option value="GHS">GHS — Ghanaian Cedi (₵)</option>
              <option value="KES">KES — Kenyan Shilling (KSh)</option>
              <option value="ZAR">ZAR — South African Rand (R)</option>
            </select>
            <button
              className="btn-primary"
              disabled={saving === 'currency'}
              onClick={() => saveSetting('currency', settings.currency)}
            >
              {saving === 'currency' ? 'Saving...' : <><Save size={14} /> Save</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── OWNER AVAILABILITY ── */}
      <div className="card">
        <h2 className="text-base font-semibold text-zinc-50 mb-1">Owner Availability</h2>
        <p className="text-sm text-zinc-400 mb-4">
          When set to Away, incoming WhatsApp messages will receive an automatic reply listing your in-stock products.
        </p>
        <button
          onClick={toggleOwner}
          className={`relative inline-flex w-full items-center justify-between p-4 rounded-xl border-2 transition-all ${
            isAvailable ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50'
          }`}
        >
          <div className="text-left">
            <p className={`font-semibold text-lg ${isAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isAvailable ? 'Owner Available' : 'Owner Away'}
            </p>
            <p className={`text-sm mt-0.5 ${isAvailable ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isAvailable ? 'Auto-responder is OFF — you are handling messages directly.' : 'Auto-responder is ON — customers will receive product listings automatically.'}
            </p>
          </div>
          <div className={`w-14 h-8 rounded-full transition-colors ml-4 flex-shrink-0 ${isAvailable ? 'bg-emerald-500' : 'bg-amber-400'}`}>
            <div className={`w-6 h-6 bg-zinc-900 rounded-full mt-1 transition-transform shadow ${isAvailable ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
        </button>
      </div>

      {/* ── WHATSAPP ── */}
      <div className="card">
        <h2 className="text-base font-semibold text-zinc-50 mb-1">WhatsApp Integration</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Connect WhatsApp to enable the auto-responder. Open WhatsApp → Linked Devices → Link a Device, then scan the QR code.
        </p>

        {/* Status pill */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 ${statusInfo.bg}`}>
          <StatusIcon size={18} className={statusInfo.color} />
          <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>

        {/* QR code area */}
        {waStatus === 'qr_pending' && (
          <div className="mb-5">
            {qrLoading ? (
              <div className="h-56 flex flex-col items-center justify-center bg-zinc-950 rounded-2xl gap-3">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-500">Generating QR code...</p>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-700 shadow-sm">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 rounded-lg" />
                </div>
                <p className="text-xs text-zinc-500 text-center">Scan with WhatsApp · expires after 60 seconds</p>
                <button className="btn-secondary w-full" onClick={loadQr}>
                  <RefreshCw size={15} /> Refresh QR Code
                </button>
              </div>
            ) : (
              <button className="btn-secondary w-full py-3" onClick={loadQr}>
                <RefreshCw size={15} /> Load QR Code
              </button>
            )}
          </div>
        )}

        {/* Action button */}
        <div>
          {waStatus === 'disconnected' || waStatus === 'error' ? (
            <button className="btn-primary w-full py-3 text-base" onClick={connectWa}>
              <Wifi size={16} /> Connect WhatsApp
            </button>
          ) : waStatus === 'qr_pending' ? null : (
            <button className="btn-danger w-full py-3 text-base" onClick={disconnectWa}>
              <LogOut size={16} /> Disconnect WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* ── CHANGE PIN MODAL ── */}
      {pinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-50">
                {pinModal === 'owner' ? 'Owner PIN' : pinModal === 'manager' ? 'Manager PIN' : 'Staff PIN'}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                {pinModal === 'owner' ? 'Full access — reports, finances, all settings' : pinModal === 'manager' ? 'Sales, stock, customers & reports' : 'Sales and stock access only'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">New PIN</label>
                <div className="relative">
                  <input
                    className="input pr-10 tracking-widest text-lg"
                    type={showNew ? 'text' : 'password'}
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="4 digits"
                    value={newPin}
                    onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
                    autoFocus
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    onClick={() => setShowNew(p => !p)}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm PIN</label>
                <div className="relative">
                  <input
                    className="input pr-10 tracking-widest text-lg"
                    type={showConfirm ? 'text' : 'password'}
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Repeat PIN"
                    value={confirmPin}
                    onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    onClick={() => setShowConfirm(p => !p)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {pinError && <p className="text-sm text-red-500">{pinError}</p>}
              <p className="text-xs text-zinc-500">Leave both fields empty to remove the PIN for this role.</p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button className="btn-secondary flex-1" onClick={() => setPinModal(null)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={pinSaving}
                onClick={savePin}
              >
                {pinSaving ? 'Saving...' : 'Save PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

