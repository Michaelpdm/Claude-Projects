import { useNavigate } from 'react-router-dom';
import { TrendingDown, BarChart2, FileText, AlertCircle, MessageSquare, Settings, ChevronRight, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ownerItems = [
  { to: '/reports', icon: BarChart2, label: 'Reports & P&L', desc: 'Profit, best sellers, exports', color: 'bg-violet-50 text-violet-600' },
  { to: '/expenses', icon: TrendingDown, label: 'Expenses', desc: 'Rent, transport, stock costs', color: 'bg-red-50 text-red-500' },
  { to: '/debits', icon: AlertCircle, label: 'Debts', desc: 'Customers who owe money', color: 'bg-amber-50 text-amber-600' },
  { to: '/invoices', icon: FileText, label: 'Invoices', desc: 'Create and manage invoices', color: 'bg-blue-50 text-blue-600' },
  { to: '/messages', icon: MessageSquare, label: 'Messages', desc: 'WhatsApp message log', color: 'bg-emerald-50 text-emerald-600' },
  { to: '/settings', icon: Settings, label: 'Settings', desc: 'Store name, PIN, preferences', color: 'bg-gray-100 text-gray-600' },
];

const managerItems = [
  { to: '/reports', icon: BarChart2, label: 'Reports & Best Sellers', desc: 'Sales performance, top products', color: 'bg-violet-50 text-violet-600' },
];

export default function More() {
  const navigate = useNavigate();
  const { isOwner, isManager, isStaff, logout } = useAuth();

  const items = isOwner ? ownerItems : isManager ? managerItems : [];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-5">More</h1>
      <div className="space-y-2">
        {items.map(({ to, icon: Icon, label, desc, color }) => (
          <button key={to} onClick={() => navigate(to)}
            className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-4 shadow-sm hover:border-violet-200 transition-colors">
            <div className={`rounded-xl p-2.5 ${color}`}><Icon size={18} /></div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        ))}

        {/* Manager can switch down to Staff only */}
        {isManager && (
          <button onClick={logout}
            className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-4 shadow-sm hover:border-violet-200 transition-colors">
            <div className="rounded-xl p-2.5 bg-violet-50 text-violet-600">
              <User size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900 text-sm">Switch to Staff</p>
              <p className="text-xs text-gray-400">Sign out and log in as staff</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        )}

        {/* Sign out — all roles */}
        <button onClick={logout}
          className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-4 shadow-sm hover:border-red-100 transition-colors mt-2">
          <div className="rounded-xl p-2.5 bg-red-50 text-red-500"><LogOut size={18} /></div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900 text-sm">Sign Out</p>
            <p className="text-xs text-gray-400">Return to role selection</p>
          </div>
          <ChevronRight size={16} className="text-gray-300" />
        </button>
      </div>
    </div>
  );
}
