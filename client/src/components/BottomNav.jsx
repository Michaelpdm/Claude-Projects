import { NavLink } from 'react-router-dom';
import {
  Package, ShoppingCart, FileText, AlertCircle,
  MessageSquare, Settings
} from 'lucide-react';

const navItems = [
  { to: '/inventory', icon: Package, label: 'Stock' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/invoices', icon: FileText, label: 'Invoice' },
  { to: '/debits', icon: AlertCircle, label: 'Debits' },
  { to: '/messages', icon: MessageSquare, label: 'Msgs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50 flex">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-violet-400' : 'text-gray-400'
            }`
          }
        >
          <Icon size={20} className="mb-0.5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
