import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const PAGE_TITLES = {
  '/home': 'Home',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/customers': 'Customers',
  '/more': 'More',
  '/reports': 'Reports',
  '/expenses': 'Expenses',
  '/invoices': 'Invoices',
  '/debits': 'Debts',
  '/messages': 'Messages',
  '/settings': 'Settings',
};

const ROOT_PAGES = ['/home', '/sales', '/inventory', '/customers', '/more'];

export default function MobileHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const title = PAGE_TITLES[pathname] || '';
  const isRoot = ROOT_PAGES.includes(pathname);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 flex items-center h-12 px-2">
      <div className="w-10 flex items-center justify-start">
        {!isRoot && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl text-gray-500 active:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={22} />
          </button>
        )}
      </div>
      <p className="flex-1 text-center text-sm font-semibold text-gray-900">{title}</p>
      <div className="w-10" />
    </header>
  );
}
