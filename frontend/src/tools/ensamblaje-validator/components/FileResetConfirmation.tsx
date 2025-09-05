import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import { FileUpload, AutoAwesome, Psychology } from '@mui/icons-material';

interface FileResetConfirmationProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  filename: string;
}

const FileResetConfirmation: React.FC<FileResetConfirmationProps> = ({
  open,
  onConfirm,
  onCancel,
  filename
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        color: 'white',
        borderBottom: 'none'
      }}>
        <AutoAwesome sx={{ color: 'white' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          ¿Empezar una nueva validación?
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 4, pb: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Psychology sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
            Ya tienes trabajo en progreso
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Al cargar un archivo nuevo, comenzarás desde cero con <strong>"{filename}"</strong>
          </Typography>
        </Box>

        <Alert 
          severity="info" 
          sx={{ 
            mb: 3,
            backgroundColor: '#e3f2fd',
            border: '1px solid #bbdefb',
            '& .MuiAlert-icon': { color: '#1976d2' }
          }}
        >
          <Typography variant="body2">
            <strong>Tu trabajo actual se reiniciará:</strong> Se perderá tu categorización de columnas y resultados de validación previos.
          </Typography>
        </Alert>

        <Divider sx={{ my: 2 }}>
          <Chip label="¿Qué prefieres hacer?" size="small" />
        </Divider>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
          Puedes continuar con el archivo nuevo o cancelar y seguir con tu trabajo actual
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3, 
        backgroundColor: '#fafafa',
        borderTop: '1px solid #e0e0e0',
        gap: 2,
        justifyContent: 'center'
      }}>
        <Button 
          onClick={onCancel}
          variant="outlined"
          sx={{ 
            minWidth: 140,
            borderColor: '#9e9e9e',
            color: '#616161',
            '&:hover': {
              borderColor: '#757575',
              backgroundColor: '#f5f5f5'
            }
          }}
        >
          Mantener trabajo actual
        </Button>
        <Button 
          onClick={onConfirm}
          variant="contained"
          sx={{ 
            minWidth: 140,
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1565c0 0%, #2196f3 100%)'
            }
          }}
          startIcon={<FileUpload />}
        >
          Empezar de nuevo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileResetConfirmation;