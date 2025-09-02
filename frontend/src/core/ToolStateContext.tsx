import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { ToolStatus } from '../components/navigation/ToolStatusBadge';
import { useAuth } from './auth';

// Define el estado específico de la herramienta de ensamblaje
export interface EnsamblajeState {
  activeStep: number;
  uploadId: number | null;
  parseData: any;
  validationResults: any;
  validationSessionId: number | null;
  savedCategorization: any; // Estado validado y completado
  currentCategorization: any; // Estado temporal del drag-and-drop durante categorización
  hasCompletedValidation: boolean;
  hasChangesAfterValidation: boolean; // Indica si hay cambios después de validar
  hasTemporalChanges: boolean; // 🎯 UX: Cambios temporales sin guardar post-validación
  lastSessionId: string | null; // 🚨 CRÍTICO: Para detectar cambios de sesión
  error: string;
  isLoading: boolean;
}

// Define el estado específico de la herramienta de respuestas (placeholder)
export interface RespuestasState {
  // Será definido cuando implementemos la herramienta
  placeholder: boolean;
}

// Estado global de todas las herramientas
export interface ToolsState {
  currentTool: string | null;
  ensamblaje: EnsamblajeState | null;
  respuestas: RespuestasState | null;
}

// Acciones del context
type ToolsAction =
  | { type: 'SET_CURRENT_TOOL'; payload: string | null }
  | { type: 'SET_ENSAMBLAJE_STATE'; payload: Partial<EnsamblajeState> }
  | { type: 'RESET_ENSAMBLAJE_STATE' }
  | { type: 'SET_RESPUESTAS_STATE'; payload: Partial<RespuestasState> }
  | { type: 'RESET_RESPUESTAS_STATE' }
  | { type: 'RESET_ALL_TOOLS' }; // 🚨 CRÍTICO: Reset completo para logout

// Estado inicial
const initialState: ToolsState = {
  currentTool: null,
  ensamblaje: null,
  respuestas: null,
};

// Estado inicial específico para ensamblaje
const initialEnsamblajeState: EnsamblajeState = {
  activeStep: 0,
  uploadId: null,
  parseData: null,
  validationResults: null,
  validationSessionId: null,
  savedCategorization: null,
  currentCategorization: null, // Estado temporal para drag-and-drop
  hasCompletedValidation: false,
  hasChangesAfterValidation: false, // Nuevo campo para cambios post-validación
  hasTemporalChanges: false, // 🎯 UX: Sin cambios temporales inicialmente
  lastSessionId: null, // 🚨 CRÍTICO: Tracking de sesión
  error: '',
  isLoading: false,
};

// Reducer para manejar las acciones
const toolsReducer = (state: ToolsState, action: ToolsAction): ToolsState => {
  switch (action.type) {
    case 'SET_CURRENT_TOOL':
      return {
        ...state,
        currentTool: action.payload,
      };
    
    case 'SET_ENSAMBLAJE_STATE':
      return {
        ...state,
        ensamblaje: {
          ...(state.ensamblaje || initialEnsamblajeState),
          ...action.payload,
        },
      };
    
    case 'RESET_ENSAMBLAJE_STATE':
      return {
        ...state,
        ensamblaje: initialEnsamblajeState,
      };
    
    case 'SET_RESPUESTAS_STATE':
      return {
        ...state,
        respuestas: {
          ...(state.respuestas || { placeholder: true }),
          ...action.payload,
        },
      };
    
    case 'RESET_RESPUESTAS_STATE':
      return {
        ...state,
        respuestas: { placeholder: true },
      };
    
    case 'RESET_ALL_TOOLS':
      // 🚨 CRÍTICO: Reset completo - volver a estado inicial limpio
      console.log('🚨 SECURITY: All tool state reset to initial state');
      return initialState;
    
    default:
      return state;
  }
};

// Context
const ToolsContext = createContext<{
  state: ToolsState;
  dispatch: React.Dispatch<ToolsAction>;
  getToolStatus: (toolId: string) => ToolStatus;
} | undefined>(undefined);

// Provider component
interface ToolsProviderProps {
  children: ReactNode;
}

export const ToolsProvider: React.FC<ToolsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(toolsReducer, initialState);
  const { isAuthenticated, sessionId } = useAuth();

  // 🚨 CRÍTICO: Reset completo del estado al hacer logout
  useEffect(() => {
    if (!isAuthenticated) {
      console.warn('🚨 SECURITY: User logged out - clearing all tool state');
      dispatch({ type: 'RESET_ALL_TOOLS' });
    }
  }, [isAuthenticated]);

  // 🚨 CRÍTICO: Reset si cambia sessionId (nueva sesión con misma autenticación)
  useEffect(() => {
    // Si hay estado previo y sessionId cambió, limpiarlo
    if (sessionId && state.ensamblaje && 
        state.ensamblaje.lastSessionId && 
        state.ensamblaje.lastSessionId !== sessionId) {
      console.warn('🚨 SECURITY: SessionId changed - clearing all tool state');
      dispatch({ type: 'RESET_ALL_TOOLS' });
    }
    
    // Actualizar sessionId en el estado si es nueva sesión
    if (sessionId && isAuthenticated && (!state.ensamblaje || state.ensamblaje.lastSessionId !== sessionId)) {
      dispatch({ 
        type: 'SET_ENSAMBLAJE_STATE', 
        payload: { lastSessionId: sessionId }
      });
    }
  }, [sessionId, isAuthenticated, state.ensamblaje]);

  // Función para determinar el estado visual de cada herramienta
  const getToolStatus = (toolId: string): ToolStatus => {
    switch (toolId) {
      case 'ensamblaje':
        if (!state.ensamblaje) return 'empty';
        
        // 🎯 UX: Prioridad a cambios temporales post-validación
        if (state.ensamblaje.hasTemporalChanges) return 'temporal_changes';
        if (state.ensamblaje.hasCompletedValidation) return 'completed';
        if (state.ensamblaje.parseData || state.ensamblaje.uploadId) return 'in_progress';
        return 'empty';
      
      case 'respuestas':
        return 'construction'; // Placeholder - siempre en construcción
      
      default:
        return 'empty';
    }
  };

  return (
    <ToolsContext.Provider value={{ state, dispatch, getToolStatus }}>
      {children}
    </ToolsContext.Provider>
  );
};

// Hook personalizado para usar el context
export const useTools = () => {
  const context = useContext(ToolsContext);
  if (context === undefined) {
    throw new Error('useTools must be used within a ToolsProvider');
  }
  return context;
};

// Hooks específicos para cada herramienta
export const useEnsamblajeState = () => {
  const { state, dispatch } = useTools();
  
  const setEnsamblajeState = (newState: Partial<EnsamblajeState>) => {
    dispatch({ type: 'SET_ENSAMBLAJE_STATE', payload: newState });
  };
  
  const resetEnsamblajeState = () => {
    dispatch({ type: 'RESET_ENSAMBLAJE_STATE' });
  };
  
  return {
    ensamblajeState: state.ensamblaje || initialEnsamblajeState,
    setEnsamblajeState,
    resetEnsamblajeState,
  };
};

export const useRespuestasState = () => {
  const { state, dispatch } = useTools();
  
  const setRespuestasState = (newState: Partial<RespuestasState>) => {
    dispatch({ type: 'SET_RESPUESTAS_STATE', payload: newState });
  };
  
  const resetRespuestasState = () => {
    dispatch({ type: 'RESET_RESPUESTAS_STATE' });
  };
  
  return {
    respuestasState: state.respuestas || { placeholder: true },
    setRespuestasState,
    resetRespuestasState,
  };
};