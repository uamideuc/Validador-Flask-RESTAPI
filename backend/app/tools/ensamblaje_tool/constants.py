"""
Constantes para el toolkit de ensamblaje
"""

# Constantes para manejo de instrumentos
SINGLE_INSTRUMENT_KEY = "default_instrument"
SINGLE_INSTRUMENT_DISPLAY = "Toda la base de datos"

def get_instrument_display_name(instrument_key: str) -> str:
    """Convierte clave técnica de instrumento a nombre amigable para el usuario"""
    if instrument_key == SINGLE_INSTRUMENT_KEY:
        return SINGLE_INSTRUMENT_DISPLAY
    return instrument_key