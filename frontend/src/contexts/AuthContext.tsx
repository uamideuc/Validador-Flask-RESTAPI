import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tipos para el contexto de autenticación
interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  sessionId: string | null;
  sessionInfo: SessionInfo | null;
}

interface SessionInfo {
  session_id: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
}

interface AuthContextType {
  // Estado
  isAuthenticated: boolean;
  accessToken: string | null;
  sessionId: string | null;
  sessionInfo: SessionInfo | null;
  isLoading: boolean;
  
  // Funciones
  login: (accessKey: string) => Promise<LoginResult>;
  logout: () => void;
  checkSession: () => Promise<boolean>;
}

interface LoginResult {
  success: boolean;
  error?: string;
  user_message?: string;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Props del proveedor
interface AuthProviderProps {
  children: ReactNode;
}

// Use relative URLs to work with Create React App proxy
const API_BASE = '/api';

// Proveedor del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    sessionId: null,
    sessionInfo: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // Cargar token desde localStorage al iniciar
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      const storedToken = localStorage.getItem('accessToken');
      const storedSessionId = localStorage.getItem('sessionId');
      
      if (storedToken && storedSessionId) {
        // Verificar si la sesión sigue activa
        const isValid = await validateStoredSession(storedToken);
        
        if (isValid) {
          setAuthState({
            isAuthenticated: true,
            accessToken: storedToken,
            sessionId: storedSessionId,
            sessionInfo: null // Se cargará cuando sea necesario
          });
        } else {
          // Limpiar tokens inválidos
          clearStoredAuth();
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Validar sesión almacenada
  const validateStoredSession = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/auth/session-info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAuthState(prevState => ({
            ...prevState,
            sessionInfo: data.session
          }));
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Error validando sesión almacenada:', error);
      return false;
    }
  };

  // Función de login
  const login = async (accessKey: string): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE}/auth/institutional-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ access_key: accessKey })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Login exitoso
        const { access_token, session_id } = data;
        
        // Almacenar tokens
        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('sessionId', session_id);
        
        // Actualizar estado
        setAuthState({
          isAuthenticated: true,
          accessToken: access_token,
          sessionId: session_id,
          sessionInfo: null
        });

        return { success: true };
      } else {
        // Login fallido
        return {
          success: false,
          error: data.error || 'Error desconocido',
          user_message: data.user_message || 'No se pudo iniciar sesión'
        };
      }
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: 'Error de conexión',
        user_message: 'No se pudo conectar al servidor. Verifique su conexión a internet.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Función de logout
  const logout = () => {
    // Llamar al endpoint de logout si hay token
    if (authState.accessToken) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        // Ignorar errores de logout (la sesión se limpia localmente de todos modos)
        console.warn('Error en logout del servidor:', error);
      });
    }
    
    clearStoredAuth();
  };

  // Limpiar autenticación almacenada
  const clearStoredAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('sessionId');
    setAuthState({
      isAuthenticated: false,
      accessToken: null,
      sessionId: null,
      sessionInfo: null
    });
  };

  // Verificar estado de la sesión
  const checkSession = async (): Promise<boolean> => {
    if (!authState.accessToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/session-info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAuthState(prevState => ({
            ...prevState,
            sessionInfo: data.session
          }));
          return true;
        }
      }

      // Sesión inválida
      clearStoredAuth();
      return false;
    } catch (error) {
      console.error('Error verificando sesión:', error);
      clearStoredAuth();
      return false;
    }
  };

  const contextValue: AuthContextType = {
    isAuthenticated: authState.isAuthenticated,
    accessToken: authState.accessToken,
    sessionId: authState.sessionId,
    sessionInfo: authState.sessionInfo,
    isLoading,
    login,
    logout,
    checkSession
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};