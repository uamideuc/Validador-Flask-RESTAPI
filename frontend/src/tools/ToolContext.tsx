import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BaseTool, ToolStatus, ToolResult } from './types';
import { ToolRegistry } from './ToolRegistry';

interface ToolContextType {
  activeTool: BaseTool | null;
  toolStatus: ToolStatus;
  lastResult: ToolResult | null;
  
  createTool: (toolId: string, sessionId?: string) => Promise<boolean>;
  executeOperation: <T, R>(operationName: string, input: T) => Promise<ToolResult<R>>;
  clearTool: () => void;
}

const ToolContext = createContext<ToolContextType | undefined>(undefined);

interface ToolProviderProps {
  children: ReactNode;
}

export const ToolProvider: React.FC<ToolProviderProps> = ({ children }) => {
  const [activeTool, setActiveTool] = useState<BaseTool | null>(null);
  const [toolStatus, setToolStatus] = useState<ToolStatus>(ToolStatus.IDLE);
  const [lastResult, setLastResult] = useState<ToolResult | null>(null);

  const createTool = useCallback(async (toolId: string, sessionId?: string): Promise<boolean> => {
    try {
      const tool = ToolRegistry.createTool(toolId, sessionId);
      if (!tool) {
        console.error(`Tool with id '${toolId}' not found`);
        return false;
      }

      setActiveTool(tool);
      setToolStatus(tool.status);
      return true;
    } catch (error) {
      console.error('Error creating tool:', error);
      return false;
    }
  }, []);

  const executeOperation = useCallback(async <T, R>(
    operationName: string, 
    input: T
  ): Promise<ToolResult<R>> => {
    if (!activeTool) {
      const errorResult: ToolResult<R> = {
        success: false,
        error: 'No active tool available',
        status: ToolStatus.ERROR
      };
      setLastResult(errorResult);
      return errorResult;
    }

    try {
      setToolStatus(ToolStatus.PROCESSING);
      const result = await activeTool.executeOperation<T, R>(operationName, input);
      
      setToolStatus(result.status);
      setLastResult(result);
      
      return result;
    } catch (error) {
      const errorResult: ToolResult<R> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: ToolStatus.ERROR
      };
      
      setToolStatus(ToolStatus.ERROR);
      setLastResult(errorResult);
      
      return errorResult;
    }
  }, [activeTool]);

  const clearTool = useCallback(() => {
    setActiveTool(null);
    setToolStatus(ToolStatus.IDLE);
    setLastResult(null);
  }, []);

  const contextValue: ToolContextType = {
    activeTool,
    toolStatus,
    lastResult,
    createTool,
    executeOperation,
    clearTool
  };

  return (
    <ToolContext.Provider value={contextValue}>
      {children}
    </ToolContext.Provider>
  );
};

export const useTool = (): ToolContextType => {
  const context = useContext(ToolContext);
  if (!context) {
    throw new Error('useTool must be used within a ToolProvider');
  }
  return context;
};