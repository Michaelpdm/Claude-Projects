import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PinLogin from './pages/PinLogin';
import Layout from './components/Layout';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import More from './pages/More';
import Invoices from './pages/Invoices';
import Debits from './pages/Debits';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import { Lock } from 'lucide-react';

function OwnerOnly({ children }) {
  const { isOwner } = useAuth();
  if (!isOwner) return <AccessDenied message="Only the owner can access this section." />;
  return children;
}

function ManagerOrOwner({ children }) {
  const { isManagerOrOwner } = useAuth();
  if (!isManagerOrOwner) return <AccessDenied message="This section requires Manager or Owner access." />;
  return children;
}

function AccessDenied({ message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
        <Lock size={28} className="text-emerald-400" />
      </div>
      <h2 className="text-lg font-bold text-zinc-100 mb-1">Access Restricted</h2>
      <p className="text-sm text-zinc-500 max-w-xs">{message}</p>
    </div>
  );
}

function AppRoutes() {
  const { role } = useAuth();

  if (!role) return <PinLogin />;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to={role === 'staff' ? '/sales' : '/home'} replace />} />
        <Route path="home" element={<ManagerOrOwner><Home /></ManagerOrOwner>} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales" element={<Sales />} />
        <Route path="customers" element={<ManagerOrOwner><Customers /></ManagerOrOwner>} />
        <Route path="expenses" element={<OwnerOnly><Expenses /></OwnerOnly>} />
        <Route path="reports" element={<ManagerOrOwner><Reports /></ManagerOrOwner>} />
        <Route path="more" element={<More />} />
        <Route path="invoices" element={<OwnerOnly><Invoices /></OwnerOnly>} />
        <Route path="debits" element={<OwnerOnly><Debits /></OwnerOnly>} />
        <Route path="messages" element={<OwnerOnly><Messages /></OwnerOnly>} />
        <Route path="settings" element={<OwnerOnly><Settings /></OwnerOnly>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

