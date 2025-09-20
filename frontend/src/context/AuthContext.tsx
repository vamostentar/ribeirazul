import { api, clearTokens, complete2FA, getAccessToken, loginRequest, registerRequest, setTokens } from '@/api/client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean; // NEW: Track if auth has been initialized
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  complete2FA: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  phone: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ 
    user: null, 
    loading: true,  // Start with loading=true
    initialized: false  // Not initialized yet
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize authentication state on app load
    async function initializeAuth() {
      console.log('🔐 AuthContext: Initializing authentication...');
      
      const token = getAccessToken();
      
      // If no token, set as initialized with no user
      if (!token) {
        console.log('🔐 AuthContext: No token found, user not authenticated');
        setState({ 
          user: null, 
          loading: false, 
          initialized: true 
        });
        return;
      }

      // If token exists, verify it with the server
      try {
        console.log('🔐 AuthContext: Token found, verifying with server...');
        setState(s => ({ ...s, loading: true }));
        
        const { data } = await api.get('/api/v1/users/me');
        const userData = data?.data ?? data ?? null;
        
        console.log('🔐 AuthContext: User verified successfully:', userData?.email);
        setState({ 
          user: userData, 
          loading: false, 
          initialized: true 
        });
        
      } catch (error) {
        console.warn('🔐 AuthContext: Failed to verify user:', error);
        
        // Only clear tokens on 401 (authentication error)
        if ((error as any)?.response?.status === 401) {
          console.log('🔐 AuthContext: Token invalid, clearing and redirecting to login');
          clearTokens();
          setState({ 
            user: null, 
            loading: false, 
            initialized: true 
          });
        } else {
          // For other errors (network, server), keep tokens but mark as unverified
          console.log('🔐 AuthContext: Network/server error, keeping tokens but setting user as null');
          setState({ 
            user: null, 
            loading: false, 
            initialized: true 
          });
        }
      }
    }
    
    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    setState(s => ({ ...s, loading: true, requiresTwoFactor: false, tempToken: undefined }));
    try {
      const response = await loginRequest({ email, password, rememberMe });

      // Se a autenticação em duas etapas for necessária
      if (response?.requiresTwoFactor && response?.tempToken) {
        setState({ 
          user: null, 
          loading: false, 
          initialized: true,
          requiresTwoFactor: true, 
          tempToken: response.tempToken 
        });
        return;
      }

      // Verifica se temos os tokens de acesso
      // Primeiro verifica se a resposta tem o formato padrão da API: { success: true, data: { user, tokens } }
      if (response.data && response.data.tokens) {
        const { tokens, user } = response.data;
        if (tokens.accessToken) {
          setTokens(tokens.accessToken, tokens.refreshToken || null);
          setState({ user: user || null, loading: false, initialized: true });
          navigate('/admin/dashboard');
          return;
        }
      }
      // Formato alternativo: { tokens: { accessToken, refreshToken }, user }
      else if ('tokens' in response && response.tokens) {
        const { tokens, user } = response as { tokens: { accessToken: string; refreshToken?: string }; user?: any };
        if (tokens.accessToken) {
          setTokens(tokens.accessToken, tokens.refreshToken || null);
          setState({ user: user || null, loading: false, initialized: true });
          navigate('/admin/dashboard');
          return;
        }
      }
      // Formato direto: { accessToken, refreshToken, user? }
      else if ('accessToken' in response) {
        const { accessToken, refreshToken, user } = response as { 
          accessToken: string; 
          refreshToken?: string; 
          user?: any 
        };
        if (accessToken) {
          setTokens(accessToken, refreshToken || null);
          setState({ user: user || null, loading: false, initialized: true });
          navigate('/admin/dashboard');
          return;
        }
      }
      
      // Se chegou até aqui, algo deu errado
      const error = new Error('Formato de resposta inesperado da API');
      console.error('Login error - unexpected response format:', response);
      throw error;
      
    } catch (e: any) {
      console.error('Login error:', e);
      setState(s => ({ ...s, loading: false, initialized: true }));
      
      // Se o erro já tiver uma mensagem, apenas repassa
      if (e.message) {
        throw e;
      }
      
      // Se não, cria um erro com uma mensagem genérica
      throw new Error('Falha na autenticação. Verifique suas credenciais.');
    }
  }, [navigate]);

  const register = useCallback(async (userData: RegisterData) => {
    setState(s => ({ ...s, loading: true }));
    try {
      await registerRequest(userData);
      
      // Registration successful - show success message
        setState({ user: null, loading: false, initialized: true });
      
      // You might want to show a success message or redirect to login
      // For now, we'll just reset the form
    } catch (e) {
        setState({ user: null, loading: false, initialized: true });
      throw e;
    }
  }, []);

  const doComplete2FA = useCallback(async (code: string) => {
    if (!state.tempToken) throw new Error('Missing temp token');
    setState(s => ({ ...s, loading: true }));
    try {
      const res = await complete2FA({ tempToken: state.tempToken, code });
      const payload = res?.data ?? res;
      const tokens = payload?.tokens ?? payload;
      if (tokens?.accessToken) setTokens(tokens.accessToken, tokens.refreshToken ?? null);
      const user = payload?.user ?? null;
      setState({ user, loading: false, initialized: true });
      // Redirect to admin dashboard after successful 2FA
      navigate('/admin/dashboard');
    } catch (e) {
      setState(s => ({ ...s, loading: false, initialized: true }));
      throw e;
    }
  }, [state.tempToken, navigate]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch (err) {
      // ignore network/logout errors during client-side logout, but log for debugging
      console.warn('Logout request failed:', err);
    }
    clearTokens();
    setState({ user: null, loading: false, initialized: true });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    register,
    complete2FA: doComplete2FA,
    logout,
  }), [state, login, register, doComplete2FA, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
