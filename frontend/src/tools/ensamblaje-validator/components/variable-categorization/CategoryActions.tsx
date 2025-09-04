import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { Visibility, VisibilityOff, RestartAlt, AutoAwesome } from '@mui/icons-material';

interface Variable {
  name: string;
  sampleValues: string[];
}

interface CategoryActionsProps {
  showPreview: boolean;
  onTogglePreview: () => void;
  uncategorizedVariables: Variable[];
  totalCategorized: number;
  onAutoCategorizationClick: () => void;
  onClearAllCategorization: () => void;
}

const CategoryActions: React.FC<CategoryActionsProps> = ({
  showPreview,
  onTogglePreview,
  uncategorizedVariables,
  totalCategorized,
  onAutoCategorizationClick,
  onClearAllCategorization
}) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Tooltip title={showPreview ? "Ocultar preview de datos" : "Ver preview de datos para verificar columnas"}>
        <Button
          variant={showPreview ? "contained" : "outlined"}
          startIcon={showPreview ? <VisibilityOff /> : <Visibility />}
          onClick={onTogglePreview}
          sx={{ minWidth: 180 }}
        >
          {showPreview ? 'Ocultar Preview' : 'Ver Preview de Datos'}
        </Button>
      </Tooltip>
      
      <Tooltip title="Sugerir categorización automática basada en nombres comunes de columnas">
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AutoAwesome />}
          onClick={onAutoCategorizationClick}
          disabled={uncategorizedVariables.length === 0}
          sx={{ minWidth: 180 }}
        >
          Autocategorizar
        </Button>
      </Tooltip>
      
      <Tooltip title="Mover todas las variables categorizadas de vuelta a sin categorizar">
        <Button
          variant="outlined"
          color="warning"
          startIcon={<RestartAlt />}
          onClick={onClearAllCategorization}
          disabled={totalCategorized === 0}
          sx={{ minWidth: 180 }}
        >
          Limpiar Categorización
        </Button>
      </Tooltip>
    </Box>
  );
};

export default CategoryActions;