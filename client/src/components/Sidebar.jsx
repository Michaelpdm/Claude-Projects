import { NavLink, useLocation } from 'react-router-dom';
import {
  Package, ShoppingCart, FileText, AlertCircle,
  MessageSquare, Settings, Shirt
} from 'lucide-react';

const navItems = [
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/debits', icon: AlertCircle, label: 'Debits' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="bg-violet-600 rounded-lg p-1.5">
          <Shirt size={20} />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">Clothing Store</p>
          <p className="text-gray-400 text-xs">Manager</p>
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

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">© 2026 Clothing Store</p>
      </div>
    </aside>
  );
}
