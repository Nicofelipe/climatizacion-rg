import {
  createContext,
  PropsWithChildren,
  useState,
} from 'react';

import { AuthService } from '@/services/AuthService';
import { loginWithGoogle as googleLogin } from '@/services/GoogleLoginService';
import {
  AuthUser,
  LoginRequest,
} from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (data: LoginRequest) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  replaceSession: (session:{user:AuthUser;token:string})=>void;
  logout: () => void;
}

export const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function login(data: LoginRequest) {
    try {
      setIsLoading(true);

      const response = await AuthService.login(data);

      setUser(response.user);
      setToken(response.token);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
  }
  async function loginWithGoogle(){
    try{setIsLoading(true);const response=await googleLogin();setUser(response.user);setToken(response.token);}
    finally{setIsLoading(false);}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        loginWithGoogle,
        replaceSession:session=>{setUser(session.user);setToken(session.token);},
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
