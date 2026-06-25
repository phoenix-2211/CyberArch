import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "@/services/api";

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJWT(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));
  const [role, setRole] = useState<string | null>(localStorage.getItem("role"));

  const logout = useCallback(() => {
    localStorage.clear();
    setToken(null);
    setUsername(null);
    setRole(null);
    window.location.href = "/login";
  }, []);

const login = useCallback(async (user: string, password: string) => {
  const data = await api.login(user, password);
  const decoded = decodeJWT(data.access_token);
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("username", decoded?.username || user);
  localStorage.setItem("role", decoded?.role || "viewer");
  setToken(data.access_token);
  setUsername(decoded?.username || user);
  setRole(decoded?.role || "viewer");
  window.location.href = "/overview";
}, []);

  useEffect(() => {
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
        logout();
      }
    }
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        role,
        isAuthenticated: !!token,
        isAdmin: role === "admin",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
