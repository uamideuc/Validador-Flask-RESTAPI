import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { Visibility, VisibilityOff, RestartAlt, AutoAwesome } from '@mui/icons-material';

interface Variable {
  name: string;
  sampleValues: string[];
}

// Tipos específicos para cada componente
interface PreviewActionsProps {
  showPreview: boolean;
  onTogglePreview: () => void;
}

interface CategorizationActionsProps {
  uncategorizedVariables: Variable[];
  totalCategorized: number;
  onAutoCategorizationClick: () => void;
  onClearAllCategorization: () => void;
}

interface CategoryActionsProps extends PreviewActionsProps, CategorizationActionsProps {}

// Componente para el botón de preview
export const PreviewActions: React.FC<PreviewActionsProps> = ({
  showPreview,
  onTogglePreview
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
    </Box>
  );
};

// Componente para los botones de categorización
export const CategorizationActions: React.FC<CategorizationActionsProps> = ({
  uncategorizedVariables,
  totalCategorized,
  onAutoCategorizationClick,
  onClearAllCategorization
}) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
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

// Componente original para retrocompatibilidad
const CategoryActions: React.FC<CategoryActionsProps> = (props) => {
  return (
    <Box>
      <PreviewActions 
        showPreview={props.showPreview}
        onTogglePreview={props.onTogglePreview}
      />
      <CategorizationActions
        uncategorizedVariables={props.uncategorizedVariables}
        totalCategorized={props.totalCategorized}
        onAutoCategorizationClick={props.onAutoCategorizationClick}
        onClearAllCategorization={props.onClearAllCategorization}
      />
    </Box>
  );
};

export default CategoryActions;