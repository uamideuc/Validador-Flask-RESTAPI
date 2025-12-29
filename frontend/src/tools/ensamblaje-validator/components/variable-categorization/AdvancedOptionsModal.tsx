import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Alert,
  Chip,
  FormLabel,
  CircularProgress,
  Divider,
  IconButton,
  Stack
} from '@mui/material';
import { Tune, Delete, Add } from '@mui/icons-material';
import ApiService, {
  AdvancedValidationOptions,
  ItemCountConstraint,
  KeyVariableConstraint,
  DetectedInstrument
} from '../../../../core/api';

interface AdvancedOptionsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (options: AdvancedValidationOptions) => void;
  categoryType: 'item_id_vars' | 'metadata_vars';
  availableVariables: string[];
  currentOptions?: AdvancedValidationOptions;
  instrumentVariables: string[];
  uploadId: number;
}

// Configuración para metadata_vars (por variable)
interface VariableConfig {
  isKeyVariable: boolean;
  expectedKeyCount?: number;
  expectedValues: string[];
  scope: 'global' | 'specific';
  specificInstrument?: string;
}

// Configuración para item_id_vars (por instrumento)
interface InstrumentItemCountConfig {
  expectedItemCount?: number;
}

const AdvancedOptionsModal: React.FC<AdvancedOptionsModalProps> = ({
  open,
  onClose,
  onSave,
  categoryType,
  availableVariables,
  currentOptions,
  instrumentVariables,
  uploadId
}) => {
  const [detectedInstruments, setDetectedInstruments] = useState<DetectedInstrument[]>([]);
  const [loadingInstruments, setLoadingInstruments] = useState(false);

  // Estados para metadata_vars (por variable)
  const [variableConfigs, setVariableConfigs] = useState<Record<string, VariableConfig>>({});
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});

  // Estados para item_id_vars (por instrumento)
  const [itemCountScope, setItemCountScope] = useState<'global' | 'specific'>('global');
  const [globalItemCount, setGlobalItemCount] = useState<number | ''>('');
  const [specificItemCounts, setSpecificItemCounts] = useState<Record<string, InstrumentItemCountConfig>>({});

  // Detectar instrumentos al abrir el modal
  useEffect(() => {
    if (open) {
      detectInstruments();
      loadCurrentConfiguration();
    }
  }, [open, instrumentVariables]);

  const detectInstruments = async () => {
    setLoadingInstruments(true);
    try {
      const result = await ApiService.detectInstruments(uploadId, {
        instrument_vars: instrumentVariables
      });
      setDetectedInstruments(result.instruments);

      // Inicializar configuración específica para cada instrumento detectado
      if (categoryType === 'item_id_vars') {
        const configs: Record<string, InstrumentItemCountConfig> = {};
        result.instruments.forEach(inst => {
          configs[inst.key] = { expectedItemCount: undefined };
        });
        setSpecificItemCounts(configs);
      }
    } catch (error) {
      console.error('Error detecting instruments:', error);
      setDetectedInstruments([]);
    } finally {
      setLoadingInstruments(false);
    }
  };

  const loadCurrentConfiguration = () => {
    if (!currentOptions) {
      if (categoryType === 'metadata_vars') {
        // Inicializar configuración vacía para metadata_vars
        const configs: Record<string, VariableConfig> = {};
        availableVariables.forEach(varName => {
          configs[varName] = {
            scope: 'global',
            isKeyVariable: false,
            expectedValues: []
          };
        });
        setVariableConfigs(configs);
      } else {
        // Para item_id_vars, inicializar con scope global
        setItemCountScope('global');
        setGlobalItemCount('');
      }
      return;
    }

    // Cargar configuración existente
    if (categoryType === 'item_id_vars' && currentOptions.item_count_constraints) {
      // Revisar si hay constraints globales o específicos
      const globalConstraint = currentOptions.item_count_constraints.find(c => c.scope === 'global');
      if (globalConstraint) {
        setItemCountScope('global');
        setGlobalItemCount(globalConstraint.expected_count);
      } else {
        setItemCountScope('specific');
        const configs: Record<string, InstrumentItemCountConfig> = {};
        currentOptions.item_count_constraints.forEach(constraint => {
          configs[constraint.scope] = { expectedItemCount: constraint.expected_count };
        });
        setSpecificItemCounts(configs);
      }
    } else if (categoryType === 'metadata_vars' && currentOptions.key_variable_constraints) {
      const configs: Record<string, VariableConfig> = {};
      availableVariables.forEach(varName => {
        configs[varName] = {
          scope: 'global',
          isKeyVariable: false,
          expectedValues: []
        };
      });

      currentOptions.key_variable_constraints.forEach(constraint => {
        if (constraint.variable_name in configs) {
          configs[constraint.variable_name] = {
            scope: constraint.scope === 'global' ? 'global' : 'specific',
            specificInstrument: constraint.scope !== 'global' ? constraint.scope : undefined,
            isKeyVariable: true,
            expectedKeyCount: constraint.expected_key_count,
            expectedValues: constraint.expected_values || []
          };
        }
      });

      setVariableConfigs(configs);
    }
  };

  // Handlers para metadata_vars
  const handleKeyVariableToggle = (varName: string, checked: boolean) => {
    setVariableConfigs(prev => {
      const existing = prev[varName] || { scope: 'global', isKeyVariable: false, expectedValues: [] };
      return {
        ...prev,
        [varName]: {
          ...existing,
          isKeyVariable: checked
        }
      };
    });
  };

  const handleKeyCountChange = (varName: string, count: string) => {
    const numCount = parseInt(count) || undefined;
    setVariableConfigs(prev => {
      const existing = prev[varName] || { scope: 'global', isKeyVariable: false, expectedValues: [] };
      return {
        ...prev,
        [varName]: {
          ...existing,
          expectedKeyCount: numCount
        }
      };
    });
  };

  const handleAddExpectedValue = (varName: string) => {
    const value = tempInputValues[varName]?.trim();
    if (!value) return;

    setVariableConfigs(prev => {
      const existing = prev[varName] || { scope: 'global', isKeyVariable: false, expectedValues: [] };
      const currentValues = existing.expectedValues || [];

      // Evitar duplicados
      if (currentValues.includes(value)) {
        return prev;
      }

      return {
        ...prev,
        [varName]: {
          ...existing,
          expectedValues: [...currentValues, value]
        }
      };
    });

    // Limpiar el input temporal
    setTempInputValues(prev => ({ ...prev, [varName]: '' }));
  };

  const handleRemoveExpectedValue = (varName: string, valueToRemove: string) => {
    setVariableConfigs(prev => {
      const existing = prev[varName] || { scope: 'global', isKeyVariable: false, expectedValues: [] };
      return {
        ...prev,
        [varName]: {
          ...existing,
          expectedValues: (existing.expectedValues || []).filter(v => v !== valueToRemove)
        }
      };
    });
  };

  const handleScopeChange = (varName: string, scope: 'global' | 'specific') => {
    setVariableConfigs(prev => {
      const existing = prev[varName] || { scope: 'global', isKeyVariable: false, expectedValues: [] };
      return {
        ...prev,
        [varName]: {
          ...existing,
          scope,
          specificInstrument: scope === 'specific' ? detectedInstruments[0]?.key : undefined
        }
      };
    });
  };

  const handleSpecificInstrumentChange = (varName: string, instrumentKey: string) => {
    setVariableConfigs(prev => {
      const existing = prev[varName] || { scope: 'global', isKeyVariable: false, expectedValues: [] };
      return {
        ...prev,
        [varName]: {
          ...existing,
          specificInstrument: instrumentKey
        }
      };
    });
  };

  // Handlers para item_id_vars
  const handleSpecificItemCountChange = (instrumentKey: string, count: string) => {
    const numCount = parseInt(count) || undefined;
    setSpecificItemCounts(prev => ({
      ...prev,
      [instrumentKey]: {
        expectedItemCount: numCount
      }
    }));
  };

  const handleClearAll = () => {
    if (categoryType === 'item_id_vars') {
      setItemCountScope('global');
      setGlobalItemCount('');
      const configs: Record<string, InstrumentItemCountConfig> = {};
      detectedInstruments.forEach(inst => {
        configs[inst.key] = { expectedItemCount: undefined };
      });
      setSpecificItemCounts(configs);
    } else {
      const configs: Record<string, VariableConfig> = {};
      availableVariables.forEach(varName => {
        configs[varName] = {
          scope: 'global',
          isKeyVariable: false,
          expectedValues: []
        };
      });
      setVariableConfigs(configs);
    }
  };

  const handleSave = () => {
    const itemCountConstraints: ItemCountConstraint[] = [];
    const keyVariableConstraints: KeyVariableConstraint[] = [];

    if (categoryType === 'item_id_vars') {
      // Crear constraints de conteo de ítems
      if (itemCountScope === 'global' && globalItemCount) {
        itemCountConstraints.push({
          expected_count: Number(globalItemCount),
          scope: 'global'
        });
      } else if (itemCountScope === 'specific') {
        Object.entries(specificItemCounts).forEach(([instrumentKey, config]) => {
          if (config.expectedItemCount) {
            itemCountConstraints.push({
              expected_count: config.expectedItemCount,
              scope: instrumentKey
            });
          }
        });
      }
    } else {
      // Crear constraints de variables de claves
      Object.entries(variableConfigs).forEach(([varName, config]) => {
        if (config.isKeyVariable && (config.expectedKeyCount || config.expectedValues.length > 0)) {
          keyVariableConstraints.push({
            variable_name: varName,
            expected_key_count: config.expectedKeyCount || 0,
            expected_values: config.expectedValues,
            scope: config.scope === 'global' ? 'global' : (config.specificInstrument || 'global')
          });
        }
      });
    }

    // Combinar con opciones existentes de otras categorías
    const newOptions: AdvancedValidationOptions = {
      item_count_constraints: categoryType === 'item_id_vars'
        ? itemCountConstraints
        : (currentOptions?.item_count_constraints || []),
      key_variable_constraints: categoryType === 'metadata_vars'
        ? keyVariableConstraints
        : (currentOptions?.key_variable_constraints || [])
    };

    onSave(newOptions);
  };

  const hasAnyConfiguration = () => {
    if (categoryType === 'item_id_vars') {
      if (itemCountScope === 'global') {
        return !!globalItemCount;
      } else {
        return Object.values(specificItemCounts).some(config => config.expectedItemCount);
      }
    } else {
      return Object.values(variableConfigs).some(config => config.isKeyVariable);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        color: 'white'
      }}>
        <Tune />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Opciones Avanzadas de Validación - {categoryType === 'item_id_vars' ? 'Identificación de Ítems' : 'Variables Críticas'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          {categoryType === 'item_id_vars'
            ? 'Configure la cantidad exacta de ítems (filas) que debe tener cada instrumento. Las violaciones se reportarán en el resumen de validación.'
            : 'Marque variables como "claves" y defina cuántos valores únicos deben tener y qué valores son válidos. Útil para verificar columnas como "Clave", "Respuesta Correcta", etc.'}
        </Alert>

        {/* Información de instrumentos detectados */}
        {loadingInstruments ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Detectando instrumentos...
            </Typography>
          </Box>
        ) : detectedInstruments.length > 1 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              📊 Instrumentos detectados: {detectedInstruments.length}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {detectedInstruments.map(inst => (
                <Chip
                  key={inst.key}
                  label={`${inst.displayName} (${inst.itemCount} filas)`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* Configuración para item_id_vars */}
        {categoryType === 'item_id_vars' && (
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
              Validación de Conteo de Ítems
            </Typography>

            <FormLabel component="legend" sx={{ mb: 1 }}>Aplicar a:</FormLabel>
            <RadioGroup
              value={itemCountScope}
              onChange={(e) => setItemCountScope(e.target.value as 'global' | 'specific')}
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                value="global"
                control={<Radio size="small" />}
                label="Global (todos los instrumentos deben tener la misma cantidad)"
              />
              {detectedInstruments.length > 1 && (
                <FormControlLabel
                  value="specific"
                  control={<Radio size="small" />}
                  label="Específico por instrumento (configurar cantidad para cada uno)"
                />
              )}
            </RadioGroup>

            <Divider sx={{ my: 2 }} />

            {itemCountScope === 'global' ? (
              <TextField
                fullWidth
                type="number"
                label="Cantidad esperada de ítems"
                value={globalItemCount}
                onChange={(e) => setGlobalItemCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                helperText="Número exacto de ítems (filas) que debe tener cada instrumento"
                size="small"
              />
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Configure la cantidad esperada de ítems para cada instrumento:
                </Typography>
                {detectedInstruments.map((inst) => (
                  <Box key={inst.key} sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={inst.displayName}
                      value={specificItemCounts[inst.key]?.expectedItemCount || ''}
                      onChange={(e) => handleSpecificItemCountChange(inst.key, e.target.value)}
                      helperText={`Actualmente tiene ${inst.itemCount} ítems`}
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        )}

        {/* Configuración para metadata_vars */}
        {categoryType === 'metadata_vars' && (
          <>
            {availableVariables.map((varName) => (
              <Paper key={varName} elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                  {varName}
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={variableConfigs[varName]?.isKeyVariable || false}
                      onChange={(e) => handleKeyVariableToggle(varName, e.target.checked)}
                    />
                  }
                  label="¿Es variable de claves?"
                />

                {variableConfigs[varName]?.isKeyVariable && (
                  <Box sx={{ mt: 2, pl: 0 }}>
                    {/* Selector de Scope */}
                    <FormLabel component="legend" sx={{ mb: 1 }}>Aplicar a:</FormLabel>
                    <RadioGroup
                      value={variableConfigs[varName]?.scope || 'global'}
                      onChange={(e) => handleScopeChange(varName, e.target.value as 'global' | 'specific')}
                      sx={{ mb: 2 }}
                    >
                      <FormControlLabel
                        value="global"
                        control={<Radio size="small" />}
                        label="Global (todos los instrumentos)"
                      />
                      {detectedInstruments.length > 1 && (
                        <FormControlLabel
                          value="specific"
                          control={<Radio size="small" />}
                          label="Específico por instrumento"
                        />
                      )}
                    </RadioGroup>

                    {/* Selector de instrumento específico */}
                    {variableConfigs[varName]?.scope === 'specific' && detectedInstruments.length > 1 && (
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={variableConfigs[varName]?.specificInstrument || ''}
                        onChange={(e) => handleSpecificInstrumentChange(varName, e.target.value)}
                        SelectProps={{ native: true }}
                        sx={{ mb: 2 }}
                      >
                        {detectedInstruments.map(inst => (
                          <option key={inst.key} value={inst.key}>
                            {inst.displayName} ({inst.itemCount} filas)
                          </option>
                        ))}
                      </TextField>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <TextField
                      fullWidth
                      type="number"
                      label="Número de claves esperadas"
                      value={variableConfigs[varName]?.expectedKeyCount || ''}
                      onChange={(e) => handleKeyCountChange(varName, e.target.value)}
                      helperText="Cantidad de valores únicos que debe tener esta variable"
                      size="small"
                      sx={{ mb: 2 }}
                    />

                    <Box>
                      <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>
                        Valores esperados:
                      </Typography>

                      {/* Input para agregar nuevos valores */}
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Escriba un valor (ej: A, 1, Masculino)"
                          value={tempInputValues[varName] || ''}
                          onChange={(e) => setTempInputValues(prev => ({ ...prev, [varName]: e.target.value }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddExpectedValue(varName);
                            }
                          }}
                        />
                        <IconButton
                          color="primary"
                          onClick={() => handleAddExpectedValue(varName)}
                          disabled={!tempInputValues[varName]?.trim()}
                        >
                          <Add />
                        </IconButton>
                      </Stack>

                      {/* Lista de valores agregados */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {(variableConfigs[varName]?.expectedValues || []).map((value, index) => (
                          <Chip
                            key={index}
                            label={value}
                            color="primary"
                            size="small"
                            onDelete={() => handleRemoveExpectedValue(varName, value)}
                          />
                        ))}
                        {(variableConfigs[varName]?.expectedValues || []).length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No hay valores configurados
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Paper>
            ))}
          </>
        )}

        {availableVariables.length === 0 && categoryType === 'metadata_vars' && (
          <Alert severity="warning">
            No hay variables disponibles en esta categoría. Primero asigne variables a la categoría "metadata_vars".
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleClearAll}
          startIcon={<Delete />}
          disabled={!hasAnyConfiguration()}
        >
          Limpiar Todo
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedOptionsModal;
