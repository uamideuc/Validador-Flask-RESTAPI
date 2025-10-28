import React from 'react';
import { Box, Button, Tooltip, Chip } from '@mui/material';
import { Visibility, VisibilityOff, RestartAlt, AutoAwesome, History } from '@mui/icons-material';

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
  // 🎯 CONSERVACIÓN: Props para replicación de categorización
  hasUserCategorization?: boolean;
  userCategorizationMatchCount?: number;
  onUserReplicationClick?: () => void;
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
  onClearAllCategorization,
  hasUserCategorization = false,
  userCategorizationMatchCount = 0,
  onUserReplicationClick
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

      {/* 🎯 CONSERVACIÓN: Botón de replicación de categorización anterior */}
      {hasUserCategorization && userCategorizationMatchCount > 0 && onUserReplicationClick && (
        <Tooltip title="Aplicar la categorización que usaste anteriormente a las variables que coincidan">
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<History />}
            onClick={onUserReplicationClick}
            disabled={uncategorizedVariables.length === 0}
            sx={{
              minWidth: 180,
              borderColor: '#9c27b0',
              color: '#9c27b0',
              '&:hover': {
                borderColor: '#7b1fa2',
                backgroundColor: 'rgba(156, 39, 176, 0.04)'
              }
            }}
          >
            Replicar Anterior
            <Chip
              label={userCategorizationMatchCount}
              size="small"
              sx={{
                ml: 1,
                height: 20,
                backgroundColor: '#9c27b0',
                color: 'white',
                fontWeight: 600
              }}
            />
          </Button>
        </Tooltip>
      )}

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