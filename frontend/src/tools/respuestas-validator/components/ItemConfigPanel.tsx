import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Close,
  AutoFixHigh,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { RespuestasItemConfig } from '../../../core/ToolStateContext';

interface Variable {
  name: string;
  sampleValues: string[];
}

interface ResponseType {
  id: string;
  label: string;
  valid_values: string[];
  missing_values: string[];
  missing_includes_empty: boolean;
}

interface ItemConfigPanelProps {
  responseVariables: Variable[];
  itemConfigs: RespuestasItemConfig[];
  onConfigsChange: (configs: RespuestasItemConfig[]) => void;
}

// ── Dialogs ────────────────────────────────────────────────────────────────

interface TypeDialogProps {
  open: boolean;
  initial?: ResponseType | null;
  onSave: (type: ResponseType) => void;
  onClose: () => void;
}

const TypeDialog: React.FC<TypeDialogProps> = ({ open, initial, onSave, onClose }) => {
  const [label, setLabel] = useState(initial?.label || '');
  const [validText, setValidText] = useState(initial?.valid_values.join(', ') || '');
  const [missingText, setMissingText] = useState(initial?.missing_values.join(', ') || '');
  const [missingEmpty, setMissingEmpty] = useState(initial?.missing_includes_empty || false);

  React.useEffect(() => {
    if (open) {
      setLabel(initial?.label || '');
      setValidText(initial?.valid_values.join(', ') || '');
      setMissingText(initial?.missing_values.join(', ') || '');
      setMissingEmpty(initial?.missing_includes_empty || false);
    }
  }, [open, initial]);

  const parseCSV = (text: string) =>
    text.split(',').map(v => v.trim()).filter(v => v.length > 0);

  const hasMissing = missingEmpty || parseCSV(missingText).length > 0;

  const handleSave = () => {
    onSave({
      id: initial?.id || `type_${Date.now()}`,
      label: label.trim() || `Tipo ${Date.now()}`,
      valid_values: parseCSV(validText),
      missing_values: parseCSV(missingText),
      missing_includes_empty: missingEmpty,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{initial ? 'Editar tipo' : 'Nuevo tipo de respuesta'}</Typography>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Nombre del tipo (opcional)"
          placeholder="Ej: Likert 1-4, Binario, Escala 1-5"
          value={label}
          onChange={e => setLabel(e.target.value)}
          sx={{ mb: 3, mt: 1 }}
          helperText="Si lo dejas vacío se asigna un nombre automático"
        />
        <TextField
          fullWidth
          label="Valores válidos"
          helperText="Separados por coma. Ej: 1, 2, 3, 4"
          value={validText}
          onChange={e => setValidText(e.target.value)}
          multiline
          minRows={2}
          sx={{ mb: 3 }}
        />
        <TextField
          fullWidth
          label="Valores missing"
          helperText="Separados por coma. Ej: 97, 98, 99"
          value={missingText}
          onChange={e => setMissingText(e.target.value)}
          multiline
          minRows={2}
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={<Checkbox checked={missingEmpty} onChange={e => setMissingEmpty(e.target.checked)} />}
          label="Celdas vacías son missing"
        />
        {!hasMissing && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Debes declarar al menos un tipo de valor missing.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!hasMissing}>
          {initial ? 'Guardar cambios' : 'Crear tipo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface AssignDialogProps {
  open: boolean;
  typeName: string;
  allVariables: Variable[];
  assignedItems: Set<string>; // items ya asignados a ESTE tipo
  onConfirm: (selected: string[]) => void;
  onClose: () => void;
}

const AssignDialog: React.FC<AssignDialogProps> = ({
  open, typeName, allVariables, assignedItems, onConfirm, onClose
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedItems));

  React.useEffect(() => {
    if (open) setSelected(new Set(assignedItems));
  }, [open, assignedItems]);

  const toggle = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === allVariables.length) setSelected(new Set());
    else setSelected(new Set(allVariables.map(v => v.name)));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Asignar ítems — {typeName}</Typography>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {selected.size} de {allVariables.length} seleccionados
          </Typography>
          <Button size="small" onClick={toggleAll}>
            {selected.size === allVariables.length ? 'Quitar todos' : 'Seleccionar todos'}
          </Button>
        </Box>
        <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
          {allVariables.map(variable => (
            <ListItem
              key={variable.name}
              button
              onClick={() => toggle(variable.name)}
              sx={{ borderRadius: 1, mb: 0.5, '&:hover': { backgroundColor: 'action.hover' } }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox size="small" checked={selected.has(variable.name)} tabIndex={-1} disableRipple />
              </ListItemIcon>
              <ListItemText
                primary={variable.name}
                secondary={
                  variable.sampleValues.length > 0
                    ? `Muestra: ${variable.sampleValues.slice(0, 8).join(', ')}`
                    : undefined
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onConfirm(Array.from(selected))}>
          Confirmar ({selected.size} ítems)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Auto-detection ─────────────────────────────────────────────────────────

function detectGroups(variables: Variable[]): Array<{ label: string; valid_values: string[]; names: string[] }> {
  // Group variables by their unique set of sample values (excluding likely missing codes > 90)
  const groupMap = new Map<string, { vals: string[]; names: string[] }>();

  for (const v of variables) {
    const cleaned = v.sampleValues
      .map(s => s.trim())
      .filter(s => s !== '' && s !== 'nan' && s !== 'NaN')
      .filter(s => {
        const n = Number(s);
        return isNaN(n) || n <= 90;
      });
    const sorted = Array.from(new Set(cleaned)).sort();
    const key = sorted.join('|');
    if (!key) continue;
    if (!groupMap.has(key)) groupMap.set(key, { vals: sorted, names: [] });
    groupMap.get(key)!.names.push(v.name);
  }

  return Array.from(groupMap.values())
    .filter(g => g.names.length > 0)
    .map(g => ({
      label: `Escala ${g.vals.join(', ')}`,
      valid_values: g.vals,
      names: g.names,
    }))
    .sort((a, b) => b.names.length - a.names.length); // most-used first
}

interface AutoDetectDialogProps {
  open: boolean;
  variables: Variable[];
  onApply: (types: Array<{ label: string; valid_values: string[]; names: string[] }>) => void;
  onClose: () => void;
}

const AutoDetectDialog: React.FC<AutoDetectDialogProps> = ({ open, variables, onApply, onClose }) => {
  const groups = useMemo(() => detectGroups(variables), [variables]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (open) setSelected(new Set(groups.map((_, i) => i)));
  }, [open, groups]);

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Auto-detectar grupos</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            No hay suficientes datos de muestra para detectar grupos automáticamente.
            Crea los tipos manualmente con el botón "+ Nuevo tipo".
          </Alert>
        </DialogContent>
        <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Auto-detectar grupos</Typography>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Grupos detectados por valores de muestra compartidos. Selecciona cuáles crear como tipos.
          Podrás editar los nombres, valores válidos y missing después.
        </Alert>
        <List dense>
          {groups.map((g, i) => (
            <ListItem
              key={i}
              button
              onClick={() => toggle(i)}
              sx={{ borderRadius: 1, mb: 1, border: '1px solid', borderColor: selected.has(i) ? 'primary.main' : 'divider' }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox size="small" checked={selected.has(i)} tabIndex={-1} disableRipple />
              </ListItemIcon>
              <ListItemText
                primary={`${g.label} — ${g.names.length} ítem${g.names.length !== 1 ? 's' : ''}`}
                secondary={g.names.join(', ')}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => onApply(groups.filter((_, i) => selected.has(i)))}
          disabled={selected.size === 0}
        >
          Crear {selected.size} tipo{selected.size !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

const ItemConfigPanel: React.FC<ItemConfigPanelProps> = ({
  responseVariables,
  itemConfigs,
  onConfigsChange,
}) => {
  const [types, setTypes] = useState<ResponseType[]>([]);
  // Map: variable name → type id
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    // Rebuild assignments from incoming itemConfigs if types were already initialised
    return {};
  });

  const [typeDialog, setTypeDialog] = useState<{ open: boolean; editing?: ResponseType }>({ open: false });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; typeId: string } | null>(null);
  const [autoDetectOpen, setAutoDetectOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const varMap = useMemo(() => {
    const m: Record<string, Variable> = {};
    for (const v of responseVariables) m[v.name] = v;
    return m;
  }, [responseVariables]);

  // Sync itemConfigs → types+assignments when LdC pre-populates configs
  React.useEffect(() => {
    if (itemConfigs.length === 0 || types.length > 0) return;

    // Group incoming configs by their fingerprint (valid+missing signature)
    const fingerprints = new Map<string, { config: RespuestasItemConfig; names: string[] }>();
    for (const c of itemConfigs) {
      const fp = JSON.stringify({ v: [...c.valid_values].sort(), m: [...c.missing_values].sort(), e: c.missing_includes_empty });
      if (!fingerprints.has(fp)) fingerprints.set(fp, { config: c, names: [] });
      fingerprints.get(fp)!.names.push(c.variable);
    }

    const newTypes: ResponseType[] = [];
    const newAssignments: Record<string, string> = {};
    let idx = 1;
    for (const { config, names } of Array.from(fingerprints.values())) {
      const id = `type_ldc_${idx++}`;
      newTypes.push({
        id,
        label: `Tipo ${idx - 1} (LdC)`,
        valid_values: config.valid_values,
        missing_values: config.missing_values,
        missing_includes_empty: config.missing_includes_empty,
      });
      for (const name of names) newAssignments[name] = id;
    }
    setTypes(newTypes);
    setAssignments(newAssignments);
  }, [itemConfigs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep parent itemConfigs in sync whenever types or assignments change
  React.useEffect(() => {
    const configs: RespuestasItemConfig[] = [];
    for (const [varName, typeId] of Object.entries(assignments)) {
      const type = types.find(t => t.id === typeId);
      if (!type) continue;
      configs.push({
        variable: varName,
        valid_values: type.valid_values,
        missing_values: type.missing_values,
        missing_includes_empty: type.missing_includes_empty,
      });
    }
    onConfigsChange(configs);
  }, [types, assignments]); // eslint-disable-line react-hooks/exhaustive-deps

  const unassigned = responseVariables.filter(v => !assignments[v.name]);
  const configuredCount = responseVariables.filter(v => !!assignments[v.name]).length;
  const allConfigured = configuredCount === responseVariables.length && responseVariables.length > 0;

  // ── Type CRUD ─────────────────────────────────────────────────────────────

  const handleSaveType = (type: ResponseType) => {
    setTypes(prev => {
      const exists = prev.find(t => t.id === type.id);
      return exists ? prev.map(t => t.id === type.id ? type : t) : [...prev, type];
    });
    setTypeDialog({ open: false });
  };

  const handleDeleteType = (typeId: string) => {
    setTypes(prev => prev.filter(t => t.id !== typeId));
    setAssignments(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k] === typeId) delete next[k];
      }
      return next;
    });
    setDeleteConfirm(null);
  };

  const handleAssignConfirm = (typeId: string, selectedNames: string[]) => {
    const selectedSet = new Set(selectedNames);
    setAssignments(prev => {
      const next = { ...prev };
      // Remove items that were previously in this type but are no longer selected
      for (const [k, v] of Object.entries(next)) {
        if (v === typeId && !selectedSet.has(k)) delete next[k];
      }
      // Assign selected items to this type (overriding previous assignment)
      for (const name of selectedNames) next[name] = typeId;
      return next;
    });
    setAssignDialog(null);
  };

  const handleRemoveFromType = (varName: string) => {
    setAssignments(prev => {
      const next = { ...prev };
      delete next[varName];
      return next;
    });
  };

  const handleAutoDetectApply = (groups: Array<{ label: string; valid_values: string[]; names: string[] }>) => {
    const newTypes: ResponseType[] = groups.map(g => ({
      id: `type_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: g.label,
      valid_values: g.valid_values,
      missing_values: [],
      missing_includes_empty: false,
    }));
    const newAssignments: Record<string, string> = {};
    for (let i = 0; i < groups.length; i++) {
      for (const name of groups[i].names) newAssignments[name] = newTypes[i].id;
    }
    setTypes(prev => [...prev, ...newTypes]);
    setAssignments(prev => ({ ...prev, ...newAssignments }));
    setAutoDetectOpen(false);
  };

  if (responseVariables.length === 0) return null;

  const getAssignDialogType = () => types.find(t => t.id === assignDialog?.typeId);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">
              Configuración de Ítems
            </Typography>
            <Chip
              label={`${configuredCount}/${responseVariables.length}`}
              size="small"
              color={allConfigured ? 'success' : 'warning'}
            />
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="Detectar grupos automáticamente según valores de muestra">
              <Button
                size="small"
                variant="outlined"
                startIcon={<AutoFixHigh />}
                onClick={() => setAutoDetectOpen(true)}
              >
                Auto-detectar
              </Button>
            </Tooltip>
            <Button
              size="small"
              variant="contained"
              startIcon={<Add />}
              onClick={() => setTypeDialog({ open: true, editing: undefined })}
            >
              Nuevo tipo
            </Button>
          </Box>
        </Box>

        {!allConfigured && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Todos los ítems deben pertenecer a un tipo de respuesta antes de validar.
            Crea tipos y asigna los ítems sin configurar.
          </Alert>
        )}

        {/* Type groups */}
        {types.length === 0 && (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              Sin tipos definidos. Usa "Auto-detectar" o crea un tipo manualmente con "+ Nuevo tipo".
            </Typography>
          </Box>
        )}

        {types.map(type => {
          const assignedVarNames = responseVariables.filter(v => assignments[v.name] === type.id).map(v => v.name);
          const hasMissing = type.missing_includes_empty || type.missing_values.length > 0;

          return (
            <Paper
              key={type.id}
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                borderColor: hasMissing ? 'divider' : 'warning.main',
                borderWidth: hasMissing ? 1 : 2,
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {type.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Válidos:&nbsp;<strong>{type.valid_values.length > 0 ? type.valid_values.join(', ') : '—'}</strong>
                    &nbsp;&nbsp;Missing:&nbsp;<strong>
                      {[...type.missing_values, ...(type.missing_includes_empty ? ['vacío'] : [])].join(', ') || '—'}
                    </strong>
                    {!hasMissing && (
                      <Chip label="Falta declarar missing" color="warning" size="small" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                </Box>
                <Box display="flex" gap={0.5}>
                  <Tooltip title="Editar tipo">
                    <IconButton
                      size="small"
                      onClick={() => setTypeDialog({ open: true, editing: type })}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar tipo">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteConfirm(type.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Divider sx={{ mb: 1 }} />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minHeight: 36 }}>
                {assignedVarNames.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 0.5 }}>
                    Sin ítems asignados
                  </Typography>
                ) : (
                  assignedVarNames.map(name => (
                    <Chip
                      key={name}
                      label={name}
                      size="small"
                      onDelete={() => handleRemoveFromType(name)}
                      color="default"
                      variant="outlined"
                    />
                  ))
                )}
              </Box>

              <Box sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<Add />}
                  onClick={() => setAssignDialog({ open: true, typeId: type.id })}
                >
                  {assignedVarNames.length === 0 ? 'Asignar ítems' : 'Modificar ítems asignados'}
                </Button>
              </Box>
            </Paper>
          );
        })}

        {/* Unassigned section */}
        {unassigned.length > 0 && (
          <Paper
            variant="outlined"
            sx={{ p: 2, borderColor: 'warning.light', backgroundColor: 'warning.50' }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Warning color="warning" fontSize="small" />
              <Typography variant="subtitle2">
                Sin asignar ({unassigned.length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {unassigned.map(v => (
                <Chip
                  key={v.name}
                  label={v.name}
                  size="small"
                  variant="outlined"
                  color="warning"
                />
              ))}
            </Box>
          </Paper>
        )}

        {allConfigured && (
          <Box display="flex" alignItems="center" gap={1} mt={2}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2" color="success.main">
              Todos los ítems están configurados y listos para validar.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Dialogs */}
      <TypeDialog
        open={typeDialog.open}
        initial={typeDialog.editing}
        onSave={handleSaveType}
        onClose={() => setTypeDialog({ open: false })}
      />

      {assignDialog && getAssignDialogType() && (
        <AssignDialog
          open={assignDialog.open}
          typeName={getAssignDialogType()!.label}
          allVariables={responseVariables}
          assignedItems={new Set(responseVariables.filter(v => assignments[v.name] === assignDialog.typeId).map(v => v.name))}
          onConfirm={selected => handleAssignConfirm(assignDialog.typeId, selected)}
          onClose={() => setAssignDialog(null)}
        />
      )}

      <AutoDetectDialog
        open={autoDetectOpen}
        variables={responseVariables}
        onApply={handleAutoDetectApply}
        onClose={() => setAutoDetectOpen(false)}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Eliminar tipo?</DialogTitle>
        <DialogContent>
          <Typography>
            Los ítems asignados a este tipo quedarán sin configurar. Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirm && handleDeleteType(deleteConfirm)}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ItemConfigPanel;
