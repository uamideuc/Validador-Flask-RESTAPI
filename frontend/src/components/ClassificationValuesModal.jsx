import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';
import ApiService from '../core/api';

const ClassificationValuesModal = ({ 
  open, 
  onClose, 
  variable, 
  instrument, 
  sessionId, 
  validationSessionId 
}) => {
  const [valuesData, setValuesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVariableValues = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use ToolKit API endpoint with validationSessionId
      const response = await ApiService.getToolVariableValues('ensamblaje', validationSessionId, variable, instrument);
      
      if (response.success) {
        setValuesData(response.values_data);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al cargar valores de la variable';
      setError(errorMessage);
      
      // Show error without mock data - let user know authentication failed
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Acceso denegado. Es necesario ingresar la clave institucional.');
      }
    } finally {
      setLoading(false);
    }
  }, [variable, instrument, sessionId, validationSessionId]);

  useEffect(() => {
    if (open && variable && instrument && sessionId && validationSessionId) {
      fetchVariableValues();
    }
  }, [open, variable, instrument, sessionId, validationSessionId, fetchVariableValues]);

  const handleClose = () => {
    setValuesData(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6">
          Valores de la Variable: {variable}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Instrumento: {instrument}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Cargando valores de la variable...
            </Typography>
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {valuesData && (
          <Box>
            {/* Summary Stats */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Resumen Estadístico
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Chip 
                  label={`Total: ${valuesData.total_items} ítems`} 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label={`Valores únicos: ${valuesData.unique_values || 0}`} 
                  color="secondary" 
                  variant="outlined" 
                />
                <Chip 
                  label={`Completitud: ${valuesData.completeness || 0}%`} 
                  color={valuesData.completeness >= 95 ? 'success' : valuesData.completeness >= 90 ? 'warning' : 'error'}
                  variant="outlined" 
                />
                {valuesData.empty_count > 0 && (
                  <Chip 
                    label={`Vacíos: ${valuesData.empty_count}`} 
                    color="error" 
                    variant="outlined" 
                  />
                )}
              </Box>
            </Box>
            
            {/* Values Table */}
            <Typography variant="subtitle1" gutterBottom>
              Distribución de Valores
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Valor</strong></TableCell>
                    <TableCell align="right"><strong>Frecuencia</strong></TableCell>
                    <TableCell align="right"><strong>Porcentaje</strong></TableCell>
                    <TableCell align="center"><strong>Distribución</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {valuesData.values?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2">
                          {item.value || '(Vacío)'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {item.count}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.percentage?.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ width: '100px', height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', position: 'relative' }}>
                          <Box
                            sx={{
                              width: `${item.percentage}%`,
                              height: '100%',
                              backgroundColor: index === 0 ? '#1976d2' : index === 1 ? '#2e7d32' : index === 2 ? '#ed6c02' : '#d32f2f',
                              borderRadius: '4px',
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Additional Info */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                * Los porcentajes se calculan sobre el total de ítems no vacíos
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClassificationValuesModal;