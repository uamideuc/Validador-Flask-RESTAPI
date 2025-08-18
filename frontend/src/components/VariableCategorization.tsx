import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { ExpandMore, DragIndicator, Category, Assignment, Info, Class } from '@mui/icons-material';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface Variable {
  name: string;
  sampleValues: string[];
}

interface VariableCategorizationProps {
  variables: string[];
  sampleValues: Record<string, string[]>;
  onCategorization: (categorization: any) => void;
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
    title: 'Variables de Instrumento',
    description: 'Variables que identifican y distinguen diferentes instrumentos (ej: instrumento, sector, forma, nivel)',
    icon: <Assignment />,
    color: '#1976d2',
    examples: ['instrumento', 'sector', 'forma', 'cuadernillo', 'nivel', 'grado']
  },
  {
    id: 'item_id_vars',
    title: 'Identificador de Ítem',
    description: 'Variables que identifican únicamente cada ítem dentro de un instrumento',
    icon: <Category />,
    color: '#388e3c',
    examples: ['id_item', 'item_id', 'numero_item', 'codigo_item']
  },
  {
    id: 'metadata_vars',
    title: 'Metadata de Ítem',
    description: 'Variables con información técnica del ítem que DEBE estar siempre completa',
    icon: <Info />,
    color: '#f57c00',
    examples: ['invertido', 'ancla', 'clave', 'valores_validos', 'valores_invalidos', 'dificultad']
  },
  {
    id: 'classification_vars',
    title: 'Clasificación de Ítem',
    description: 'Variables que clasifican o describen el contenido del ítem (puede tener valores vacíos)',
    icon: <Class />,
    color: '#7b1fa2',
    examples: ['dimension', 'subdimension', 'enunciado', 'texto_pregunta', 'competencia', 'habilidad']
  }
];

const ItemType = 'VARIABLE';

interface DraggableVariableProps {
  variable: Variable;
  onRemove?: () => void;
  isDragging?: boolean;
}

const DraggableVariable: React.FC<DraggableVariableProps> = ({ variable, onRemove, isDragging }) => {
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
      icon={<DragIndicator />}
      sx={{
        m: 0.5,
        cursor: 'grab',
        opacity: dragState || isDragging ? 0.5 : 1,
        '&:active': {
          cursor: 'grabbing',
        },
      }}
      variant="outlined"
    />
  );
};

interface DropZoneProps {
  category: CategoryConfig;
  variables: Variable[];
  onDrop: (variable: Variable) => void;
  onRemove: (variable: Variable) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ category, variables, onDrop, onRemove }) => {
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
      </Box>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {category.description}
      </Typography>
      
      <Box sx={{ minHeight: 60 }}>
        {variables.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Arrastra variables aquí...
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

const VariableCategorization: React.FC<VariableCategorizationProps> = ({
  variables,
  sampleValues,
  onCategorization,
}) => {
  const [categorizedVariables, setCategorizedVariables] = useState<Record<string, Variable[]>>({
    instrument_vars: [],
    item_id_vars: [],
    metadata_vars: [],
    classification_vars: [],
    other_vars: [],
  });

  const [uncategorizedVariables, setUncategorizedVariables] = useState<Variable[]>(
    variables.map(name => ({
      name: name,
      sampleValues: sampleValues[name] || []
    }))
  );

  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((categoryId: string, variable: Variable) => {
    setError(null);
    
    // Remove from uncategorized
    setUncategorizedVariables(prev => prev.filter(v => v.name !== variable.name));
    
    // Remove from other categories
    setCategorizedVariables(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = newState[key].filter(v => v.name !== variable.name);
      });
      
      // Add to target category
      newState[categoryId] = [...newState[categoryId], variable];
      
      return newState;
    });
  }, []);

  const handleRemove = useCallback((categoryId: string, variable: Variable) => {
    setCategorizedVariables(prev => ({
      ...prev,
      [categoryId]: prev[categoryId].filter(v => v.name !== variable.name),
    }));
    
    setUncategorizedVariables(prev => [...prev, variable]);
  }, []);

  const handleRemoveFromUncategorized = useCallback((variable: Variable) => {
    // Move to "other_vars" category
    handleDrop('other_vars', variable);
  }, [handleDrop]);

  const validateCategorization = (): string | null => {
    if (categorizedVariables.item_id_vars.length === 0) {
      return 'Debe asignar al menos una variable como identificador de ítem';
    }
    
    if (categorizedVariables.instrument_vars.length === 0) {
      return 'Debe asignar al menos una variable de instrumento';
    }
    
    return null;
  };

  const handleSaveCategorization = () => {
    const validationError = validateCategorization();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Move any remaining uncategorized variables to "other_vars"
    const finalCategorization = { ...categorizedVariables };
    if (uncategorizedVariables.length > 0) {
      finalCategorization.other_vars = [
        ...finalCategorization.other_vars,
        ...uncategorizedVariables
      ];
      setUncategorizedVariables([]);
      setCategorizedVariables(finalCategorization);
    }

    // Convert to the format expected by the API
    const categorizationData = {
      instrument_vars: finalCategorization.instrument_vars.map(v => v.name),
      item_id_vars: finalCategorization.item_id_vars.map(v => v.name),
      metadata_vars: finalCategorization.metadata_vars.map(v => v.name),
      classification_vars: finalCategorization.classification_vars.map(v => v.name),
      other_vars: finalCategorization.other_vars.map(v => v.name),
    };

    onCategorization(categorizationData);
  };

  const totalCategorized = Object.values(categorizedVariables).reduce((sum, vars) => sum + vars.length, 0);
  const totalVariables = variables.length;

  return (
    <DndProvider backend={HTML5Backend}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Categorización de Variables
        </Typography>
        
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Arrastra las variables a las categorías correspondientes. Cada variable debe ser asignada según su función en el instrumento.
        </Typography>

        {/* Progress indicator */}
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="body2" gutterBottom>
            Progreso: {totalCategorized} de {totalVariables} variables categorizadas
          </Typography>
          <Box sx={{ width: '100%', height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
            <Box
              sx={{
                width: `${(totalCategorized / totalVariables) * 100}%`,
                height: '100%',
                backgroundColor: '#1976d2',
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
        </Paper>

        {/* Uncategorized variables */}
        {uncategorizedVariables.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Variables sin categorizar ({uncategorizedVariables.length})
            </Typography>
            <Box>
              {uncategorizedVariables.map((variable, index) => (
                <DraggableVariable
                  key={`uncategorized-${variable.name}-${index}`}
                  variable={variable}
                  onRemove={() => handleRemoveFromUncategorized(variable)}
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* Category drop zones */}
        <Grid container spacing={3}>
          {CATEGORIES.map((category) => (
            <Grid item xs={12} md={6} key={category.id}>
              <DropZone
                category={category}
                variables={categorizedVariables[category.id]}
                onDrop={(variable) => handleDrop(category.id, variable)}
                onRemove={(variable) => handleRemove(category.id, variable)}
              />
            </Grid>
          ))}
        </Grid>

        {/* Examples accordion */}
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Ejemplos de Variables por Categoría</Typography>
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

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSaveCategorization}
            disabled={totalCategorized === 0}
          >
            Guardar Categorización y Continuar
          </Button>
        </Box>
      </Box>
    </DndProvider>
  );
};

export default VariableCategorization;