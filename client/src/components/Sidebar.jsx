import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Package, ShoppingCart, FileText, AlertCircle,
  MessageSquare, Settings, Shirt, Home, Users,
  BarChart2, TrendingDown, LogOut, TrendingUp, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

const ownerNav = [
  { to: '/home',      icon: Home,          label: 'Home' },
  { to: '/inventory', icon: Package,        label: 'Inventory' },
  { to: '/sales',     icon: ShoppingCart,   label: 'Sales' },
  { to: '/customers', icon: Users,          label: 'Customers' },
  { to: '/reports',   icon: BarChart2,      label: 'Reports' },
  { to: '/expenses',  icon: TrendingDown,   label: 'Expenses' },
  { to: '/invoices',  icon: FileText,       label: 'Invoices' },
  { to: '/debits',    icon: AlertCircle,    label: 'Debts' },
  { to: '/messages',  icon: MessageSquare,  label: 'Messages' },
  { to: '/settings',  icon: Settings,       label: 'Settings' },
];

const managerNav = [
  { to: '/home',      icon: Home,         label: 'Home' },
  { to: '/inventory', icon: Package,       label: 'Inventory' },
  { to: '/sales',     icon: ShoppingCart,  label: 'Sales' },
  { to: '/customers', icon: Users,         label: 'Customers' },
  { to: '/reports',   icon: BarChart2,     label: 'Reports' },
];

const staffNav = [
  { to: '/inventory', icon: Package,      label: 'Inventory' },
  { to: '/sales',     icon: ShoppingCart, label: 'Sales' },
];

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function Sidebar({ onClose }) {
  const { role, logout, isOwner, isManager } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [overview, setOverview] = useState({ todayRevenue: 0, todaySales: 0, products: 0 });

  useEffect(() => {
    apiFetch('/api/settings').then(r => r.json())
      .then(d => setStoreName(d.store_name || 'My Store')).catch(() => {});

    Promise.all([
      apiFetch('/api/sales/summary').then(r => r.json()).catch(() => ({})),
      apiFetch('/api/products').then(r => r.json()).catch(() => []),
    ]).then(([sum, products]) => {
      setOverview({
        todayRevenue: sum.today?.total ?? 0,
        todaySales:   sum.today?.count ?? 0,
        products:     Array.isArray(products) ? products.length : 0,
      });
    });
  }, []);

  const navItems = isOwner ? ownerNav : isManager ? managerNav : staffNav;
  const roleLabel = isOwner ? 'Owner' : isManager ? 'Manager' : 'Staff';
  const roleColor = isOwner
    ? 'bg-emerald-900/60 text-emerald-400'
    : isManager
    ? 'bg-amber-900/60 text-amber-400'
    : 'bg-zinc-800 text-zinc-400';

  const handleLogout = () => { logout(); navigate('/'); };

  const handleNavClick = () => { if (onClose) onClose(); };

  return (
    <aside className="w-64 bg-[#0d0d12] text-white flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
        <div className="bg-emerald-600 rounded-xl p-2 flex-shrink-0">
          <Shirt size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm leading-tight truncate">{storeName || 'Loading…'}</p>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${roleColor}`}>
            {roleLabel}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Overview */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Overview</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-900 rounded-xl p-2.5 text-center">
            <TrendingUp size={13} className="text-emerald-500 mx-auto mb-1" />
            <p className="text-[11px] font-bold text-zinc-50 truncate leading-tight">{fmt(overview.todayRevenue)}</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">Today</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-2.5 text-center">
            <ShoppingCart size={13} className="text-amber-500 mx-auto mb-1" />
            <p className="text-[11px] font-bold text-zinc-50 leading-tight">{overview.todaySales}</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">Sales</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-2.5 text-center">
            <Package size={13} className="text-blue-400 mx-auto mb-1" />
            <p className="text-[11px] font-bold text-zinc-50 leading-tight">{overview.products}</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">Items</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-2">Menu</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-zinc-800 pt-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-all"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
