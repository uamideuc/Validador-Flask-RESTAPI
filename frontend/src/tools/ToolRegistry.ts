import { ToolRegistryEntry, BaseTool, ToolComponent } from './types';

class ToolRegistryImpl {
  private tools: Map<string, ToolRegistryEntry> = new Map();

  register(entry: ToolRegistryEntry): void {
    this.tools.set(entry.id, entry);
  }

  get(toolId: string): ToolRegistryEntry | undefined {
    return this.tools.get(toolId);
  }

  getAll(): ToolRegistryEntry[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): ToolRegistryEntry[] {
    return Array.from(this.tools.values()).filter(
      tool => tool.metadata.category === category
    );
  }

  createTool(toolId: string, sessionId?: string): BaseTool | undefined {
    const entry = this.get(toolId);
    if (!entry) return undefined;
    
    return new entry.toolClass(toolId, sessionId);
  }

  getComponent(toolId: string): ToolComponent | undefined {
    const entry = this.get(toolId);
    return entry?.component;
  }

  isRegistered(toolId: string): boolean {
    return this.tools.has(toolId);
  }
}

export const ToolRegistry = new ToolRegistryImpl();