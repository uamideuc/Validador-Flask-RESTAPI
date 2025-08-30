from typing import Optional
from .base_toolkit import BaseToolKit, ToolResult
from .tool_registry import ToolRegistry

class ToolFactory:
    @staticmethod
    def create_tool(tool_name: str, session_id: str) -> Optional[BaseToolKit]:
        return ToolRegistry.get_toolkit(tool_name, session_id)
    
    @staticmethod
    def execute_tool_operation(
        tool_name: str, 
        session_id: str, 
        operation: str, 
        data: dict
    ) -> ToolResult:
        try:
            toolkit = ToolFactory.create_tool(tool_name, session_id)
            if not toolkit:
                return ToolResult(
                    success=False,
                    error=f"Tool '{tool_name}' not found or not available"
                )
            
            return toolkit.execute(operation, data)
        
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Error executing tool operation: {str(e)}"
            )
    
    @staticmethod
    def get_tool_metadata(tool_name: str) -> Optional[dict]:
        try:
            toolkit = ToolRegistry.get_toolkit(tool_name, "metadata_fetch")
            return toolkit.get_metadata() if toolkit else None
        except:
            return None