import { useState, useEffect } from 'react';
import { Save, Wifi, WifiOff, RefreshCw, LogOut, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Settings() {
  const [settings, setSettings] = useState({ owner_available: 'true', store_name: '', store_phone: '', owner_pin: '', staff_pin: '' });
  const [pinInputs, setPinInputs] = useState({ owner_pin: '', staff_pin: '' });
  const [showPins, setShowPins] = useState({ owner_pin: false, staff_pin: false });
  const [pinSaving, setPinSaving] = useState('');
  const [waStatus, setWaStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [saving, setSaving] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  const loadSettings = async () => {
    const data = await apiFetch('/api/settings').then(r => r.json());
    setSettings(data);
    setPinInputs({ owner_pin: data.owner_pin || '', staff_pin: data.staff_pin || '' });
  };

  const loadWaStatus = async () => {
    const data = await apiFetch('/api/whatsapp/status').then(r => r.json());
    setWaStatus(data.status);
  };

  const loadQr = async () => {
    setQrLoading(true);
    const data = await apiFetch('/api/whatsapp/qr').then(r => r.json());
    setQrCode(data.qr);
    setWaStatus(data.status);
    setQrLoading(false);
  };

  useEffect(() => {
    loadSettings();
    loadWaStatus();
  }, []);

  // Poll for QR and connection status
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

  const savePin = async (key) => {
    const value = pinInputs[key];
    if (value && (value.length < 4 || !/^\d+$/.test(value))) {
      alert('PIN must be 4 digits (numbers only), or leave blank to disable.');
      return;
    }
    setPinSaving(key);
    await saveSetting(key, value);
    setPinSaving('');
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
    qr_pending: { label: 'Waiting for QR scanâ€¦', color: 'text-amber-600', bg: 'bg-amber-50', icon: RefreshCw },
    disconnected: { label: 'Disconnected', color: 'text-gray-500', bg: 'bg-gray-50', icon: WifiOff },
    error: { label: 'Error â€” restart server', color: 'text-red-600', bg: 'bg-red-50', icon: WifiOff },
  }[waStatus] || { label: waStatus, color: 'text-gray-500', bg: 'bg-gray-50', icon: WifiOff };

  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* PIN / Role Security */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} className="text-violet-500" />
          <h2 className="text-base font-semibold text-gray-900">Staff PIN Security</h2>
        </div>
        <p className="text-sm text-gray-500 -mt-3">
          Set a 4-digit PIN for each role. Staff will only see Sales and Stock. Leave blank to disable the login screen.
        </p>

        {[
          { key: 'owner_pin', label: 'Owner PIN', desc: 'Full access — reports, finances, settings' },
          { key: 'staff_pin', label: 'Staff PIN', desc: 'Sales and stock management only' },
        ].map(({ key, label, desc }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <p className="text-xs text-gray-400 mb-1.5">{desc}</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className="input pr-10 tracking-widest"
                  type={showPins[key] ? 'text' : 'password'}
                  maxLength={4}
                  placeholder="Enter 4-digit PIN"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinInputs[key]}
                  onChange={e => setPinInputs(p => ({ ...p, [key]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPins(p => ({ ...p, [key]: !p[key] }))}
                >
                  {showPins[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                className="btn-primary"
                disabled={pinSaving === key}
                onClick={() => savePin(key)}
              >
                {pinSaving === key ? 'Saving...' : <><Save size={14} /> Save</>}
              </button>
            </div>
            {settings[key] && <p className="text-xs text-emerald-600 mt-1">PIN is set</p>}
            {!settings[key] && <p className="text-xs text-gray-400 mt-1">No PIN — this role can log in without one</p>}
          </div>
        ))}
      </div>

      {/* Owner Availability */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Owner Availability</h2>
        <p className="text-sm text-gray-500 mb-4">
          When set to Away, incoming WhatsApp messages will receive an automatic reply listing your in-stock products.
        </p>
        <button
          onClick={toggleOwner}
          className={`relative inline-flex w-full items-center justify-between p-4 rounded-xl border-2 transition-all ${
            isAvailable
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-amber-400 bg-amber-50'
          }`}
        >
          <div className="text-left">
            <p className={`font-semibold text-lg ${isAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isAvailable ? 'ðŸŸ¢ Owner Available' : 'ðŸŸ¡ Owner Away'}
            </p>
            <p className={`text-sm mt-0.5 ${isAvailable ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isAvailable
                ? 'Auto-responder is OFF â€” you are handling messages directly.'
                : 'Auto-responder is ON â€” customers will receive product listings automatically.'}
            </p>
          </div>
          <div className={`w-14 h-8 rounded-full transition-colors ml-4 flex-shrink-0 ${isAvailable ? 'bg-emerald-500' : 'bg-amber-400'}`}>
            <div className={`w-6 h-6 bg-white rounded-full mt-1 transition-transform shadow ${isAvailable ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
        </button>
      </div>

      {/* Store Info */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Store Information</h2>
        <div>
          <label className="label">Store Name</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={settings.store_name || ''}
              onChange={e => setSettings(s => ({ ...s, store_name: e.target.value }))}
            />
            <button
              className="btn-primary"
              disabled={saving === 'store_name'}
              onClick={() => saveSetting('store_name', settings.store_name)}
            >
              {saving === 'store_name' ? 'Savingâ€¦' : <><Save size={14} /> Save</>}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Store Phone</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="+234..."
              value={settings.store_phone || ''}
              onChange={e => setSettings(s => ({ ...s, store_phone: e.target.value }))}
            />
            <button
              className="btn-primary"
              disabled={saving === 'store_phone'}
              onClick={() => saveSetting('store_phone', settings.store_phone)}
            >
              {saving === 'store_phone' ? 'Savingâ€¦' : <><Save size={14} /> Save</>}
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Integration */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-1">WhatsApp Integration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Scan the QR code with WhatsApp on your phone (Linked Devices â†’ Link a Device) to connect the auto-responder.
        </p>

        {/* Status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${statusInfo.bg}`}>
          <StatusIcon size={16} className={statusInfo.color} />
          <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>

        {/* QR Code */}
        {waStatus === 'qr_pending' && (
          <div className="mb-4">
            {qrLoading ? (
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-400">Generating QR codeâ€¦</p>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center gap-2">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 rounded-xl border border-gray-200" />
                <p className="text-xs text-gray-400">QR code expires after 60 seconds â€” refresh if needed</p>
                <button className="btn-secondary text-sm" onClick={loadQr}><RefreshCw size={14} /> Refresh QR</button>
              </div>
            ) : (
              <button className="btn-secondary" onClick={loadQr}><RefreshCw size={14} /> Load QR Code</button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {waStatus === 'disconnected' || waStatus === 'error' ? (
            <button className="btn-primary" onClick={connectWa}>
              <Wifi size={14} /> Connect WhatsApp
            </button>
          ) : waStatus === 'qr_pending' ? (
            <button className="btn-secondary" onClick={loadQr}><RefreshCw size={14} /> Refresh QR</button>
          ) : (
            <button className="btn-danger" onClick={disconnectWa}>
              <LogOut size={14} /> Disconnect
            </button>
          )}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 font-medium mb-1">How it works:</p>
          <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            <li>Click "Connect WhatsApp" â€” a QR code will appear</li>
            <li>Open WhatsApp on your phone â†’ Settings â†’ Linked Devices â†’ Link a Device</li>
            <li>Scan the QR code</li>
            <li>Set your status to "Away" above to activate auto-replies</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

