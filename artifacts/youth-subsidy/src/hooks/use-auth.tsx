import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe, User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [_, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(localStorage.getItem("jwt_token"));

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: ["auth", "me", token],
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("jwt_token");
      setToken(null);
      setLocation("/login");
    }
  }, [isError, setLocation]);

  const login = (newToken: string) => {
    localStorage.setItem("jwt_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("jwt_token");
    setToken(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
