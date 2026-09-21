import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => {
    try { return sessionStorage.getItem('app_role') || null; }
    catch { return null; }
  });

  const login = (newRole) => {
    setRole(newRole);
    try { sessionStorage.setItem('app_role', newRole); } catch {}
  };

  const logout = () => {
    setRole(null);
    try { sessionStorage.removeItem('app_role'); } catch {}
  };

  return (
    <AuthContext.Provider value={{ role, login, logout, isOwner: role === 'owner', isStaff: role === 'staff' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
