import { BaseTool, ToolMetadata, ToolStatus, ToolOperation, ToolResult } from './types';

export abstract class BaseToolImpl implements BaseTool {
  public id: string;
  public abstract metadata: ToolMetadata;
  public status: ToolStatus = ToolStatus.IDLE;
  public operations: Map<string, ToolOperation> = new Map();

  constructor(id: string, public sessionId?: string) {
    this.id = id;
    this.initializeOperations();
  }

  protected abstract initializeOperations(): void;

  getOperation(operationName: string): ToolOperation | undefined {
    return this.operations.get(operationName);
  }

  async executeOperation<T, R>(operationName: string, input: T): Promise<ToolResult<R>> {
    const operation = this.getOperation(operationName);
    
    if (!operation) {
      return {
        success: false,
        error: `Operation '${operationName}' not found`,
        status: ToolStatus.ERROR
      };
    }

    try {
      this.status = ToolStatus.PROCESSING;
      const result = await operation.execute(input);
      this.status = result.status;
      return result;
    } catch (error) {
      this.status = ToolStatus.ERROR;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: ToolStatus.ERROR
      };
    }
  }

  protected setStatus(status: ToolStatus): void {
    this.status = status;
  }
}