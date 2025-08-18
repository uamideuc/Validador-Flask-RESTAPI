import React, { useState, useEffect } from 'react';
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

const ClassificationValuesModal = ({ 
  open, 
  onClose, 
  variable, 
  instrument, 
  sessionId 
}) => {
  const [valuesData, setValuesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && variable && instrument && sessionId) {
      fetchVariableValues();
    }
  }, [open, variable, instrument, sessionId]);

  const fetchVariableValues = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // This would be a new API endpoint to get detailed values for a specific variable
      const response = await fetch(`/api/validation/${sessionId}/variable-values`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variable: variable,
          instrument: instrument
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setValuesData(data.values_data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error.message || 'Error al cargar valores de la variable');
      // Mock data for demonstration
      setValuesData({
        unique_values: [
          { value: 'Comprensión Lectora', count: 45, percentage: 35.2 },
          { value: 'Matemáticas', count: 38, percentage: 29.7 },
          { value: 'Ciencias', count: 25, percentage: 19.5 },
          { value: 'Historia', count: 20, percentage: 15.6 }
        ],
        total_items: 128,
        empty_count: 5,
        completeness: 96.1
      });
    } finally {
      setLoading(false);
    }
  };

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
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
            <Typography variant="body2" sx={{ mt: 1 }}>
              Mostrando datos de ejemplo para demostración.
            </Typography>
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
                  label={`Valores únicos: ${valuesData.unique_values?.length || 0}`} 
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
                  {valuesData.unique_values?.map((item, index) => (
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