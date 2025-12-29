import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import { ExpandMore, DragIndicator, Category, Assignment, Info, Class, Tune } from '@mui/icons-material';
import { useDrag, useDrop } from 'react-dnd';

interface Variable {
  name: string;
  sampleValues: string[];
}

interface CategoryConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  examples: string[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'instrument_vars',
    title: '1. Identificación de Instrumento',
    description: 'Columnas que identifican y distinguen diferentes instrumentos (ej: instrumento, sector, forma, nivel)',
    icon: <Assignment />,
    color: '#1976d2',
    examples: ['instrumento', 'sector', 'forma', 'cuadernillo', 'nivel', 'grado']
  },
  {
    id: 'item_id_vars',
    title: '2. Identificación de Ítems',
    description: 'Columnas que identifican únicamente cada ítem dentro de un instrumento',
    icon: <Category />,
    color: '#388e3c',
    examples: ['id_item', 'item_id', 'numero_item', 'codigo_item']
  },
  {
    id: 'metadata_vars',
    title: '3. Información Crítica',
    description: 'Columnas con información técnica del ítem que DEBE estar siempre completa',
    icon: <Info />,
    color: '#f57c00',
    examples: ['invertido', 'ancla', 'clave', 'valores_validos', 'valores_invalidos']
  },
  {
    id: 'classification_vars',
    title: '4. Información Complementaria',
    description: 'Columnas que clasifican o describen el contenido del ítem (puede tener valores vacíos)',
    icon: <Class />,
    color: '#7b1fa2',
    examples: ['dimension', 'subdimension', 'enunciado', 'texto_pregunta', 'competencia']
  }
];

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

interface DropZoneProps {
  category: CategoryConfig;
  variables: Variable[];
  onDrop: (variable: Variable) => void;
  onRemove: (variable: Variable) => void;
  onOpenAdvancedOptions?: (categoryType: 'item_id_vars' | 'metadata_vars') => void;
  hasAdvancedOptions?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ category, variables, onDrop, onRemove, onOpenAdvancedOptions, hasAdvancedOptions }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemType,
    drop: (item: { variable: Variable }) => {
      onDrop(item.variable);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;

  return (
    <Paper
      ref={drop}
      elevation={isActive ? 8 : 2}
      sx={{
        p: 2,
        minHeight: 120,
        border: `2px dashed ${isActive ? category.color : '#ccc'}`,
        backgroundColor: isActive ? `${category.color}15` : '#fafafa',
        transition: 'all 0.3s ease',
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Box sx={{ color: category.color }}>{category.icon}</Box>
        <Typography variant="h6" sx={{ color: category.color }}>
          {category.title}
        </Typography>
        <Chip label={variables.length} size="small" />

        {/* Botón de opciones avanzadas (solo para item_id_vars y metadata_vars) */}
        {(category.id === 'item_id_vars' || category.id === 'metadata_vars') && onOpenAdvancedOptions && (
          <Tooltip title="Opciones avanzadas de validación">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAdvancedOptions(category.id as 'item_id_vars' | 'metadata_vars');
              }}
              disabled={variables.length === 0}
              sx={{ ml: 'auto' }}
            >
              {hasAdvancedOptions ? (
                <Badge color="primary" variant="dot">
                  <Tune fontSize="small" />
                </Badge>
              ) : (
                <Tune fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {category.description}
      </Typography>
      
      <Box sx={{ minHeight: 60 }}>
        {variables.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Arrastra columnas aquí...
          </Typography>
        ) : (
          variables.map((variable, index) => (
            <DraggableVariable
              key={`${category.id}-${variable.name}-${index}`}
              variable={variable}
              onRemove={() => onRemove(variable)}
            />
          ))
        )}
      </Box>
    </Paper>
  );
};

interface CategoryDropZonesProps {
  categorizedVariables: Record<string, Variable[]>;
  onDrop: (categoryId: string, variable: Variable) => void;
  onRemove: (categoryId: string, variable: Variable) => void;
  onOpenAdvancedOptions?: (categoryType: 'item_id_vars' | 'metadata_vars') => void;
  advancedOptionsConfigured?: { item_id_vars: boolean; metadata_vars: boolean };
}

const CategoryDropZones: React.FC<CategoryDropZonesProps> = ({
  categorizedVariables,
  onDrop,
  onRemove,
  onOpenAdvancedOptions,
  advancedOptionsConfigured
}) => {
  return (
    <Box>
      {/* Category drop zones */}
      <Grid container spacing={3}>
        {CATEGORIES.map((category) => (
          <Grid item xs={12} md={6} key={category.id}>
            <DropZone
              category={category}
              variables={categorizedVariables[category.id]}
              onDrop={(variable) => onDrop(category.id, variable)}
              onRemove={(variable) => onRemove(category.id, variable)}
              onOpenAdvancedOptions={onOpenAdvancedOptions}
              hasAdvancedOptions={
                category.id === 'item_id_vars' ? advancedOptionsConfigured?.item_id_vars :
                category.id === 'metadata_vars' ? advancedOptionsConfigured?.metadata_vars :
                false
              }
            />
          </Grid>
        ))}
      </Grid>

      {/* Examples accordion */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Ejemplos de Columnas por Categoría</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {CATEGORIES.map((category) => (
              <Grid item xs={12} md={6} key={category.id}>
                <Typography variant="subtitle1" sx={{ color: category.color, fontWeight: 'bold' }}>
                  {category.title}
                </Typography>
                <List dense>
                  {category.examples.map((example, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={example} />
                    </ListItem>
                  ))}
                </List>
                {category.id !== CATEGORIES[CATEGORIES.length - 1].id && <Divider />}
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default CategoryDropZones;
export { CATEGORIES };