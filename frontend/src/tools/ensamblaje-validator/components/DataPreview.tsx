import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import ApiService from '../../../services/api';

interface DataPreviewProps {
  uploadId: number;
  sheetName?: string;
  onClose?: () => void;
}

interface PreviewData {
  preview_data: any[];
  columns: string[];
  total_rows: number;
  start_row: number;
  end_row: number;
  has_more: boolean;
  unnamed_columns_info: {
    has_unnamed: boolean;
    renamed_columns: Array<{
      original_name: string;
      new_name: string;
      column_index: number;
      sample_values: string[];
    }>;
    total_unnamed: number;
  };
}

const DataPreview: React.FC<DataPreviewProps> = ({ uploadId, sheetName, onClose }) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage] = useState(10);

  const fetchPreview = useCallback(async (startRow: number = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.getDataPreview(uploadId, sheetName, startRow, rowsPerPage);
      if (response.success) {
        setPreviewData(response);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      setError(error.message || 'Error al cargar preview de datos');
    } finally {
      setLoading(false);
    }
  }, [uploadId, sheetName, rowsPerPage]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleNextPage = () => {
    const newStartRow = (currentPage + 1) * rowsPerPage;
    setCurrentPage(currentPage + 1);
    fetchPreview(newStartRow);
  };

  const handlePrevPage = () => {
    const newStartRow = Math.max(0, (currentPage - 1) * rowsPerPage);
    setCurrentPage(Math.max(0, currentPage - 1));
    fetchPreview(newStartRow);
  };

  if (loading && !previewData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Cargando preview de datos...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!previewData) {
    return null;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          <VisibilityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Preview de Datos
        </Typography>
        {onClose && (
          <Button variant="outlined" size="small" onClick={onClose}>
            Cerrar Preview
          </Button>
        )}
      </Box>

      {/* Unnamed columns warning */}
      {previewData.unnamed_columns_info.has_unnamed && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center">
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="subtitle1">
                Columnas sin nombre detectadas ({previewData.unnamed_columns_info.total_unnamed})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Se encontraron columnas sin nombre. Se les han asignado nombres automáticamente para poder categorizarlas.
            </Alert>
            <Box>
              {previewData.unnamed_columns_info.renamed_columns.map((col, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Columna {col.column_index}: {col.original_name} → {col.new_name}
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

      {/* Data table */}
      <Paper sx={{ mb: 2 }}>
        <Box p={2} borderBottom="1px solid #e0e0e0">
          <Typography variant="subtitle1">
            Mostrando filas {previewData.start_row + 1} - {previewData.end_row} de {previewData.total_rows}
          </Typography>
        </Box>
        
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 60, fontWeight: 'bold' }}>
                  #
                </TableCell>
                {previewData.columns.map((column, index) => (
                  <TableCell key={index} sx={{ minWidth: 120, fontWeight: 'bold' }}>
                    <Tooltip title={column} arrow>
                      <Box>
                        {column.length > 15 ? `${column.substring(0, 15)}...` : column}
                        {previewData.unnamed_columns_info.renamed_columns.some(col => col.new_name === column) && (
                          <Chip 
                            label="Renombrada" 
                            size="small" 
                            color="warning" 
                            sx={{ ml: 1, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.preview_data.map((row, rowIndex) => (
                <TableRow key={rowIndex} hover>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    {row._row_index + 1}
                  </TableCell>
                  {previewData.columns.map((column, colIndex) => (
                    <TableCell key={colIndex}>
                      <Tooltip title={row[column] || '(vacío)'} arrow>
                        <Box sx={{ 
                          maxWidth: 120, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {row[column] || <span style={{ color: '#999', fontStyle: 'italic' }}>(vacío)</span>}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center" borderTop="1px solid #e0e0e0">
          <Button 
            variant="outlined" 
            size="small"
            onClick={handlePrevPage}
            disabled={currentPage === 0 || loading}
          >
            Anterior
          </Button>
          
          <Typography variant="body2" color="text.secondary">
            Página {currentPage + 1}
          </Typography>
          
          <Button 
            variant="outlined" 
            size="small"
            onClick={handleNextPage}
            disabled={!previewData.has_more || loading}
          >
            {loading ? <CircularProgress size={16} /> : 'Siguiente'}
          </Button>
        </Box>
      </Paper>

      <Typography variant="caption" color="text.secondary">
        💡 Tip: Usa este preview para verificar que las columnas se ven correctamente antes de categorizarlas.
      </Typography>
    </Box>
  );
};

export default DataPreview;