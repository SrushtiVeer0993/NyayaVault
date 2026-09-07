import { createContext, useContext, useEffect, useState } from 'react';
import { api, getAuthToken, setAuthToken } from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getAuthToken()));

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    api.getMe()
      .then(setUser)
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const response = await api.login(email, password);
    setAuthToken(response.access_token);
    setUser(response.user);
    return response;
  }

  async function signup(registrationData) {
    return api.signup(registrationData);
  }

  async function logout() {
    try {
      if (getAuthToken()) await api.logout();
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: Boolean(user), login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
