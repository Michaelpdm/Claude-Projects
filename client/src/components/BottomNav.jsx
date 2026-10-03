import { NavLink } from 'react-router-dom';
import { Home, Package, ShoppingCart, Users, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const fullNav = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/inventory', icon: Package, label: 'Stock' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
];

const staffNav = [
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/inventory', icon: Package, label: 'Stock' },
];

export default function BottomNav() {
  const { isStaff } = useAuth();
  const navItems = isStaff ? staffNav : fullNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 z-50 flex">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2.5 text-xs font-medium transition-colors ${
              isActive ? 'text-emerald-600' : 'text-zinc-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`rounded-xl p-1.5 mb-0.5 transition-colors ${isActive ? 'bg-emerald-50' : ''}`}>
                <Icon size={20} />
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

