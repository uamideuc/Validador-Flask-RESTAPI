import React from 'react';

export enum ToolStatus {
  IDLE = 'idle',
  LOADING = 'loading', 
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface ToolMetadata {
  name: string;
  description: string;
  version: string;
  category: string;
  features: string[];
  operations: Record<string, string>;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: ToolStatus;
}

export interface ToolOperation<TInput = any, TOutput = any> {
  name: string;
  description: string;
  execute: (input: TInput) => Promise<ToolResult<TOutput>>;
}

export interface BaseTool {
  id: string;
  metadata: ToolMetadata;
  status: ToolStatus;
  operations: Map<string, ToolOperation>;
  
  getOperation(operationName: string): ToolOperation | undefined;
  executeOperation<T, R>(operationName: string, input: T): Promise<ToolResult<R>>;
}

export interface ToolComponentProps {
  toolId: string;
  sessionId?: string;
  onStatusChange?: (status: ToolStatus) => void;
  onResult?: (result: ToolResult) => void;
}

export type ToolComponent = React.ComponentType<ToolComponentProps>;

export interface ToolRegistryEntry {
  id: string;
  metadata: ToolMetadata;
  component: ToolComponent;
  toolClass: new (id: string, sessionId?: string) => BaseTool;
}