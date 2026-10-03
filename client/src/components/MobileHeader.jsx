import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Menu } from 'lucide-react';

const PAGE_TITLES = {
  '/home':      'Home',
  '/inventory': 'Inventory',
  '/sales':     'Sales',
  '/customers': 'Customers',
  '/reports':   'Reports',
  '/expenses':  'Expenses',
  '/invoices':  'Invoices',
  '/debits':    'Debts',
  '/messages':  'Messages',
  '/settings':  'Settings',
};

const ROOT_PAGES = ['/home', '/sales', '/inventory', '/customers', '/reports', '/expenses', '/invoices', '/debits', '/messages', '/settings'];

export default function MobileHeader({ onMenuClick }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const title = PAGE_TITLES[pathname] || '';
  const isRoot = ROOT_PAGES.includes(pathname);

  return (
    <header className="sticky top-0 z-30 bg-[#0d0d12] border-b border-zinc-800 flex items-center h-13 px-2" style={{ height: '52px' }}>
      <div className="w-10 flex items-center justify-start">
        {isRoot ? (
          <button
            onClick={onMenuClick}
            className="p-1.5 rounded-xl text-zinc-400 active:bg-zinc-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl text-zinc-400 active:bg-zinc-800 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={22} />
          </button>
        )}
      </div>
      <p className="flex-1 text-center text-sm font-semibold text-zinc-50">{title}</p>
      <div className="w-10" />
    </header>
  );
}
