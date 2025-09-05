# Tools Module - Plugin Architecture Core
# Factory for dispatching to appropriate ToolKit implementations

from .ensamblaje_tool import EnsamblajeToolKit

def get_toolkit(tool_name: str, session_id: str):
    """
    Fábrica simple para crear ToolKits específicos
    """
    if tool_name == 'ensamblaje':
        return EnsamblajeToolKit(session_id)
    else:
        raise ValueError(f"ToolKit '{tool_name}' no encontrado")

def get_available_tools():
    """
    Lista de herramientas disponibles
    """
    return {
        'ensamblaje': {
            'name': 'Validador - Ensamblajes',
            'description': 'Herramienta para validación de bases de datos de ensamblaje'
        }
    }

__all__ = ['EnsamblajeToolKit', 'get_toolkit', 'get_available_tools']