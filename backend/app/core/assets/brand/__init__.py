"""
Brand assets and configuration for PDF reports and exports
"""
import os
from reportlab.lib.colors import HexColor

# Paths to brand assets
ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))
LOGO_CIRCLE_PATH = os.path.join(ASSETS_DIR, 'logo.jpg')
LOGO_HORIZONTAL_PATH = os.path.join(ASSETS_DIR, 'long.png')

# Brand colors (matching frontend CategoryDropZones.tsx)
BRAND_COLORS = {
    # Category colors
    'instrument_vars': HexColor('#1976D2'),      # Azul - Identificación de Instrumento
    'item_id_vars': HexColor('#388E3C'),         # Verde - Identificación de Ítems
    'metadata_vars': HexColor('#F57C00'),        # Naranja - Información Crítica
    'classification_vars': HexColor('#7B1FA2'),  # Púrpura - Información Complementaria

    # Status colors
    'success': HexColor('#388E3C'),              # Verde
    'warning': HexColor('#F57C00'),              # Naranja
    'error': HexColor('#D32F2F'),                # Rojo
    'info': HexColor('#1976D2'),                 # Azul

    # UI colors
    'primary': HexColor('#1976D2'),              # Azul principal
    'primary_dark': HexColor('#115293'),         # Azul oscuro
    'secondary': HexColor('#7B1FA2'),            # Púrpura
    'background': HexColor('#F5F5F5'),           # Gris claro
    'surface': HexColor('#FFFFFF'),              # Blanco
    'text_primary': HexColor('#212121'),         # Texto oscuro
    'text_secondary': HexColor('#757575'),       # Texto gris
    'divider': HexColor('#BDBDBD'),              # Divisor gris

    # Table colors
    'table_header': HexColor('#1976D2'),         # Azul
    'table_row_even': HexColor('#F5F5F5'),       # Gris claro
    'table_row_odd': HexColor('#FFFFFF'),        # Blanco
}

# Typography configuration
TYPOGRAPHY = {
    'font_family': 'Helvetica',
    'font_family_bold': 'Helvetica-Bold',
    'font_family_italic': 'Helvetica-Oblique',

    'size_title': 24,
    'size_h1': 18,
    'size_h2': 14,
    'size_h3': 12,
    'size_body': 11,
    'size_small': 9,
    'size_tiny': 8,
}

# Brand text
BRAND_NAME = "Centro UC Medición - MIDE"
BRAND_SUBTITLE = "Universidad Católica de Chile"
