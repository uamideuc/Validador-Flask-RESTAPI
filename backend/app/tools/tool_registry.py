from typing import Dict, Type, Optional
from .base_toolkit import BaseToolKit

class ToolRegistry:
    _toolkits: Dict[str, Type[BaseToolKit]] = {}
    
    @classmethod
    def register_toolkit(cls, tool_name: str, toolkit_class: Type[BaseToolKit]):
        cls._toolkits[tool_name] = toolkit_class
    
    @classmethod
    def get_toolkit(cls, tool_name: str, session_id: str) -> Optional[BaseToolKit]:
        if tool_name not in cls._toolkits:
            return None
        
        toolkit_class = cls._toolkits[tool_name]
        return toolkit_class(tool_id=tool_name, session_id=session_id)
    
    @classmethod
    def get_available_tools(cls) -> Dict[str, Dict[str, str]]:
        tools = {}
        for tool_name, toolkit_class in cls._toolkits.items():
            dummy_instance = toolkit_class(tool_id=tool_name, session_id="dummy")
            tools[tool_name] = dummy_instance.get_metadata()
        return tools
    
    @classmethod
    def is_tool_available(cls, tool_name: str) -> bool:
        return tool_name in cls._toolkits