import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore, Warning as WarningIcon } from '@mui/icons-material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DataPreview from './DataPreview';
import SingleInstrumentConfirmation from './SingleInstrumentConfirmation';
import FileInfoDisplay from './variable-categorization/FileInfoDisplay';
import VariableSelectionPanel from './variable-categorization/VariableSelectionPanel';
import CategoryDropZones, { CATEGORIES } from './variable-categorization/CategoryDropZones';
import { PreviewActions, CategorizationActions } from './variable-categorization/CategoryActions';
import { AutoCategorizer, type AutoCategorizationProposal } from './variable-categorization/AutoCategorizer';
import AutoCategorizationDialog from './variable-categorization/AutoCategorizationDialog';
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
  uploadedFilename?: string | null; // Nombre original del archivo subido
  savedCategorization?: any; // Estado persistido para restaurar categorización anterior
}




const VariableCategorization: React.FC<VariableCategorizationProps> = ({
  variables,
  sampleValues,
  onCategorization,
  uploadId,
  sheetName,
  uploadedFilename,
  savedCategorization,
}) => {
  const { ensamblajeState, setEnsamblajeState } = useEnsamblajeState();

  // Sistema de prioridad para estado inicial:
  // 1. currentCategorization (cambios temporales) - máxima prioridad
  // 2. savedCategorization (estado validado) - si no hay cambios temporales
  // 3. Estado inicial (variables sin categorizar) - por defecto
  
  const getInitialCategorizedVariables = useCallback(() => {
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
  }, [ensamblajeState.currentCategorization, savedCategorization, sampleValues]);

  const getInitialUncategorizedVariables = useCallback(() => {
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
  }, [ensamblajeState.currentCategorization, savedCategorization, variables, sampleValues]);

  // Estado inicial simple para evitar loop infinito
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
  const [selectedVariables, setSelectedVariables] = useState<Set<string>>(new Set());
  const [showAutoCategoryDialog, setShowAutoCategoryDialog] = useState(false);
  const [autoCategoryProposals, setAutoCategoryProposals] = useState<AutoCategorizationProposal[]>([]);

  const [error, setError] = useState<string | null>(null);

  // Extract complex expression to avoid React Hook warning
  const sampleValuesLength = Object.keys(sampleValues).length;

  // 🚨 CRÍTICO: Inicialización única para evitar loop infinito
  useEffect(() => {
    if (!isInitialized && variables.length > 0 && sampleValuesLength > 0) {
      console.log('🎯 UX: Inicializando estado por única vez');
      
      const initialCategorized = getInitialCategorizedVariables();
      const initialUncategorized = getInitialUncategorizedVariables();
      
      setCategorizedVariables(initialCategorized);
      setUncategorizedVariables(initialUncategorized);
      setIsInitialized(true);
    }
  }, [isInitialized, variables.length, sampleValuesLength, getInitialCategorizedVariables, getInitialUncategorizedVariables]);

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
  }, [currentStateString, isInitialized, setEnsamblajeState, categorizedVariables, uncategorizedVariables, ensamblajeState.hasCompletedValidation, ensamblajeState.savedCategorization, sampleValues]);

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
        // setEnsamblajeState es estable y no necesita estar en dependencies
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



  const handleRemove = useCallback((categoryId: string, variable: Variable) => {
    setCategorizedVariables(prev => ({
      ...prev,
      [categoryId]: prev[categoryId].filter(v => v.name !== variable.name),
    }));
    
    setUncategorizedVariables(prev => [...prev, variable]);
  }, []);

  // Handlers for multiple selection
  const clearSelection = useCallback(() => {
    setSelectedVariables(new Set());
  }, []);

  const handleVariableSelect = useCallback((variableName: string) => {
    setSelectedVariables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(variableName)) {
        newSet.delete(variableName);
      } else {
        newSet.add(variableName);
      }
      return newSet;
    });
  }, []);

  const handleDrop = useCallback((categoryId: string, variable: Variable) => {
    setError(null);
    
    // Check if there are selected variables to drop multiple
    const variablesToMove = selectedVariables.size > 0 && selectedVariables.has(variable.name)
      ? Array.from(selectedVariables).map(name => 
          uncategorizedVariables.find(v => v.name === name) || 
          Object.values(categorizedVariables).flat().find(v => v.name === name)
        ).filter(Boolean) as Variable[]
      : [variable];
    
    // Remove from uncategorized
    setUncategorizedVariables(prev => 
      prev.filter(v => !variablesToMove.some(mv => mv.name === v.name))
    );
    
    // Remove from other categories
    setCategorizedVariables(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = newState[key].filter(v => !variablesToMove.some(mv => mv.name === v.name));
      });
      
      // Add to target category
      newState[categoryId] = [...newState[categoryId], ...variablesToMove];
      
      return newState;
    });
    
    // Clear selection after drop
    if (variablesToMove.length > 1) {
      clearSelection();
    }
  }, [selectedVariables, uncategorizedVariables, categorizedVariables, clearSelection]);

  // const handleRemoveFromUncategorized = useCallback((variable: Variable) => {
  //   // Move to "other_vars" category
  //   handleDrop('other_vars', variable);
  // }, [handleDrop]);

  // Auto-categorization logic
  const handleAutoCategorizationClick = useCallback(() => {
    const result = AutoCategorizer.categorize(uncategorizedVariables, CATEGORIES);

    // Siempre mostrar el modal, con o sin sugerencias
    setAutoCategoryProposals(result.proposals);
    setShowAutoCategoryDialog(true);
    setError(null); // Limpiar cualquier error previo
  }, [uncategorizedVariables]);

  const handleAutoCategorizationAccept = useCallback(() => {
    autoCategoryProposals.forEach(({ variable, categoryId }) => {
      handleDrop(categoryId, variable);
    });
    
    setShowAutoCategoryDialog(false);
    setAutoCategoryProposals([]);
    setError(null);
  }, [autoCategoryProposals, handleDrop]);

  const handleAutoCategorizationCancel = useCallback(() => {
    setShowAutoCategoryDialog(false);
    setAutoCategoryProposals([]);
  }, []);

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
      return 'Debe asignar al menos una columna como identificador de ítem';
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

  const proceedWithCategorization = async () => {
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

    // 🚨 PRE-VALIDACIÓN: Verificar valores faltantes en identificación
    if (categorizedVariables.instrument_vars.length > 0) {
      try {
        await ApiService.preValidateCategorization(uploadId, categorizationData);
      } catch (error: any) {
        if (error.response?.data?.error_code === 'MISSING_VALUES_IN_IDENTIFICATION') {
          const validationErrors = error.response.data.validation_errors || [];
          const errorMessage = validationErrors.map((err: any) => 
            `Columna "${err.column}": ${err.missing_count} valores faltantes (${err.percentage}%)`
          ).join('\n');
          
          setError(`❌ ERROR: Las columnas de identificación de instrumento no pueden tener valores faltantes:\n\n${errorMessage}\n\nPor favor, revise su base de datos y complete los valores faltantes antes de continuar.`);
          return; // Detener proceso
        }
        
        // Otros errores de pre-validación
        setError(`Error en pre-validación: ${error.response?.data?.error || error.message}`);
        return;
      }
    }

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
    setError('Por favor, asigne al menos una columna de instrumento o configure todas las columnas necesarias.');
  };

  const totalCategorized = Object.values(categorizedVariables).reduce((sum, vars) => sum + vars.length, 0);
  const totalVariables = variables.length;

  return (
    <DndProvider backend={HTML5Backend}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Categorización de Columnas
        </Typography>
        
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Arrastra las columnas a las categorías correspondientes. Cada columna debe ser asignada según su función en la base de datos.
        </Typography>

        {/* File Info */}
        <FileInfoDisplay uploadedFilename={uploadedFilename} sheetName={sheetName} />

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
            Progreso: {totalCategorized} de {totalVariables} columnas categorizadas
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

        {/* Preview Actions */}
        <PreviewActions
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview(!showPreview)}
        />

        {/* Auto-categorization Dialog */}
        <AutoCategorizationDialog
          open={showAutoCategoryDialog}
          proposals={autoCategoryProposals}
          onAccept={handleAutoCategorizationAccept}
          onCancel={handleAutoCategorizationCancel}
        />

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
        <VariableSelectionPanel
          uncategorizedVariables={uncategorizedVariables}
          selectedVariables={selectedVariables}
          onVariableSelect={handleVariableSelect}
          onClearSelection={clearSelection}
        />

        {/* Categorization Actions - Positioned between uncategorized and drop zones */}
        <CategorizationActions
          uncategorizedVariables={uncategorizedVariables}
          totalCategorized={totalCategorized}
          onAutoCategorizationClick={handleAutoCategorizationClick}
          onClearAllCategorization={handleClearAllCategorization}
        />

        {/* Category drop zones */}
        <CategoryDropZones
          categorizedVariables={categorizedVariables}
          onDrop={handleDrop}
          onRemove={handleRemove}
        />

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