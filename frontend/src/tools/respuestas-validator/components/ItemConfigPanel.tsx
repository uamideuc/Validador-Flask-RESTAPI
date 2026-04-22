import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Chip,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge
} from '@mui/material';
import {
  Settings,
  CheckCircle,
  Warning,
  Edit,
  ContentCopy,
  Close
} from '@mui/icons-material';
import { RespuestasItemConfig } from '../../../core/ToolStateContext';

interface Variable {
  name: string;
  sampleValues: string[];
}

interface ItemConfigPanelProps {
  responseVariables: Variable[];
  itemConfigs: RespuestasItemConfig[];
  onConfigsChange: (configs: RespuestasItemConfig[]) => void;
}

interface SingleItemConfigDialogProps {
  open: boolean;
  variable: Variable | null;
  config: RespuestasItemConfig | null;
  onSave: (config: RespuestasItemConfig) => void;
  onClose: () => void;
}

const SingleItemConfigDialog: React.FC<SingleItemConfigDialogProps> = ({
  open,
  variable,
  config,
  onSave,
  onClose
}) => {
  const [validValuesText, setValidValuesText] = useState(
    config?.valid_values?.join(', ') || ''
  );
  const [missingValuesText, setMissingValuesText] = useState(
    config?.missing_values?.join(', ') || ''
  );
  const [missingIncludesEmpty, setMissingIncludesEmpty] = useState(
    config?.missing_includes_empty || false
  );

  React.useEffect(() => {
    if (config) {
      setValidValuesText(config.valid_values?.join(', ') || '');
      setMissingValuesText(config.missing_values?.join(', ') || '');
      setMissingIncludesEmpty(config.missing_includes_empty || false);
    } else {
      setValidValuesText('');
      setMissingValuesText('');
      setMissingIncludesEmpty(false);
    }
  }, [config, open]);

  if (!variable) return null;

  const parseValues = (text: string): string[] => {
    return text
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);
  };

  const handleSave = () => {
    onSave({
      variable: variable.name,
      valid_values: parseValues(validValuesText),
      missing_values: parseValues(missingValuesText),
      missing_includes_empty: missingIncludesEmpty
    });
  };

  const hasMissingDeclared = missingIncludesEmpty || parseValues(missingValuesText).length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Settings color="primary" />
            <Typography variant="h6">Configurar: {variable.name}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {variable.sampleValues.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Valores de muestra:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {variable.sampleValues.slice(0, 10).map((v, i) => (
                <Chip key={i} label={v || '(vacío)'} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <TextField
          fullWidth
          label="Valores válidos"
          helperText="Separados por coma. Ej: 1, 2, 3, 4, 5 o a, b, c, d"
          value={validValuesText}
          onChange={(e) => setValidValuesText(e.target.value)}
          sx={{ mb: 3 }}
          multiline
          minRows={2}
        />

        <TextField
          fullWidth
          label="Valores missing"
          helperText="Separados por coma. Ej: 97, 98, 99"
          value={missingValuesText}
          onChange={(e) => setMissingValuesText(e.target.value)}
          sx={{ mb: 2 }}
          multiline
          minRows={2}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={missingIncludesEmpty}
              onChange={(e) => setMissingIncludesEmpty(e.target.checked)}
            />
          }
          label="Celdas vacías son missing"
        />

        {!hasMissingDeclared && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Debes declarar al menos un tipo de valor missing para este ítem.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!hasMissingDeclared}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface BatchConfigDialogProps {
  open: boolean;
  variables: Variable[];
  onApply: (validValues: string[], missingValues: string[], missingIncludesEmpty: boolean) => void;
  onClose: () => void;
}

const BatchConfigDialog: React.FC<BatchConfigDialogProps> = ({
  open,
  variables,
  onApply,
  onClose
}) => {
  const [validValuesText, setValidValuesText] = useState('');
  const [missingValuesText, setMissingValuesText] = useState('');
  const [missingIncludesEmpty, setMissingIncludesEmpty] = useState(false);

  React.useEffect(() => {
    if (open) {
      setValidValuesText('');
      setMissingValuesText('');
      setMissingIncludesEmpty(false);
    }
  }, [open]);

  const parseValues = (text: string): string[] => {
    return text.split(',').map(v => v.trim()).filter(v => v.length > 0);
  };

  const hasMissingDeclared = missingIncludesEmpty || parseValues(missingValuesText).length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ContentCopy color="primary" />
          <Typography variant="h6">
            Configurar {variables.length} ítems en lote
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta configuración se aplicará a los {variables.length} ítems seleccionados.
          Los ítems que ya tengan configuración serán sobreescritos.
        </Alert>

        <TextField
          fullWidth
          label="Valores válidos (para todos)"
          helperText="Separados por coma. Ej: 1, 2, 3, 4, 5"
          value={validValuesText}
          onChange={(e) => setValidValuesText(e.target.value)}
          sx={{ mb: 3 }}
          multiline
          minRows={2}
        />

        <TextField
          fullWidth
          label="Valores missing (para todos)"
          helperText="Separados por coma. Ej: 97, 98, 99"
          value={missingValuesText}
          onChange={(e) => setMissingValuesText(e.target.value)}
          sx={{ mb: 2 }}
          multiline
          minRows={2}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={missingIncludesEmpty}
              onChange={(e) => setMissingIncludesEmpty(e.target.checked)}
            />
          }
          label="Celdas vacías son missing"
        />

        {!hasMissingDeclared && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Debes declarar al menos un tipo de valor missing.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => onApply(parseValues(validValuesText), parseValues(missingValuesText), missingIncludesEmpty)}
          disabled={!hasMissingDeclared}
        >
          Aplicar a {variables.length} ítems
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ItemConfigPanel: React.FC<ItemConfigPanelProps> = ({
  responseVariables,
  itemConfigs,
  onConfigsChange
}) => {
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());

  const getConfig = (varName: string): RespuestasItemConfig | undefined => {
    return itemConfigs.find(c => c.variable === varName);
  };

  const isConfigured = (varName: string): boolean => {
    const config = getConfig(varName);
    if (!config) return false;
    return config.missing_includes_empty || config.missing_values.length > 0;
  };

  const handleSaveConfig = (config: RespuestasItemConfig) => {
    const newConfigs = itemConfigs.filter(c => c.variable !== config.variable);
    newConfigs.push(config);
    onConfigsChange(newConfigs);
    setEditingVariable(null);
  };

  const handleBatchApply = (validValues: string[], missingValues: string[], missingIncludesEmpty: boolean) => {
    const variablesToConfigure = selectedForBatch.size > 0
      ? Array.from(selectedForBatch)
      : responseVariables.map(v => v.name);

    const newConfigs = [...itemConfigs.filter(c => !variablesToConfigure.includes(c.variable))];

    variablesToConfigure.forEach(varName => {
      newConfigs.push({
        variable: varName,
        valid_values: validValues,
        missing_values: missingValues,
        missing_includes_empty: missingIncludesEmpty
      });
    });

    onConfigsChange(newConfigs);
    setShowBatchDialog(false);
    setSelectedForBatch(new Set());
  };

  const toggleBatchSelect = (varName: string) => {
    setSelectedForBatch(prev => {
      const next = new Set(prev);
      if (next.has(varName)) next.delete(varName);
      else next.add(varName);
      return next;
    });
  };

  const configuredCount = responseVariables.filter(v => isConfigured(v.name)).length;
  const allConfigured = configuredCount === responseVariables.length;

  if (responseVariables.length === 0) return null;

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">
            Configuración de Ítems ({configuredCount}/{responseVariables.length})
          </Typography>
          <Box display="flex" gap={1}>
            {selectedForBatch.size > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setSelectedForBatch(new Set())}
              >
                Limpiar ({selectedForBatch.size})
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              startIcon={<ContentCopy />}
              onClick={() => setShowBatchDialog(true)}
            >
              {selectedForBatch.size > 0
                ? `Config Lote (${selectedForBatch.size})`
                : 'Config Lote (todos)'}
            </Button>
          </Box>
        </Box>

        {!allConfigured && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Todos los ítems deben tener missing declarado antes de validar.
            Puedes usar "Config Lote" para configurar varios a la vez.
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Haz clic en un ítem para configurar sus valores válidos y missing.
          Selecciona varios (checkbox) para configurarlos en lote.
        </Typography>

        <List dense>
          {responseVariables.map((variable) => {
            const config = getConfig(variable.name);
            const configured = isConfigured(variable.name);

            return (
              <ListItem
                key={variable.name}
                sx={{
                  border: '1px solid',
                  borderColor: configured ? 'success.light' : 'warning.light',
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => setEditingVariable(variable)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    size="small"
                    checked={selectedForBatch.has(variable.name)}
                    onChange={() => toggleBatchSelect(variable.name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </ListItemIcon>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {configured
                    ? <CheckCircle color="success" fontSize="small" />
                    : <Warning color="warning" fontSize="small" />
                  }
                </ListItemIcon>
                <ListItemText
                  primary={variable.name}
                  secondary={
                    configured
                      ? `Válidos: [${config!.valid_values.join(', ')}] | Missing: [${
                          [...config!.missing_values, ...(config!.missing_includes_empty ? ['vacío'] : [])].join(', ')
                        }]`
                      : 'Sin configurar — haz clic en el lápiz'
                  }
                  onClick={() => setEditingVariable(variable)}
                  sx={{ cursor: 'pointer' }}
                />
              </ListItem>
            );
          })}
        </List>
      </Paper>

      <SingleItemConfigDialog
        open={!!editingVariable}
        variable={editingVariable}
        config={editingVariable ? getConfig(editingVariable.name) || null : null}
        onSave={handleSaveConfig}
        onClose={() => setEditingVariable(null)}
      />

      <BatchConfigDialog
        open={showBatchDialog}
        variables={
          selectedForBatch.size > 0
            ? responseVariables.filter(v => selectedForBatch.has(v.name))
            : responseVariables
        }
        onApply={handleBatchApply}
        onClose={() => setShowBatchDialog(false)}
      />
    </Box>
  );
};

export default ItemConfigPanel;
