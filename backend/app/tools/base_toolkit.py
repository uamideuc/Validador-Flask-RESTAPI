from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

class ToolStatus(Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"

@dataclass
class ToolResult:
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    status: ToolStatus = ToolStatus.COMPLETED

class BaseToolKit(ABC):
    def __init__(self, tool_id: str, session_id: str):
        self.tool_id = tool_id
        self.session_id = session_id
        self.status = ToolStatus.IDLE
    
    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def execute(self, operation: str, data: Dict[str, Any]) -> ToolResult:
        pass
    
    @abstractmethod
    def get_available_operations(self) -> Dict[str, str]:
        pass
    
    def get_status(self) -> ToolStatus:
        return self.status
    
    def _set_status(self, status: ToolStatus):
        self.status = status