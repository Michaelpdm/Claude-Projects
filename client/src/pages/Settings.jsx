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

  const savePin = async () => {
    if (!newPin) {
      // Clearing the PIN
      setPinSaving(true);
      await saveSetting(pinModal === 'owner' ? 'owner_pin' : 'staff_pin', '');
      setPinSaving(false);
      setPinModal(null);
      return;
    }
    if (!/^\d{4}$/.test(newPin)) { setPinError('PIN must be exactly 4 digits.'); return; }
    if (newPin !== confirmPin) { setPinError('PINs do not match.'); return; }
    setPinSaving(true);
    await saveSetting(pinModal === 'owner' ? 'owner_pin' : 'staff_pin', newPin);
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
    disconnected: { label: 'Disconnected', color: 'text-gray-500', bg: 'bg-gray-50', icon: WifiOff },
    error: { label: 'Error — restart server', color: 'text-red-600', bg: 'bg-red-50', icon: WifiOff },
  }[waStatus] || { label: waStatus, color: 'text-gray-500', bg: 'bg-gray-50', icon: WifiOff };

  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* ── HANDOVER TO CLIENT ── */}
      <div className="card border-2 border-violet-100 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <Key size={16} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Client Handover</h2>
            <p className="text-xs text-gray-400">Set PINs before giving the app to a client</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Owner PIN */}
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">Owner PIN</p>
                <p className="text-xs text-gray-400">Full access to everything</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${settings.owner_pin ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                {settings.owner_pin ? 'Set' : 'Not set'}
              </span>
            </div>
            <button
              onClick={() => openPinModal('owner')}
              className="w-full btn-primary text-sm py-2"
            >
              <Key size={13} /> {settings.owner_pin ? 'Change PIN' : 'Set PIN'}
            </button>
          </div>

          {/* Staff PIN */}
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">Staff PIN</p>
                <p className="text-xs text-gray-400">Sales and stock only</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${settings.staff_pin ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                {settings.staff_pin ? 'Set' : 'Not set'}
              </span>
            </div>
            <button
              onClick={() => openPinModal('staff')}
              className="w-full btn-secondary text-sm py-2"
            >
              <Key size={13} /> {settings.staff_pin ? 'Change PIN' : 'Set PIN'}
            </button>
          </div>
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
        <h2 className="text-base font-semibold text-gray-900">Store Information</h2>
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
        <h2 className="text-base font-semibold text-gray-900 mb-1">Owner Availability</h2>
        <p className="text-sm text-gray-500 mb-4">
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
            <div className={`w-6 h-6 bg-white rounded-full mt-1 transition-transform shadow ${isAvailable ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
        </button>
      </div>

      {/* ── WHATSAPP ── */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-1">WhatsApp Integration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Scan the QR code with WhatsApp on your phone (Linked Devices → Link a Device) to connect the auto-responder.
        </p>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${statusInfo.bg}`}>
          <StatusIcon size={16} className={statusInfo.color} />
          <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
        {waStatus === 'qr_pending' && (
          <div className="mb-4">
            {qrLoading ? (
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-400">Generating QR code...</p>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center gap-2">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 rounded-xl border border-gray-200" />
                <p className="text-xs text-gray-400">QR code expires after 60 seconds — refresh if needed</p>
                <button className="btn-secondary text-sm" onClick={loadQr}><RefreshCw size={14} /> Refresh QR</button>
              </div>
            ) : (
              <button className="btn-secondary" onClick={loadQr}><RefreshCw size={14} /> Load QR Code</button>
            )}
          </div>
        )}
        <div className="flex gap-3">
          {waStatus === 'disconnected' || waStatus === 'error' ? (
            <button className="btn-primary" onClick={connectWa}><Wifi size={14} /> Connect WhatsApp</button>
          ) : waStatus === 'qr_pending' ? (
            <button className="btn-secondary" onClick={loadQr}><RefreshCw size={14} /> Refresh QR</button>
          ) : (
            <button className="btn-danger" onClick={disconnectWa}><LogOut size={14} /> Disconnect</button>
          )}
        </div>
      </div>

      {/* ── CHANGE PIN MODAL ── */}
      {pinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {pinModal === 'owner' ? 'Change Owner PIN' : 'Change Staff PIN'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {pinModal === 'owner' ? 'Full access — reports, finances, all settings' : 'Sales and stock access only'}
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
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowConfirm(p => !p)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {pinError && <p className="text-sm text-red-500">{pinError}</p>}
              <p className="text-xs text-gray-400">Leave both fields empty to remove the PIN for this role.</p>
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
