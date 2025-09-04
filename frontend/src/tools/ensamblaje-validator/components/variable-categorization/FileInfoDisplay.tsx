import React from 'react';
import { Typography, Paper } from '@mui/material';

export interface FileInfoDisplayProps {
  uploadedFilename?: string | null;
  sheetName?: string;
}

const FileInfoDisplay: React.FC<FileInfoDisplayProps> = ({ uploadedFilename, sheetName }) => {
  if (!uploadedFilename && !sheetName) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        📄 Información del Archivo
      </Typography>
      {uploadedFilename && (
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Archivo:</strong> {uploadedFilename}
        </Typography>
      )}
      {sheetName && (
        <Typography variant="body2">
          <strong>Hoja:</strong> {sheetName}
        </Typography>
      )}
    </Paper>
  );
};

export default FileInfoDisplay;