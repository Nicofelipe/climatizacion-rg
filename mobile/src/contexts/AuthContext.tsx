import {
  createContext,
  PropsWithChildren,
  useState,
  useEffect,
  useRef,
} from 'react';
import {ActivityIndicator,AppState,View} from 'react-native';
import {loadSession,storeSession} from '@/utils/sessionStorage';

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
  const [restoring,setRestoring]=useState(true);
  const activeToken=useRef<string|null>(null);
  function applySession(session:{user:AuthUser;token:string}|null){activeToken.current=session?.token??null;setUser(session?.user??null);setToken(session?.token??null);void storeSession(session).catch(()=>{});}
  useEffect(()=>{let alive=true;void loadSession().then(session=>{if(alive&&session){activeToken.current=session.token;setUser(session.user);setToken(session.token);}}).finally(()=>{if(alive)setRestoring(false);});return()=>{alive=false;};},[]);
  useEffect(()=>{if(!token)return;let alive=true;const check=async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/me`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});if(alive&&activeToken.current===token&&response.status===401)applySession(null);}catch{/* Keep the saved session on a temporary network failure. */}finally{clearTimeout(timer);}};void check();const listener=AppState.addEventListener('change',state=>{if(state==='active')void check();});return()=>{alive=false;listener.remove();};},[token]);

  async function login(data: LoginRequest) {
    try {
      setIsLoading(true);

      const response = await AuthService.login(data);

      applySession(response);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    applySession(null);
  }
  async function loginWithGoogle(){
    try{setIsLoading(true);const response=await googleLogin();applySession(response);}
    finally{setIsLoading(false);}
  }

  if(restoring)return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator accessibilityLabel="Restaurando sesión" color="#0F8277"/></View>;
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        loginWithGoogle,
        replaceSession:session=>applySession(session),
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
