import React from 'react';
import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import { DragIndicator } from '@mui/icons-material';
import { useDrag } from 'react-dnd';

interface Variable {
  name: string;
  sampleValues: string[];
}

interface VariableSelectionPanelProps {
  uncategorizedVariables: Variable[];
  selectedVariables: Set<string>;
  onVariableSelect: (variableName: string) => void;
  onClearSelection: () => void;
}

const ItemType = 'VARIABLE';

interface DraggableVariableProps {
  variable: Variable;
  onRemove?: () => void;
  isDragging?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}

const DraggableVariable: React.FC<DraggableVariableProps> = ({ 
  variable, 
  onRemove, 
  isDragging, 
  onClick,
  isSelected 
}) => {
  const [{ isDragging: dragState }, drag] = useDrag({
    type: ItemType,
    item: { variable },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <Chip
      ref={drag}
      label={variable.name}
      onDelete={onRemove}
      onClick={onClick}
      icon={<DragIndicator />}
      sx={{
        m: 0.5,
        cursor: onClick ? 'pointer' : 'grab',
        opacity: dragState || isDragging ? 0.5 : 1,
        backgroundColor: isSelected ? '#e3f2fd' : undefined,
        borderColor: isSelected ? '#1976d2' : undefined,
        borderWidth: isSelected ? '2px' : '1px',
        '&:active': {
          cursor: 'grabbing',
        },
        '&:hover': {
          backgroundColor: isSelected ? '#bbdefb' : undefined,
        }
      }}
      variant="outlined"
      color={isSelected ? 'primary' : 'default'}
    />
  );
};

const VariableSelectionPanel: React.FC<VariableSelectionPanelProps> = ({
  uncategorizedVariables,
  selectedVariables,
  onVariableSelect,
  onClearSelection
}) => {
  if (uncategorizedVariables.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
          Columnas sin categorizar ({uncategorizedVariables.length})
          {selectedVariables.size > 0 && (
            <Chip 
              label={`${selectedVariables.size} seleccionadas`} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        {selectedVariables.size > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={onClearSelection}
          >
            Limpiar Selección
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        💡 Haz clic en las columnas para seleccionar múltiples antes de arrastrar
      </Typography>
      <Box>
        {uncategorizedVariables.map((variable, index) => (
          <DraggableVariable
            key={`uncategorized-${variable.name}-${index}`}
            variable={variable}
            onClick={() => onVariableSelect(variable.name)}
            isSelected={selectedVariables.has(variable.name)}
          />
        ))}
      </Box>
    </Paper>
  );
};

export default VariableSelectionPanel;