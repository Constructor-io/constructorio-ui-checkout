import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, AuthUser } from "../lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  useLocalStorage?: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const KEY = "demo.authUser";

function readStored(useLocal: boolean): AuthUser | null {
  try {
    const storage = useLocal ? localStorage : sessionStorage;
    const raw = storage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeStored(useLocal: boolean, user: AuthUser | null) {
  try {
    const storage = useLocal ? localStorage : sessionStorage;
    if (user) storage.setItem(KEY, JSON.stringify(user));
    else storage.removeItem(KEY);
  } catch {}
}

export function AuthProvider({
  children,
  useLocalStorage = false,
}: {
  children: ReactNode;
  useLocalStorage?: boolean;
}) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    readStored(useLocalStorage),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUser(readStored(useLocalStorage));
  }, [useLocalStorage]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const { user: fresh } = await api.login(email, password);
        writeStored(useLocalStorage, fresh);
        setUser(fresh);
        return fresh;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Login failed";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [useLocalStorage],
  );

  const logout = useCallback(() => {
    writeStored(useLocalStorage, null);
    setUser(null);
  }, [useLocalStorage]);

  const value = useMemo(
    () => ({ user, isLoading, error, login, logout, useLocalStorage }),
    [user, isLoading, error, login, logout, useLocalStorage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
