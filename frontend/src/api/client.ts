import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

type TokenBundle = {
  accessToken: string | null;
  refreshToken: string | null;
};

let inMemoryTokens: TokenBundle = {
  accessToken: null,
  refreshToken: null,
};

const STORAGE_KEY = 'rz_auth_tokens';

function loadTokens(): TokenBundle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed?.accessToken ?? null,
      refreshToken: parsed?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function saveTokens(tokens: TokenBundle | null) {
  if (!tokens || (!tokens.accessToken && !tokens.refreshToken)) {
    localStorage.removeItem(STORAGE_KEY);
    inMemoryTokens = { accessToken: null, refreshToken: null };
    return;
  }
  inMemoryTokens = tokens;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

// initialize tokens from storage
inMemoryTokens = loadTokens();

// Clear tokens on startup for debugging
console.log('🔐 Initial tokens loaded:', {
  hasAccessToken: !!inMemoryTokens.accessToken,
  hasRefreshToken: !!inMemoryTokens.refreshToken,
  accessTokenLength: inMemoryTokens.accessToken?.length,
  refreshTokenLength: inMemoryTokens.refreshToken?.length
});

export const getAccessToken = () => inMemoryTokens.accessToken;
export const getRefreshToken = () => inMemoryTokens.refreshToken;
export const setTokens = (accessToken: string, refreshToken: string | null) => {
  saveTokens({ accessToken, refreshToken: refreshToken ?? inMemoryTokens.refreshToken });
};
export const clearTokens = () => saveTokens(null);

// Initialize tokens from storage
if (typeof window !== 'undefined') {
  inMemoryTokens = loadTokens();
}

// Configuração detalhada do cliente HTTP
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos de timeout
  headers: {
    // NÃO definir Content-Type globalmente - deixar axios definir baseado no tipo de dados
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true, // Importante para enviar cookies de sessão
  validateStatus: (status) => status >= 200 && status < 500, // Considera 4xx como resposta, não como erro
});

// Interceptor de requisição para adicionar token de autorização e logs
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  
  // Log da requisição
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
    data: config.data,
    hasToken: !!token,
    withCredentials: config.withCredentials,
    contentType: config.headers?.['Content-Type']
  });
  
  // Adiciona o token de autorização se existir
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Para requisições que não são FormData, definir Content-Type como JSON
  if (config.data && !(config.data instanceof FormData) && !config.headers?.['Content-Type']) {
    config.headers = config.headers || {};
    config.headers['Content-Type'] = 'application/json';
  }
  
  return config;
}, (error) => {
  console.error('[API] Request error:', error);
  return Promise.reject(error);
});

// Configuração do estado para controle de refresh de token
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

/**
 * Processa a fila de requisições aguardando renovação de token
 * @param error Erro ocorrido durante o refresh
 * @param token Novo token de acesso (se houver)
 */
const processQueue = (error: any, token: string | null = null) => {
  pendingQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  pendingQueue = [];
};

// Exporta a função para uso no interceptor
export const refreshTokenFlow = async (): Promise<string> => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingQueue.push({ resolve, reject });
    });
  }
  
  isRefreshing = true;
  
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('Nenhum token de refresh disponível');
    }

    console.log('[API] Refreshing access token...');
    
    const response = await axios.post(
      `${API_URL}/api/v1/auth/refresh`,
      { refreshToken },
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    const responseData = response.data?.data || response.data;
    const accessToken = responseData?.accessToken || responseData?.token;
    const newRefreshToken = responseData?.refreshToken;
    
    if (!accessToken) {
      throw new Error('Resposta de refresh inválida');
    }
    
    console.log('[API] Token refreshed successfully');
    
    // Atualiza os tokens
    setTokens(accessToken, newRefreshToken || refreshToken);
    
    // Processa a fila de requisições pendentes
    processQueue(null, accessToken);
    
    return accessToken;
  } catch (error) {
    console.error('[API] Failed to refresh token:', error);
    clearTokens();
    processQueue(error);
    
    // Redireciona para o login se estiver no navegador
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    
    throw new Error('Falha ao renovar a sessão. Por favor, faça login novamente.');
  } finally {
    isRefreshing = false;
  }
}

// Interceptor de resposta para tratamento de erros e renovação de token
api.interceptors.response.use(
  (response) => {
    // Log da resposta bem-sucedida
    console.log(`[API] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  async (error) => {
    // Se não houver resposta, rejeita com a mensagem de erro original
    if (!error.response) {
      console.error('[API] Network error:', error.message);
      return Promise.reject(new Error('Erro de conexão. Verifique sua internet e tente novamente.'));
    }
    
    const originalRequest = error.config;
    const status = error.response?.status;
    
    // Log do erro
    console.error('[API] Response error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status,
      data: error.response?.data,
      message: error.message
    });
    
    // Se for erro 401 (não autorizado)
    if (status === 401) {
      // Se for uma tentativa de login, retorna erro de credenciais
      if (originalRequest.url.includes('/auth/login')) {
        // Tenta extrair a mensagem de erro de diferentes formatos de resposta
        const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.message ||
                           error.response?.data?.error ||
                           'Credenciais inválidas. Verifique seu email e senha.';
        return Promise.reject(new Error(errorMessage));
      }
      
      // Se for uma tentativa de refresh, limpa os tokens e redireciona para o login
      if (originalRequest.url.includes('/auth/refresh')) {
        console.error('[API] Refresh token failed, clearing tokens');
        clearTokens();
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(new Error('Sessão expirada. Por favor, faça login novamente.'));
      }
      
      // Se não for uma tentativa de refresh e não tiver sido feito retry
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          console.log('[API] Attempting to refresh token...');
          
          // Usa a função refreshTokenFlow para renovar o token
          const accessToken = await refreshTokenFlow();
          
          // Repete a requisição original com o novo token
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
          
        } catch (refreshError: any) {
          console.error('[API] Token refresh failed:', refreshError);
          clearTokens();
          
          // Redireciona para o login se estiver no navegador
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          
          return Promise.reject(new Error('Sessão expirada. Por favor, faça login novamente.'));
        }
      }
    }
    
    // Para outros erros, retorna mensagem apropriada
    let errorMessage = 'Ocorreu um erro inesperado';
    
    if (status === 400) {
      errorMessage = error.response?.data?.error?.message || 'Requisição inválida';
    } else if (status === 403) {
      errorMessage = 'Acesso negado. Você não tem permissão para acessar este recurso.';
    } else if (status === 404) {
      errorMessage = 'Recurso não encontrado';
    } else if (status >= 500) {
      errorMessage = 'Erro no servidor. Tente novamente mais tarde.';
    } else if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return Promise.reject(new Error(errorMessage));
  }
);

export interface LoginResponse {
  success?: boolean;
  data?: {
    user?: any;
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn?: number;
      tokenType?: string;
    };
  };
  user?: any;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  requiresTwoFactor?: boolean;
  tempToken?: string;
  error?: {
    message: string;
    code?: string;
  };
  meta?: any;
}

export async function loginRequest(params: { 
  email: string; 
  password: string; 
  rememberMe?: boolean 
}): Promise<LoginResponse> {
  try {
    console.log('[Auth] Attempting login with email:', params.email);
    
    const response = await api.post('/api/v1/auth/login', {
      email: params.email,
      password: params.password,
      rememberMe: params.rememberMe
    });
    
    console.log('[Auth] Login response:', response.data);
    
    // Se a resposta for bem-sucedida mas não tiver dados, lança um erro
    if (!response.data) {
      throw new Error('Resposta vazia do servidor');
    }
    
    return response.data;
  } catch (error: any) {
    console.error('[Auth] Login error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Se o erro já tiver uma mensagem, apenas repassa
    if (error.message) {
      throw error;
    }
    
    // Se não, cria um erro com a mensagem do servidor ou uma mensagem padrão
    const errorMessage = error.response?.data?.error?.message || 
                        error.response?.data?.message ||
                        error.response?.data?.error ||
                        (error.response?.status === 401 
                          ? 'Não autorizado. Por favor, faça login novamente.' 
                          : 'Falha na autenticação. Verifique suas credenciais.');
    
    throw new Error(errorMessage);
  }
}

export async function complete2FA(params: { tempToken: string; code: string }) {
  const { data } = await api.post('/api/v1/auth/2fa/complete', params);
  return data;
}

export async function registerRequest(params: { 
  email: string; 
  password: string; 
  firstName: string; 
  lastName: string; 
  username?: string; 
  phone: string; 
}) {
  const { data } = await api.post('/api/v1/auth/register', params);
  return data;
}