import React, { useState, useCallback, useEffect } from 'react';
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
  Divider,
  Tooltip
} from '@mui/material';
import { ExpandMore, DragIndicator, Category, Assignment, Info, Class, Visibility, VisibilityOff, RestartAlt } from '@mui/icons-material';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DataPreview from './DataPreview';
import SingleInstrumentConfirmation from './SingleInstrumentConfirmation';

interface Variable {
  name: string;
  sampleValues: string[];
}

interface VariableCategorizationProps {
  variables: string[];
  sampleValues: Record<string, string[]>;
  onCategorization: (categorization: any) => void;
  uploadId: number;
  sheetName?: string;
  savedCategorization?: any; // Estado persistido para restaurar categorización anterior
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
  uploadId,
  sheetName,
  savedCategorization,
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

  const [showPreview, setShowPreview] = useState(false);
  const [showSingleInstrumentConfirmation, setShowSingleInstrumentConfirmation] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Restaurar estado guardado cuando existe savedCategorization
  useEffect(() => {
    if (savedCategorization) {
      console.log('Restaurando categorización guardada:', savedCategorization);
      
      // Convertir categorización guardada a formato de Variables con sample values
      const restoredCategorization: Record<string, Variable[]> = {
        instrument_vars: [],
        item_id_vars: [],
        metadata_vars: [],
        classification_vars: [],
        other_vars: [],
      };
      
      const categorizedNames = new Set<string>();
      
      // Restaurar cada categoría (other_vars no se persiste, así que permanece vacío)
      Object.keys(restoredCategorization).forEach(categoryId => {
        if (savedCategorization[categoryId] && Array.isArray(savedCategorization[categoryId])) {
          restoredCategorization[categoryId] = savedCategorization[categoryId].map((varName: string) => {
            categorizedNames.add(varName);
            return {
              name: varName,
              sampleValues: sampleValues[varName] || []
            };
          });
        }
        // Si categoryId === 'other_vars', savedCategorization[categoryId] será undefined
        // por lo que other_vars permanece como array vacío []
      });
      
      // Calcular variables no categorizadas (las que no están en ninguna categoría guardada)
      const remainingUncategorized = variables
        .filter(varName => !categorizedNames.has(varName))
        .map(varName => ({
          name: varName,
          sampleValues: sampleValues[varName] || []
        }));
      
      // Actualizar estado
      setCategorizedVariables(restoredCategorization);
      setUncategorizedVariables(remainingUncategorized);
    }
  }, [savedCategorization, variables, sampleValues]);

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

  const handleClearAllCategorization = useCallback(() => {
    // Recolectar todas las variables de todas las categorías
    const allCategorizedVars: Variable[] = [];
    Object.values(categorizedVariables).forEach(categoryVars => {
      allCategorizedVars.push(...categoryVars);
    });
    
    // Solo proceder si hay variables categorizadas
    if (allCategorizedVars.length === 0) {
      return;
    }

    // Mover todas las variables categorizadas de vuelta a uncategorized
    setUncategorizedVariables(prev => [...prev, ...allCategorizedVars]);
    
    // Limpiar todas las categorías
    setCategorizedVariables({
      instrument_vars: [],
      item_id_vars: [],
      metadata_vars: [],
      classification_vars: [],
      other_vars: [],
    });
    
    // Limpiar errores
    setError(null);
  }, [categorizedVariables]);

  const validateCategorization = (): string | null => {
    if (categorizedVariables.item_id_vars.length === 0) {
      return 'Debe asignar al menos una variable como identificador de ítem';
    }
    
    // Solo validar variables de instrumento si NO estamos en modo single instrument
    if (categorizedVariables.instrument_vars.length === 0 && !showSingleInstrumentConfirmation) {
      // Detectar caso de instrumento único y mostrar confirmación
      return null; // No retornar error, manejar con confirmación
    }
    
    return null;
  };

  const handleSaveCategorization = () => {
    const validationError = validateCategorization();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Detectar caso de instrumento único (no hay variables de instrumento asignadas)
    if (categorizedVariables.instrument_vars.length === 0) {
      setShowSingleInstrumentConfirmation(true);
      return;
    }

    // Proceder con categorización normal
    proceedWithCategorization();
  };

  const proceedWithCategorization = () => {
    // NO modificar estado UI - mantener uncategorized variables accesibles
    // Solo calcular other_vars para envío al backend
    
    // Preparar categorización para API (incluye other_vars calculado)
    const categorizationData = {
      instrument_vars: categorizedVariables.instrument_vars.map(v => v.name),
      item_id_vars: categorizedVariables.item_id_vars.map(v => v.name),
      metadata_vars: categorizedVariables.metadata_vars.map(v => v.name),
      classification_vars: categorizedVariables.classification_vars.map(v => v.name),
      // Calcular other_vars: variables explícitamente asignadas + uncategorized
      other_vars: [
        ...categorizedVariables.other_vars.map(v => v.name),
        ...uncategorizedVariables.map(v => v.name)
      ],
    };

    console.log('Sending categorization to backend:', categorizationData);
    console.log('UI state preserved - uncategorized count:', uncategorizedVariables.length);
    
    onCategorization(categorizationData);
  };

  const handleSingleInstrumentConfirm = () => {
    setShowSingleInstrumentConfirmation(false);
    // Proceder sin variables de instrumento (backend maneja este caso automáticamente)
    proceedWithCategorization();
  };

  const handleSingleInstrumentCancel = () => {
    setShowSingleInstrumentConfirmation(false);
    // Usuario decidió especificar variables, mantener el estado actual
    setError('Por favor, asigne al menos una variable de instrumento o configure todas las variables necesarias.');
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

        {/* Control Buttons */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Tooltip title={showPreview ? "Ocultar preview de datos" : "Ver preview de datos para verificar columnas"}>
            <Button
              variant={showPreview ? "contained" : "outlined"}
              startIcon={showPreview ? <VisibilityOff /> : <Visibility />}
              onClick={() => setShowPreview(!showPreview)}
              sx={{ minWidth: 200 }}
            >
              {showPreview ? 'Ocultar Preview' : 'Ver Preview de Datos'}
            </Button>
          </Tooltip>
          
          <Tooltip title="Mover todas las variables categorizadas de vuelta a sin categorizar">
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAlt />}
              onClick={handleClearAllCategorization}
              disabled={totalCategorized === 0}
              sx={{ minWidth: 200 }}
            >
              Limpiar Categorización
            </Button>
          </Tooltip>
        </Box>

        {/* Data Preview Component */}
        {showPreview && (
          <Box sx={{ mb: 3 }}>
            <DataPreview 
              uploadId={uploadId} 
              sheetName={sheetName}
              onClose={() => setShowPreview(false)}
            />
          </Box>
        )}

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

        {/* Single Instrument Confirmation Dialog */}
        <SingleInstrumentConfirmation
          open={showSingleInstrumentConfirmation}
          onConfirm={handleSingleInstrumentConfirm}
          onCancel={handleSingleInstrumentCancel}
          totalVariables={totalVariables}
          itemIdVariables={categorizedVariables.item_id_vars.map(v => v.name)}
          metadataVariables={categorizedVariables.metadata_vars.map(v => v.name)}
          classificationVariables={categorizedVariables.classification_vars.map(v => v.name)}
        />
      </Box>
    </DndProvider>
  );
};

export default VariableCategorization;