import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip
} from '@mui/material';
import { CloudUpload, InsertDriveFile, TableChart } from '@mui/icons-material';
import axios from 'axios';

interface FileUploadProps {
  onFileUploaded: (uploadData: any) => void;
  onFileParsed: (parseData: any) => void;
}

interface UploadData {
  upload_id: number;
  filename: string;
  file_size: number;
  file_extension: string;
  is_excel: boolean;
  is_csv: boolean;
  sheet_names?: string[];
  sheet_count?: number;
  requires_sheet_selection?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, onFileParsed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return 'Formato de archivo no soportado. Use CSV, XLS o XLSX.';
    }
    
    if (file.size > 16 * 1024 * 1024) { // 16MB
      return 'El archivo es demasiado grande. Máximo 16MB.';
    }
    
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      const data = response.data;
      setUploadData(data);
      onFileUploaded(data);

      // If Excel file with multiple sheets, show sheet selection dialog
      if (data.is_excel && data.requires_sheet_selection) {
        setSheetDialogOpen(true);
      } else {
        // Auto-parse CSV files or single-sheet Excel files
        await parseFile(data.upload_id);
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error al subir archivo';
      setError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onFileUploaded, onFileParsed]);

  const parseFile = useCallback(async (uploadId: number, sheetName?: string) => {
    setParsing(true);
    setError(null);

    try {
      const requestData = sheetName ? { sheet_name: sheetName } : {};
      
      const response = await axios.post(`/api/files/${uploadId}/parse`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const parseData = response.data;
      onFileParsed(parseData);
      setSheetDialogOpen(false);

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error al procesar archivo';
      setError(errorMessage);
    } finally {
      setParsing(false);
    }
  }, [onFileParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, [uploadFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSheetSelect = useCallback((sheetName: string) => {
    if (uploadData) {
      parseFile(uploadData.upload_id, sheetName);
    }
  }, [uploadData, parseFile]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Cargar Archivo de Datos
      </Typography>
      
      <Paper
        elevation={dragActive ? 8 : 2}
        sx={{
          p: 4,
          border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
          backgroundColor: dragActive ? '#f3f8ff' : '#fafafa',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: '#f5f5f5',
            borderColor: '#1976d2',
          }
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading || parsing}
        />
        
        <CloudUpload sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Arrastra tu archivo aquí o haz clic para seleccionar
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Formatos soportados: CSV, XLS, XLSX (máximo 16MB)
        </Typography>
        
        <Button
          variant="contained"
          component="label"
          htmlFor="file-upload"
          disabled={uploading || parsing}
          sx={{ mt: 2 }}
        >
          Seleccionar Archivo
        </Button>
      </Paper>

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Subiendo archivo... {uploadProgress}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {parsing && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Procesando archivo...
          </Typography>
          <LinearProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {uploadData && !parsing && !error && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            {uploadData.is_excel ? <TableChart color="primary" /> : <InsertDriveFile color="primary" />}
            <Typography variant="h6">{uploadData.filename}</Typography>
            <Chip 
              label={uploadData.file_extension.toUpperCase()} 
              size="small" 
              color="primary" 
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Tamaño: {formatFileSize(uploadData.file_size)}
          </Typography>
          
          {uploadData.is_excel && uploadData.sheet_count && (
            <Typography variant="body2" color="text.secondary">
              Hojas: {uploadData.sheet_count}
            </Typography>
          )}
        </Paper>
      )}

      {/* Sheet Selection Dialog */}
      <Dialog 
        open={sheetDialogOpen} 
        onClose={() => setSheetDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Seleccionar Hoja de Excel
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Este archivo Excel contiene múltiples hojas. Selecciona la hoja que contiene los datos a validar:
          </Typography>
          
          <List>
            {uploadData?.sheet_names?.map((sheetName, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => handleSheetSelect(sheetName)}>
                  <ListItemText 
                    primary={sheetName}
                    secondary={`Hoja ${index + 1}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSheetDialogOpen(false)}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileUpload;