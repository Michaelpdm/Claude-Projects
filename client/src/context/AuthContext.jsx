import { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken } from '../utils/api';
import { exitDemo } from '../demo/mockApi';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // A role is only trusted while a session token exists; the server re-checks both on every request.
  const [role, setRole] = useState(() => {
    try { return getToken() ? sessionStorage.getItem('app_role') || null : null; }
    catch { return null; }
  });

  const login = (newRole, token) => {
    setToken(token);
    setRole(newRole);
    try { sessionStorage.setItem('app_role', newRole); } catch { /* storage unavailable */ }
  };

  const logout = () => {
    exitDemo();
    setToken('');
    setRole(null);
    try { sessionStorage.removeItem('app_role'); } catch { /* storage unavailable */ }
  };

  // apiFetch fires this when the server says the session is no longer valid
  useEffect(() => {
    const onLogout = () => { setRole(null); try { sessionStorage.removeItem('app_role'); } catch { /* ignore */ } };
    window.addEventListener('fs-logout', onLogout);
    return () => window.removeEventListener('fs-logout', onLogout);
  }, []);

  return (
    <AuthContext.Provider value={{
      role,
      login,
      logout,
      isOwner: role === 'owner',
      isManager: role === 'manager',
      isStaff: role === 'staff',
      isManagerOrOwner: role === 'owner' || role === 'manager',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
