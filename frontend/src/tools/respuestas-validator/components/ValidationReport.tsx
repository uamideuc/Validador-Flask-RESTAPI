import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Download,
  ContentCopy,
  People,
  ViewColumn,
  Assessment
} from '@mui/icons-material';

interface ResponseTypeInfo {
  id: string;
  label: string;
  valid_values: string[];
  missing_values: string[];
  missing_includes_empty: boolean;
  item_names: string[];
}

interface ValidationReportProps {
  validationData: any;
  savedCategorization?: any;
  onExport: (exportType: string) => void;
  isLoading?: boolean;
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { color: any; icon: React.ReactElement; label: string }> = {
    success: { color: 'success', icon: <CheckCircle fontSize="small" />, label: 'Sin problemas' },
    warning: { color: 'warning', icon: <Warning fontSize="small" />, label: 'Advertencias' },
    error: { color: 'error', icon: <ErrorIcon fontSize="small" />, label: 'Errores encontrados' },
  };
  const c = config[status] || config.error;
  return <Chip icon={c.icon} label={c.label} color={c.color} size="small" />;
};

const CheckSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  result: any;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}> = ({ title, icon, result, children, defaultExpanded }) => {
  const hasErrors = result?.errors?.length > 0;
  const hasWarnings = result?.warnings?.length > 0;

  let borderColor = '#4caf50';
  if (hasErrors) borderColor = '#f44336';
  else if (hasWarnings) borderColor = '#ff9800';

  return (
    <Accordion defaultExpanded={defaultExpanded || hasErrors || hasWarnings}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box display="flex" alignItems="center" gap={1} width="100%">
          <Box sx={{ color: borderColor }}>{icon}</Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flex: 1 }}>
            {title}
          </Typography>
          {result?.is_valid === false && <Chip label="Error" color="error" size="small" />}
          {result?.is_valid !== false && hasWarnings && <Chip label="Advertencia" color="warning" size="small" />}
          {result?.is_valid !== false && !hasWarnings && <Chip label="OK" color="success" size="small" />}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {result?.errors?.map((err: any, i: number) => (
          <Alert key={`err-${i}`} severity="error" sx={{ mb: 1 }}>
            {err.message}
          </Alert>
        ))}
        {result?.warnings?.map((warn: any, i: number) => (
          <Alert key={`warn-${i}`} severity="warning" sx={{ mb: 1 }}>
            {warn.message}
          </Alert>
        ))}
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

const ValidationReport: React.FC<ValidationReportProps> = ({
  validationData,
  savedCategorization,
  onExport,
  isLoading
}) => {
  const [loadingExport, setLoadingExport] = useState<string | null>(null);

  const handleExport = async (exportType: string) => {
    setLoadingExport(exportType);
    try {
      await onExport(exportType);
    } finally {
      setLoadingExport(null);
    }
  };

  if (!validationData) return null;

  const summary = validationData.summary;
  const dupResult = validationData.duplicate_validation;
  const rangeResult = validationData.response_range_validation;
  const missingResult = validationData.missing_patterns_validation;
  const varResult = validationData.variability_validation;
  const dupNamesResult = validationData.duplicate_names_validation;
  const identicalResult = validationData.identical_columns_validation;
  const exportOptions = validationData.export_options || [];

  const responseTypes: ResponseTypeInfo[] = savedCategorization?.response_types ?? [];
  const itemToType = new Map<string, ResponseTypeInfo>();
  for (const t of responseTypes) {
    for (const name of t.item_names) itemToType.set(name, t);
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Reporte de Validación</Typography>

      {/* Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">Resumen General</Typography>
            <Typography variant="body2" color="text.secondary">
              {summary?.total_items} participantes analizados
            </Typography>
          </Box>
          <StatusChip status={summary?.validation_status || 'error'} />
        </Box>
      </Paper>

      {/* Check 1: Duplicates */}
      <CheckSection
        title="Duplicados de ID"
        icon={<People />}
        result={dupResult}
      >
        {dupResult?.statistics && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              IDs duplicados (valores distintos): <strong>{dupResult.statistics.simple_dup_groups || 0}</strong> grupo(s)
            </Typography>
            <Typography variant="body2">
              Filas clonadas (completamente idénticas): <strong>{dupResult.statistics.clone_groups || 0}</strong> grupo(s)
            </Typography>

            {dupResult.simple_duplicates?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>IDs con valores distintos:</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Repeticiones</TableCell>
                        <TableCell>Filas</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dupResult.simple_duplicates.slice(0, 20).map((dup: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{Object.values(dup.id_values).join(' | ')}</TableCell>
                          <TableCell>{dup.count}</TableCell>
                          <TableCell>{dup.row_indices?.slice(0, 5).join(', ')}{dup.row_indices?.length > 5 ? '...' : ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {dupResult.clone_duplicates?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Filas completamente idénticas (clones):</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Copias</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dupResult.clone_duplicates.slice(0, 15).map((dup: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{Object.values(dup.id_values).join(' | ')}</TableCell>
                          <TableCell>{dup.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </CheckSection>

      {/* Check 2: Response Range */}
      <CheckSection
        title="Rango de Respuestas"
        icon={<Assessment />}
        result={rangeResult}
      >
        {rangeResult?.statistics && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              Ítems verificados: <strong>{rangeResult.statistics.items_checked || 0}</strong>
              {' | '}Con problemas: <strong>{rangeResult.statistics.items_with_issues || 0}</strong>
              {' | '}Celdas fuera de rango: <strong>{rangeResult.statistics.total_out_of_range_cells || 0}</strong>
            </Typography>

            {responseTypes.length > 0 ? (() => {
              const byItem = rangeResult.out_of_range_by_item || {};
              const allTypedItems = new Set(responseTypes.flatMap(t => t.item_names));
              const untypedWithIssues = Object.keys(byItem).filter(n => !allTypedItems.has(n));

              return (
                <>
                  {/* Tabla resumen por tipo */}
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tipo</TableCell>
                          <TableCell align="right">Ítems</TableCell>
                          <TableCell align="right">Con problemas</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {responseTypes.map(t => {
                          const issueCount = t.item_names.filter(n => !!byItem[n]).length;
                          return (
                            <TableRow key={t.id}>
                              <TableCell>{t.label}</TableCell>
                              <TableCell align="right">{t.item_names.length}</TableCell>
                              <TableCell align="right">
                                {issueCount > 0
                                  ? <Chip label={issueCount} size="small" color="warning" />
                                  : <Chip label="✓" size="small" color="success" />}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {untypedWithIssues.length > 0 && (
                          <TableRow>
                            <TableCell sx={{ fontStyle: 'italic', color: 'text.secondary' }}>Sin tipo asignado</TableCell>
                            <TableCell align="right">—</TableCell>
                            <TableCell align="right">
                              <Chip label={untypedWithIssues.length} size="small" color="warning" />
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Tabla detalle agrupada por tipo */}
                  {Object.keys(byItem).length > 0 && (
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Ítem</TableCell>
                            <TableCell>Fuera de rango</TableCell>
                            <TableCell>%</TableCell>
                            <TableCell>Valores inválidos</TableCell>
                            <TableCell>Valores válidos</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {responseTypes.map(t => {
                            const itemsWithIssues = t.item_names.filter(n => !!byItem[n]);
                            return (
                              <React.Fragment key={t.id}>
                                <TableRow>
                                  <TableCell
                                    colSpan={5}
                                    sx={{ backgroundColor: 'grey.100', fontWeight: 'bold', fontSize: '0.75rem', color: 'text.secondary', py: 0.75 }}
                                  >
                                    {t.label}{t.valid_values.length > 0 && ` — válidos: ${t.valid_values.join(', ')}`}
                                  </TableCell>
                                </TableRow>
                                {itemsWithIssues.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ color: 'success.main', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                      ✓ Sin problemas
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  itemsWithIssues.map(item => {
                                    const data = byItem[item];
                                    return (
                                      <TableRow key={item}>
                                        <TableCell>{item}</TableCell>
                                        <TableCell>{data.count}</TableCell>
                                        <TableCell>{data.percentage}%</TableCell>
                                        <TableCell>
                                          {Object.entries(data.invalid_values || {}).slice(0, 5).map(([val, cnt]: [string, any]) => (
                                            <Chip key={val} label={`${val} (${cnt})`} size="small" color="error" variant="outlined" sx={{ m: 0.25 }} />
                                          ))}
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="caption">{(data.valid_values || []).join(', ')}</Typography>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}
                              </React.Fragment>
                            );
                          })}
                          {untypedWithIssues.length > 0 && (
                            <React.Fragment>
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  sx={{ backgroundColor: 'grey.100', fontWeight: 'bold', fontSize: '0.75rem', color: 'text.secondary', py: 0.75 }}
                                >
                                  Sin tipo asignado
                                </TableCell>
                              </TableRow>
                              {untypedWithIssues.map(item => {
                                const data = byItem[item];
                                return (
                                  <TableRow key={item}>
                                    <TableCell>{item}</TableCell>
                                    <TableCell>{data.count}</TableCell>
                                    <TableCell>{data.percentage}%</TableCell>
                                    <TableCell>
                                      {Object.entries(data.invalid_values || {}).slice(0, 5).map(([val, cnt]: [string, any]) => (
                                        <Chip key={val} label={`${val} (${cnt})`} size="small" color="error" variant="outlined" sx={{ m: 0.25 }} />
                                      ))}
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption">—</Typography>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </React.Fragment>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              );
            })() : (
              Object.keys(rangeResult.out_of_range_by_item || {}).length > 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Ítem</TableCell>
                        <TableCell>Fuera de rango</TableCell>
                        <TableCell>%</TableCell>
                        <TableCell>Valores inválidos</TableCell>
                        <TableCell>Valores válidos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(rangeResult.out_of_range_by_item).map(([item, data]: [string, any]) => (
                        <TableRow key={item}>
                          <TableCell>{item}</TableCell>
                          <TableCell>{data.count}</TableCell>
                          <TableCell>{data.percentage}%</TableCell>
                          <TableCell>
                            {Object.entries(data.invalid_values || {}).slice(0, 5).map(([val, cnt]: [string, any]) => (
                              <Chip key={val} label={`${val} (${cnt})`} size="small" color="error" variant="outlined" sx={{ m: 0.25 }} />
                            ))}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{(data.valid_values || []).join(', ')}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            )}
          </Box>
        )}
      </CheckSection>

      {/* Check 3: Missing Patterns */}
      <CheckSection
        title="Patrones de Missing"
        icon={<ViewColumn />}
        result={missingResult}
      >
        {missingResult?.statistics && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              Missing total: <strong>{missingResult.statistics.overall_missing_percentage || 0}%</strong>
              {' | '}Ítems con missing: <strong>{missingResult.statistics.items_with_any_missing || 0}</strong>
              {' | '}Participantes con missing excesivo: <strong>{missingResult.statistics.participants_with_excessive_missing || 0}</strong>
            </Typography>

            {missingResult.missing_by_participant?.participants_with_excessive_missing > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Participantes con &gt;{missingResult.missing_by_participant.threshold}% de missing:
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fila</TableCell>
                        <TableCell>ID</TableCell>
                        <TableCell>Missing</TableCell>
                        <TableCell>%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(missingResult.missing_by_participant.details || []).slice(0, 20).map((p: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{p.row_index}</TableCell>
                          <TableCell>{Object.values(p.participant_id || {}).join(' | ')}</TableCell>
                          <TableCell>{p.missing_count}/{p.total_items}</TableCell>
                          <TableCell>{p.percentage}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </CheckSection>

      {/* Check 4: Variability */}
      <CheckSection
        title="Variabilidad (Quasi-constantes)"
        icon={<Assessment />}
        result={varResult}
      >
        {varResult?.statistics && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              Columnas analizadas: <strong>{varResult.statistics.total_columns_checked || 0}</strong>
              {' | '}Constantes: <strong>{varResult.statistics.constant_columns || 0}</strong>
              {' | '}Quasi-constantes: <strong>{varResult.statistics.quasi_constant_columns || 0}</strong>
            </Typography>

            {(varResult.constant_columns?.length > 0 || varResult.quasi_constant_columns?.length > 0) && (
              <List dense sx={{ mt: 1 }}>
                {varResult.constant_columns?.map((c: any, i: number) => (
                  <ListItem key={`const-${i}`}>
                    <ListItemIcon><ErrorIcon color="warning" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary={`${c.column} — constante`}
                      secondary={`Único valor: "${c.value}" (${c.count} filas)`}
                    />
                  </ListItem>
                ))}
                {varResult.quasi_constant_columns?.map((c: any, i: number) => (
                  <ListItem key={`quasi-${i}`}>
                    <ListItemIcon><Warning color="warning" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary={`${c.column} — quasi-constante`}
                      secondary={`Valor dominante: "${c.dominant_value}" (${c.dominant_percentage}%, ${c.unique_values} valores únicos)`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </CheckSection>

      {/* Check 5: Duplicate Names */}
      <CheckSection
        title="Nombres de Variables Repetidos"
        icon={<ContentCopy />}
        result={dupNamesResult}
      >
        {dupNamesResult?.duplicate_groups?.length > 0 ? (
          <List dense>
            {dupNamesResult.duplicate_groups.map((g: any, i: number) => (
              <ListItem key={i}>
                <ListItemIcon><Warning color="warning" fontSize="small" /></ListItemIcon>
                <ListItemText
                  primary={`"${g.name}" aparece ${g.count} veces`}
                  secondary={`Columnas: ${g.column_indices.join(', ')}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">No se encontraron nombres repetidos.</Typography>
        )}
      </CheckSection>

      {/* Check 6: Identical Columns */}
      <CheckSection
        title="Columnas Idénticas"
        icon={<ViewColumn />}
        result={identicalResult}
      >
        {identicalResult?.identical_pairs?.length > 0 ? (
          <List dense>
            {identicalResult.identical_pairs.map((p: any, i: number) => (
              <ListItem key={i}>
                <ListItemIcon><Warning color="warning" fontSize="small" /></ListItemIcon>
                <ListItemText
                  primary={`Columnas idénticas: ${p.columns.join(', ')}`}
                  secondary={`${p.count} columnas con exactamente los mismos valores`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">No se encontraron columnas idénticas.</Typography>
        )}
      </CheckSection>

      {/* Export buttons */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Exportar Resultados</Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          {exportOptions.map((option: any) => {
            const active = loadingExport === option.type;
            const disabled = loadingExport !== null || !!isLoading;

            return (
              <Button
                key={option.type}
                variant="contained"
                color={option.type === 'validation_report_pdf' ? 'secondary' : 'primary'}
                startIcon={active ? <CircularProgress size={20} color="inherit" /> : <Download />}
                onClick={() => handleExport(option.type)}
                disabled={disabled}
              >
                {active ? 'Generando...' : option.name}
              </Button>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

export default ValidationReport;
