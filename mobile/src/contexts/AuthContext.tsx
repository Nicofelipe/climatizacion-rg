import { createContext } from 'react';

export interface AuthContextType {
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
});