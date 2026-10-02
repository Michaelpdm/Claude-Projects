import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Package, ShoppingCart, FileText, AlertCircle,
  MessageSquare, Settings, Shirt, Home, Users,
  BarChart2, TrendingDown, LogOut, MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

const ownerNav = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/expenses', icon: TrendingDown, label: 'Expenses' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/debits', icon: AlertCircle, label: 'Debts' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const managerNav = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
];

const staffNav = [
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
];

export default function Sidebar() {
  const { role, logout, isOwner, isManager } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    apiFetch('/api/settings').then(r => r.json()).then(d => setStoreName(d.store_name || 'My Store')).catch(() => {});
  }, []);

  const navItems = isOwner ? ownerNav : isManager ? managerNav : staffNav;
  const roleLabel = isOwner ? 'Owner' : isManager ? 'Manager' : 'Staff';

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="bg-violet-600 rounded-lg p-1.5">
          <Shirt size={20} />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight truncate">{storeName}</p>
          <p className="text-gray-400 text-xs">{roleLabel}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 border-t border-gray-700 pt-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
