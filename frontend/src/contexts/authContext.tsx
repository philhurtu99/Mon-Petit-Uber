import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { API_URL } from "../config";
import type { User } from "../models";



interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const updateUser = (userData: User) => setUser(userData);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggedIn = !!user;

  useEffect(() => {
    fetch(`${API_URL}/api/auth/getSession`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);          
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setIsLoading(false);
  };

  const logout = () => {
    fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).then(() => setUser(null));
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isLoading, user, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
