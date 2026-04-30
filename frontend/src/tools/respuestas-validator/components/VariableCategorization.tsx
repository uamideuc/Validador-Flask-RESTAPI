import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Chip,
  Grid,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { ExpandMore, DragIndicator, Person, QuestionAnswer, Folder, Description, AutoFixHigh, Visibility, VisibilityOff, RestartAlt } from '@mui/icons-material';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ItemConfigPanel, { ResponseType } from './ItemConfigPanel';
import DataPreview from '../../ensamblaje-validator/components/DataPreview';
import { useRespuestasState, RespuestasItemConfig } from '../../../core/ToolStateContext';
import { LdCSuggestedCategorization } from './LdCUpload';

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

const RESP_CATEGORIES: CategoryConfig[] = [
  {
    id: 'participant_id_vars',
    title: '1. Identificación del Participante',
    description: 'Columnas que identifican al participante (folio, RUT, ID)',
    icon: <Person />,
    color: '#1976d2',
    examples: ['folio', 'rut', 'id_participante', 'codigo']
  },
  {
    id: 'other_relevant_vars',
    title: '2. Otras Variables Relevantes',
    description: 'Variables no-respuesta que importan (demográficos, etc.)',
    icon: <Folder />,
    color: '#388e3c',
    examples: ['genero', 'edad', 'colegio', 'curso', 'region']
  },
  {
    id: 'response_vars',
    title: '3. Respuestas / Ítems',
    description: 'Columnas que contienen respuestas a ítems del instrumento',
    icon: <QuestionAnswer />,
    color: '#f57c00',
    examples: ['i1', 'i2', 'item_1', 'p1', 'pregunta_1']
  },
  {
    id: 'metadata_vars',
    title: '4. Metadata / Complementarias',
    description: 'Variables no relevantes para la validación (se preservan pero no se validan)',
    icon: <Description />,
    color: '#7b1fa2',
    examples: ['fecha_aplicacion', 'observaciones', 'version']
  }
];

const ItemType = 'VARIABLE';

const DraggableVariable: React.FC<{
  variable: Variable;
  onRemove?: () => void;
  onClick?: () => void;
  isSelected?: boolean;
}> = ({ variable, onRemove, onClick, isSelected }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { variable },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
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
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isSelected ? '#e3f2fd' : undefined,
        borderColor: isSelected ? '#1976d2' : undefined,
        borderWidth: isSelected ? '2px' : '1px',
      }}
      variant="outlined"
      color={isSelected ? 'primary' : 'default'}
    />
  );
};

const DropZone: React.FC<{
  category: CategoryConfig;
  variables: Variable[];
  onDrop: (variable: Variable) => void;
  onRemove: (variable: Variable) => void;
}> = ({ category, variables, onDrop, onRemove }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemType,
    drop: (item: { variable: Variable }) => onDrop(item.variable),
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
            Arrastra columnas aquí...
          </Typography>
        ) : (
          variables.map((v, i) => (
            <DraggableVariable
              key={`${category.id}-${v.name}-${i}`}
              variable={v}
              onRemove={() => onRemove(v)}
            />
          ))
        )}
      </Box>
    </Paper>
  );
};

interface VariableCategorizationProps {
  variables: string[];
  sampleValues: Record<string, string[]>;
  onCategorization: (categorization: any) => void;
  uploadId: number;
  sheetName?: string;
  uploadedFilename?: string | null;
  savedCategorization?: any;
  ldcSuggestedCategorization?: LdCSuggestedCategorization | null;
  renamedColumns?: Record<string, string>;
}

const VariableCategorization: React.FC<VariableCategorizationProps> = ({
  variables,
  sampleValues,
  onCategorization,
  uploadId,
  sheetName,
  uploadedFilename,
  savedCategorization,
  ldcSuggestedCategorization,
  renamedColumns,
}) => {
  const { respuestasState, setRespuestasState } = useRespuestasState();

  const [categorizedVariables, setCategorizedVariables] = useState<Record<string, Variable[]>>({
    participant_id_vars: [],
    other_relevant_vars: [],
    response_vars: [],
    metadata_vars: [],
  });
  const [uncategorizedVariables, setUncategorizedVariables] = useState<Variable[]>([]);
  const [selectedVariables, setSelectedVariables] = useState<Set<string>>(new Set());
  const [itemConfigs, setItemConfigs] = useState<RespuestasItemConfig[]>(
    respuestasState.itemConfigs || []
  );
  const [responseTypes, setResponseTypes] = useState<ResponseType[]>(
    (respuestasState.itemTypes as ResponseType[]) || []
  );
  const [typeAssignments, setTypeAssignments] = useState<Record<string, string>>(
    respuestasState.itemTypeAssignments || {}
  );
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showLdcSummary, setShowLdcSummary] = useState(false);
  const [ldcResetTrigger, setLdcResetTrigger] = useState(0);

  useEffect(() => {
    if (!isInitialized && variables.length > 0) {
      if (savedCategorization) {
        // Restore from saved categorization (after validation)
        const restored: Record<string, Variable[]> = {
          participant_id_vars: [],
          other_relevant_vars: [],
          response_vars: [],
          metadata_vars: [],
        };
        const categorizedNames = new Set<string>();

        Object.entries(savedCategorization).forEach(([key, varNames]) => {
          if (key in restored && Array.isArray(varNames)) {
            restored[key] = (varNames as string[]).map(name => ({
              name,
              sampleValues: sampleValues[name] || []
            }));
            (varNames as string[]).forEach(n => categorizedNames.add(n));
          }
        });

        setCategorizedVariables(restored);
        setUncategorizedVariables(
          variables
            .filter(n => !categorizedNames.has(n))
            .map(n => ({ name: n, sampleValues: sampleValues[n] || [] }))
        );
      } else if (ldcSuggestedCategorization) {
        const toVar = (name: string): Variable => ({ name, sampleValues: sampleValues[name] || [] });

        if (ldcSuggestedCategorization.has_tipo_validacion) {
          // Categorización enriquecida por columna tipo_validacion del LdC
          const categorized: Record<string, Variable[]> = {
            participant_id_vars: ldcSuggestedCategorization.participant_id_vars.map(toVar),
            other_relevant_vars: ldcSuggestedCategorization.other_relevant_vars_from_ldc.map(toVar),
            response_vars: ldcSuggestedCategorization.response_vars.map(toVar),
            metadata_vars: ldcSuggestedCategorization.metadata_vars_from_ldc.map(toVar),
          };
          const allAssigned = new Set([
            ...ldcSuggestedCategorization.participant_id_vars,
            ...ldcSuggestedCategorization.other_relevant_vars_from_ldc,
            ...ldcSuggestedCategorization.response_vars,
            ...ldcSuggestedCategorization.metadata_vars_from_ldc,
          ]);
          setCategorizedVariables(categorized);
          setUncategorizedVariables(variables.filter(n => !allAssigned.has(n)).map(toVar));
        } else {
          // Categorización clásica: respuestas vs no-aplica del LdC
          const responseSet = new Set(ldcSuggestedCategorization.response_vars);
          const nonResponseSet = new Set(ldcSuggestedCategorization.non_response_vars);
          setCategorizedVariables({
            participant_id_vars: [],
            other_relevant_vars: ldcSuggestedCategorization.non_response_vars.map(toVar),
            response_vars: ldcSuggestedCategorization.response_vars.map(toVar),
            metadata_vars: [],
          });
          setUncategorizedVariables(
            variables.filter(n => !responseSet.has(n) && !nonResponseSet.has(n)).map(toVar)
          );
        }
      } else {
        setUncategorizedVariables(
          variables.map(n => ({ name: n, sampleValues: sampleValues[n] || [] }))
        );
      }
      setIsInitialized(true);
    }
  }, [isInitialized, variables, sampleValues, savedCategorization, ldcSuggestedCategorization]);

  const handleDrop = useCallback((categoryId: string, variable: Variable) => {
    setError(null);
    if (respuestasState.hasCompletedValidation) setRespuestasState({ hasChangesAfterValidation: true });

    const variablesToMove = selectedVariables.size > 0 && selectedVariables.has(variable.name)
      ? Array.from(selectedVariables).map(name =>
          uncategorizedVariables.find(v => v.name === name) ||
          Object.values(categorizedVariables).flat().find(v => v.name === name)
        ).filter(Boolean) as Variable[]
      : [variable];

    setUncategorizedVariables(prev =>
      prev.filter(v => !variablesToMove.some(mv => mv.name === v.name))
    );

    setCategorizedVariables(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = newState[key].filter(v => !variablesToMove.some(mv => mv.name === v.name));
      });
      newState[categoryId] = [...newState[categoryId], ...variablesToMove];
      return newState;
    });

    if (selectedVariables.has(variable.name)) {
      setSelectedVariables(new Set());
    }
  }, [selectedVariables, uncategorizedVariables, categorizedVariables, respuestasState.hasCompletedValidation, setRespuestasState]);

  const handleRemove = useCallback((categoryId: string, variable: Variable) => {
    if (respuestasState.hasCompletedValidation) setRespuestasState({ hasChangesAfterValidation: true });
    setCategorizedVariables(prev => ({
      ...prev,
      [categoryId]: prev[categoryId].filter(v => v.name !== variable.name),
    }));
    setUncategorizedVariables(prev => [...prev, variable]);
  }, [respuestasState.hasCompletedValidation, setRespuestasState]);

  const handleVariableSelect = useCallback((variableName: string) => {
    setSelectedVariables(prev => {
      const next = new Set(prev);
      if (next.has(variableName)) next.delete(variableName);
      else next.add(variableName);
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    const allVars: Variable[] = [];
    Object.values(categorizedVariables).forEach(vars => allVars.push(...vars));
    if (allVars.length === 0) return;

    if (respuestasState.hasCompletedValidation) setRespuestasState({ hasChangesAfterValidation: true });
    setUncategorizedVariables(prev => [...prev, ...allVars]);
    setCategorizedVariables({
      participant_id_vars: [],
      other_relevant_vars: [],
      response_vars: [],
      metadata_vars: [],
    });
    setError(null);
  }, [categorizedVariables, respuestasState.hasCompletedValidation, setRespuestasState]);

  const responseVarObjects = categorizedVariables.response_vars;

  const allItemsConfigured = responseVarObjects.length > 0 && responseVarObjects.every(v => {
    const config = itemConfigs.find(c => c.variable === v.name);
    return config && (config.missing_includes_empty || config.missing_values.length > 0);
  });

  const handleReapplyLdcSuggestion = useCallback(() => {
    if (!ldcSuggestedCategorization?.has_tipo_validacion) return;
    const toVar = (name: string): Variable => ({ name, sampleValues: sampleValues[name] || [] });
    const categorized: Record<string, Variable[]> = {
      participant_id_vars: ldcSuggestedCategorization.participant_id_vars.map(toVar),
      other_relevant_vars: ldcSuggestedCategorization.other_relevant_vars_from_ldc.map(toVar),
      response_vars: ldcSuggestedCategorization.response_vars.map(toVar),
      metadata_vars: ldcSuggestedCategorization.metadata_vars_from_ldc.map(toVar),
    };
    const allAssigned = new Set([
      ...ldcSuggestedCategorization.participant_id_vars,
      ...ldcSuggestedCategorization.other_relevant_vars_from_ldc,
      ...ldcSuggestedCategorization.response_vars,
      ...ldcSuggestedCategorization.metadata_vars_from_ldc,
    ]);
    setCategorizedVariables(categorized);
    setUncategorizedVariables(variables.filter(n => !allAssigned.has(n)).map(toVar));
    if (respuestasState.hasCompletedValidation) setRespuestasState({ hasChangesAfterValidation: true });
    setLdcResetTrigger(prev => prev + 1);
    setShowLdcSummary(false);
  }, [ldcSuggestedCategorization, variables, sampleValues, respuestasState.hasCompletedValidation, setRespuestasState]);

  const handleSaveCategorization = () => {
    if (categorizedVariables.participant_id_vars.length === 0) {
      setError('Debe asignar al menos una columna como identificador de participante');
      return;
    }
    if (categorizedVariables.response_vars.length === 0) {
      setError('Debe asignar al menos una columna como respuesta/ítem');
      return;
    }

    const itemsWithoutValidValues = responseVarObjects.filter(v => {
      const config = itemConfigs.find(c => c.variable === v.name);
      return config && config.valid_values.length === 0;
    });
    if (itemsWithoutValidValues.length > 0) {
      const names = itemsWithoutValidValues.slice(0, 5).map(v => v.name).join(', ');
      const suffix = itemsWithoutValidValues.length > 5 ? '…' : '';
      setError(`Los siguientes ítems no tienen valores válidos declarados: ${names}${suffix}`);
      return;
    }

    if (!allItemsConfigured) {
      setError('Todos los ítems de respuesta deben tener valores missing declarados');
      return;
    }

    const responseTypesPayload = responseTypes.map(t => ({
      id: t.id,
      label: t.label,
      valid_values: t.valid_values,
      missing_values: t.missing_values,
      missing_includes_empty: t.missing_includes_empty,
      item_names: responseVarObjects
        .filter(v => typeAssignments[v.name] === t.id)
        .map(v => v.name)
    }));

    const categorizationData = {
      participant_id_vars: categorizedVariables.participant_id_vars.map(v => v.name),
      response_vars: categorizedVariables.response_vars.map(v => v.name),
      other_relevant_vars: categorizedVariables.other_relevant_vars.map(v => v.name),
      metadata_vars: [
        ...categorizedVariables.metadata_vars.map(v => v.name),
        ...uncategorizedVariables.map(v => v.name)
      ],
      item_configs: itemConfigs.filter(c =>
        categorizedVariables.response_vars.some(v => v.name === c.variable)
      ),
      response_types: responseTypesPayload
    };

    setRespuestasState({ itemConfigs });
    onCategorization(categorizationData);
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
          Arrastra las columnas a las categorías correspondientes, luego configura los ítems de respuesta.
        </Typography>

        {(uploadedFilename || respuestasState.ldcState?.filename) && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              📄 Información de Archivos
            </Typography>
            {uploadedFilename && (
              <Typography variant="body2" sx={{ mb: sheetName ? 0.5 : 0 }}>
                <strong>Base de respuestas:</strong> {uploadedFilename}
              </Typography>
            )}
            {sheetName && (
              <Typography variant="body2" sx={{ mb: respuestasState.ldcState?.filename ? 0.5 : 0 }}>
                <strong>Hoja:</strong> {sheetName}
              </Typography>
            )}
            {respuestasState.ldcState?.filename && (
              <Typography variant="body2">
                <strong>Libro de Códigos:</strong> {respuestasState.ldcState.filename}
              </Typography>
            )}
          </Paper>
        )}

        {renamedColumns && Object.keys(renamedColumns).length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Columnas renombradas automáticamente:</strong> El Validador detectó columnas
            con nombres repetidos y las renombró para distinguirlas:
            <Box component="ul" sx={{ mt: 0.5, mb: 0.5, pl: 2 }}>
              {Object.entries(renamedColumns).map(([renamed, original]) => (
                <li key={renamed}>
                  <strong>{renamed}</strong> <span style={{ color: '#666' }}>(nombre original: {original})</span>
                </li>
              ))}
            </Box>
            Si son duplicados no intencionales, corrígelos en el archivo original antes de re-subir.
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="body2" gutterBottom>
            Progreso: {totalCategorized} de {totalVariables} columnas categorizadas
          </Typography>
          <Box sx={{ width: '100%', height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
            <Box
              sx={{
                width: `${totalVariables > 0 ? (totalCategorized / totalVariables) * 100 : 0}%`,
                height: '100%',
                backgroundColor: '#1976d2',
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
        </Paper>

        {/* Preview toggle - centrado */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant={showPreview ? 'contained' : 'outlined'}
            startIcon={showPreview ? <VisibilityOff /> : <Visibility />}
            onClick={() => setShowPreview(!showPreview)}
            sx={{ minWidth: 180 }}
          >
            {showPreview ? 'Ocultar Preview' : 'Ver Preview de Datos'}
          </Button>
        </Box>

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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">
                Columnas sin categorizar ({uncategorizedVariables.length})
                {selectedVariables.size > 0 && (
                  <Chip label={`${selectedVariables.size} seleccionadas`} size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </Typography>
              <Box display="flex" gap={1}>
                {selectedVariables.size > 0 && (
                  <Button size="small" variant="outlined" onClick={() => setSelectedVariables(new Set())}>
                    Limpiar Selección
                  </Button>
                )}
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Haz clic para seleccionar múltiples, luego arrastra al destino
            </Typography>
            <Box>
              {uncategorizedVariables.map((variable, index) => (
                <DraggableVariable
                  key={`uncategorized-${variable.name}-${index}`}
                  variable={variable}
                  onClick={() => handleVariableSelect(variable.name)}
                  isSelected={selectedVariables.has(variable.name)}
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* Acciones de categorización - centradas */}
        {(ldcSuggestedCategorization?.has_tipo_validacion || totalCategorized > 0) && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
            {ldcSuggestedCategorization?.has_tipo_validacion && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AutoFixHigh />}
                onClick={() => setShowLdcSummary(true)}
              >
                Categorización LdC
              </Button>
            )}
            {totalCategorized > 0 && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<RestartAlt />}
                onClick={handleClearAll}
              >
                Limpiar Categorización
              </Button>
            )}
          </Box>
        )}

        {/* Category drop zones */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {RESP_CATEGORIES.map((category) => (
            <Grid item xs={12} md={6} key={category.id}>
              <DropZone
                category={category}
                variables={categorizedVariables[category.id] || []}
                onDrop={(variable) => handleDrop(category.id, variable)}
                onRemove={(variable) => handleRemove(category.id, variable)}
              />
            </Grid>
          ))}
        </Grid>

        {/* Item Configuration Panel - only show when there are response vars */}
        {responseVarObjects.length > 0 && (
          <ItemConfigPanel
            responseVariables={responseVarObjects}
            itemConfigs={itemConfigs}
            onConfigsChange={(configs) => {
              setItemConfigs(configs);
              if (respuestasState.hasCompletedValidation) setRespuestasState({ hasChangesAfterValidation: true });
            }}
            onTypesChange={(types, assignments) => {
              setResponseTypes(types);
              setTypeAssignments(assignments);
              setRespuestasState({ itemTypes: types, itemTypeAssignments: assignments });
            }}
            initialTypes={responseTypes.length > 0 ? responseTypes : undefined}
            initialAssignments={typeAssignments}
            ldcItemConfigs={respuestasState.itemConfigs}
            resetLdcTrigger={ldcResetTrigger}
          />
        )}

        {/* Examples accordion */}
        <Accordion sx={{ mt: 2, mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Ejemplos de Columnas por Categoría</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {RESP_CATEGORIES.map((category) => (
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

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSaveCategorization}
            disabled={totalCategorized === 0 || respuestasState.isLoading}
            startIcon={respuestasState.isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {respuestasState.isLoading ? 'Guardando y validando...' : 'Guardar Categorización y Validar'}
          </Button>
        </Box>
      </Box>
      {/* Diálogo: Categorización insumada por Libro de Códigos */}
      {ldcSuggestedCategorization?.has_tipo_validacion && (
        <Dialog open={showLdcSummary} onClose={() => setShowLdcSummary(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Categorización definida por Libro de Códigos (LdC)
            <Chip label={respuestasState.ldcState?.tipo_validacion_column ?? 'tipo_validacion'} color="info" size="small" sx={{ ml: 1 }} />
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Asignación de variables según la columna <strong>{respuestasState.ldcState?.tipo_validacion_column ?? 'tipo_validacion'}</strong> del Libro de Códigos (LdC).
              Puedes re-aplicarla en cualquier momento para revertir cambios manuales.
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Caja</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Variables</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { label: '1. Identificación del Participante', vars: ldcSuggestedCategorization.participant_id_vars, color: '#1976d2' },
                    { label: '2. Otras Variables Relevantes', vars: ldcSuggestedCategorization.other_relevant_vars_from_ldc, color: '#388e3c' },
                    { label: '3. Respuestas / Ítems', vars: ldcSuggestedCategorization.response_vars, color: '#f57c00' },
                    { label: '4. Metadata / Complementarias', vars: ldcSuggestedCategorization.metadata_vars_from_ldc, color: '#7b1fa2' },
                    { label: 'Sin categorizar (tipo no reconocido)', vars: ldcSuggestedCategorization.unmatched_vars, color: '#757575' },
                  ].map(({ label, vars, color }) => (
                    <TableRow key={label}>
                      <TableCell sx={{ color, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {label} ({vars.length})
                      </TableCell>
                      <TableCell>
                        {vars.length === 0
                          ? <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>—</Typography>
                          : <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {vars.map(v => (
                                <Chip key={v} label={v} size="small" variant="outlined" />
                              ))}
                            </Box>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowLdcSummary(false)}>Cerrar</Button>
            <Button variant="contained" startIcon={<AutoFixHigh />} onClick={handleReapplyLdcSuggestion}>
              Re-aplicar categorización
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </DndProvider>
  );
};

export default VariableCategorization;
