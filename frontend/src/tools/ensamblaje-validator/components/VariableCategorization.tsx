import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { ExpandMore, DragIndicator, Category, Assignment, Info, Class, Visibility, VisibilityOff, RestartAlt, Warning as WarningIcon } from '@mui/icons-material';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DataPreview from './DataPreview';
import SingleInstrumentConfirmation from './SingleInstrumentConfirmation';
import ApiService from '../../../core/api';
import { useEnsamblajeState } from '../../../core/ToolStateContext';

interface Variable {
  name: string;
  sampleValues: string[];
}

interface UnnamedColumnsInfo {
  has_unnamed: boolean;
  renamed_columns: Array<{
    original_name: string;
    new_name: string;
    column_index: number;
    sample_values: string[];
  }>;
  total_unnamed: number;
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
    examples: ['invertido', 'ancla', 'clave', 'valores_validos', 'valores_invalidos']
  },
  {
    id: 'classification_vars',
    title: 'Clasificación de Ítem',
    description: 'Variables que clasifican o describen el contenido del ítem (puede tener valores vacíos)',
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
  const { ensamblajeState, setEnsamblajeState } = useEnsamblajeState();

  // Sistema de prioridad para estado inicial:
  // 1. currentCategorization (cambios temporales) - máxima prioridad
  // 2. savedCategorization (estado validado) - si no hay cambios temporales
  // 3. Estado inicial (variables sin categorizar) - por defecto
  
  const getInitialCategorizedVariables = () => {
    // 🎯 UX: PRIORIDAD CORREGIDA - Estado temporal SIEMPRE tiene prioridad
    
    // Prioridad 1: Estado temporal (cambios no guardados) - DEBE preservarse entre navegaciones  
    if (ensamblajeState.currentCategorization?.categorizedVariables) {
      const temporalVars = ensamblajeState.currentCategorization.categorizedVariables;
      console.log('🎯 UX: Cargando estado temporal preservado:', temporalVars);
      return temporalVars;
    }
    
    // Prioridad 2: Estado validado (solo si NO hay cambios temporales)
    if (savedCategorization && !ensamblajeState.currentCategorization) {
      console.log('🎯 UX: Cargando estado validado:', savedCategorization);
      const restored: Record<string, Variable[]> = {
        instrument_vars: [],
        item_id_vars: [],
        metadata_vars: [],
        classification_vars: [],
        other_vars: [],
      };
      
      // Restaurar desde savedCategorization
      Object.entries(savedCategorization).forEach(([key, varNames]) => {
        if (key !== 'other_vars' && Array.isArray(varNames)) {
          restored[key] = (varNames as string[]).map(name => ({
            name,
            sampleValues: sampleValues[name] || []
          }));
        }
      });
      
      return restored;
    }
    
    // Prioridad 3: Estado inicial vacío
    console.log('🎯 UX: Cargando estado inicial vacío');
    return {
      instrument_vars: [],
      item_id_vars: [],
      metadata_vars: [],
      classification_vars: [],
      other_vars: [],
    };
  };

  const getInitialUncategorizedVariables = () => {
    // Prioridad 1: Estado temporal
    if (ensamblajeState.currentCategorization?.uncategorizedVariables) {
      return ensamblajeState.currentCategorization.uncategorizedVariables;
    }
    
    // Prioridad 2: Calcular desde savedCategorization
    if (savedCategorization) {
      const categorizedNames = new Set<string>();
      Object.entries(savedCategorization).forEach(([key, varNames]) => {
        if (key !== 'other_vars' && Array.isArray(varNames)) {
          (varNames as string[]).forEach(name => categorizedNames.add(name));
        }
      });
      
      return variables
        .filter(name => !categorizedNames.has(name))
        .map(name => ({
          name,
          sampleValues: sampleValues[name] || []
        }));
    }
    
    // Prioridad 3: Todas las variables sin categorizar
    return variables.map(name => ({
      name,
      sampleValues: sampleValues[name] || []
    }));
  };

  // 🚨 CRÍTICO: Estado inicial simple para evitar loop infinito
  const [categorizedVariables, setCategorizedVariables] = useState<Record<string, Variable[]>>({
    instrument_vars: [],
    item_id_vars: [],
    metadata_vars: [],
    classification_vars: [],
    other_vars: [],
  });
  const [uncategorizedVariables, setUncategorizedVariables] = useState<Variable[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [showSingleInstrumentConfirmation, setShowSingleInstrumentConfirmation] = useState(false);
  const [unnamedColumnsInfo, setUnnamedColumnsInfo] = useState<UnnamedColumnsInfo | null>(null);

  const [error, setError] = useState<string | null>(null);

  // 🚨 CRÍTICO: Inicialización única para evitar loop infinito
  useEffect(() => {
    if (!isInitialized && variables.length > 0 && Object.keys(sampleValues).length > 0) {
      console.log('🎯 UX: Inicializando estado por única vez');
      
      const initialCategorized = getInitialCategorizedVariables();
      const initialUncategorized = getInitialUncategorizedVariables();
      
      setCategorizedVariables(initialCategorized);
      setUncategorizedVariables(initialUncategorized);
      setIsInitialized(true);
    }
  }, [isInitialized, variables.length, Object.keys(sampleValues).length]);

  // Usar ref para evitar loops infinitos
  const lastSyncedState = useRef<string>('');

  // Sincronizar estado con el contexto de forma controlada
  const currentStateString = useMemo(() => {
    return JSON.stringify({
      categorizedVariables,
      uncategorizedVariables
    });
  }, [categorizedVariables, uncategorizedVariables]);

  useEffect(() => {
    // Solo sincronizar después de inicializar y si el estado realmente cambió
    if (!isInitialized || currentStateString === lastSyncedState.current) {
      return;
    }

    console.log('🎯 UX: Sincronizando estado con contexto');
    lastSyncedState.current = currentStateString;
    
    const currentState = {
      categorizedVariables,
      uncategorizedVariables
    };
    
    // 🚨 CRÍTICO: Detectar cambios después de validación de manera más precisa
    let hasChangesAfterValidation = false;
    
    if (ensamblajeState.hasCompletedValidation && ensamblajeState.savedCategorization) {
      // Convertir savedCategorization (array de nombres) a estructura comparable
      const savedAsVariables: Record<string, Variable[]> = {
        instrument_vars: [],
        item_id_vars: [],
        metadata_vars: [],
        classification_vars: [],
        other_vars: [],
      };
      
      Object.entries(ensamblajeState.savedCategorization).forEach(([key, varNames]) => {
        if (key !== 'other_vars' && Array.isArray(varNames)) {
          savedAsVariables[key] = (varNames as string[]).map(name => ({
            name,
            sampleValues: sampleValues[name] || []
          }));
        }
      });
      
      // Comparar solo las variables categorizadas (sin uncategorized)
      const currentCategorizedOnly = {
        instrument_vars: categorizedVariables.instrument_vars,
        item_id_vars: categorizedVariables.item_id_vars,
        metadata_vars: categorizedVariables.metadata_vars,
        classification_vars: categorizedVariables.classification_vars,
      };
      
      const savedCategorizedOnly = {
        instrument_vars: savedAsVariables.instrument_vars,
        item_id_vars: savedAsVariables.item_id_vars,
        metadata_vars: savedAsVariables.metadata_vars,
        classification_vars: savedAsVariables.classification_vars,
      };
      
      hasChangesAfterValidation = JSON.stringify(currentCategorizedOnly) !== JSON.stringify(savedCategorizedOnly);
    }

    // 🎯 UX: Detectar cambios temporales para indicador visual
    const hasTemporalChanges = hasChangesAfterValidation && ensamblajeState.hasCompletedValidation;
    
    setEnsamblajeState({
      currentCategorization: currentState,
      hasChangesAfterValidation: hasChangesAfterValidation,
      hasTemporalChanges: hasTemporalChanges
    });
  }, [currentStateString, isInitialized, setEnsamblajeState]);

  // Obtener información de columnas renombradas
  const fetchUnnamedColumnsInfo = useCallback(async () => {
    // 🚨 CRÍTICO: Validar que uploadId pertenece a la sesión actual
    if (!uploadId || !ensamblajeState.lastSessionId) {
      console.warn('🚨 SECURITY: No valid uploadId or sessionId - skipping request');
      return;
    }

    try {
      const previewData = await ApiService.getDataPreview(uploadId, sheetName, 0, 1);
      if (previewData.success && previewData.unnamed_columns_info) {
        setUnnamedColumnsInfo(previewData.unnamed_columns_info);
      }
    } catch (error) {
      // 🚨 CRÍTICO: Si es 404, probablemente uploadId obsoleto de sesión anterior
      if ((error as any)?.response?.status === 404) {
        console.warn('🚨 SECURITY: UploadId not found (404) - possibly from previous session');
        // Usar callback sin incluir setEnsamblajeState en dependencies para evitar loop
        setEnsamblajeState({ 
          error: 'Sesión expirada. Por favor, sube tu archivo nuevamente.',
          uploadId: null,
          parseData: null
        });
      } else {
        console.warn('No se pudo obtener información de columnas renombradas:', error);
      }
    }
  }, [uploadId, sheetName, ensamblajeState.lastSessionId]);

  useEffect(() => {
    fetchUnnamedColumnsInfo();
  }, [fetchUnnamedColumnsInfo]);


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
    
    // 🎯 UX: Al hacer "Limpiar Categorización", sí eliminar estado temporal
    setEnsamblajeState({
      currentCategorization: null,
      hasTemporalChanges: false // Reset indicador visual
    });
  }, [categorizedVariables, setEnsamblajeState]);

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
    
    // 🎯 UX: Limpiar estado temporal ya que se procede con nueva validación
    setEnsamblajeState({
      currentCategorization: null,
      hasTemporalChanges: false // Reset indicador visual
    });
    
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

        {/* Unnamed columns warning */}
        {unnamedColumnsInfo && unnamedColumnsInfo.has_unnamed && (
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="subtitle1">
                  Columnas sin nombre detectadas ({unnamedColumnsInfo.total_unnamed})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Se encontraron columnas sin nombre. Se les han asignado nombres automáticamente para poder categorizarlas.
              </Alert>
              <Box>
                {unnamedColumnsInfo.renamed_columns.map((col, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Columna {col.column_index} (sin nombre) → {col.new_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Valores de muestra: {col.sample_values.join(', ') || 'Sin valores'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

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

        {/* Mostrar alerta si hay cambios después de validación */}
        {ensamblajeState.hasChangesAfterValidation && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>⚠️ Has modificado la categorización después de completar la validación.</strong>
              <br />
              Para aplicar estos cambios debes guardar la categorización y validar nuevamente.
            </Typography>
          </Alert>
        )}

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