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
import { Logout, Warning, Security } from '@mui/icons-material';

interface LogoutConfirmationProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmation: React.FC<LogoutConfirmationProps> = ({
  open,
  onConfirm,
  onCancel
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
        background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
        color: 'white',
        borderBottom: 'none'
      }}>
        <Security sx={{ color: 'white' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          ¿Cerrar sesión?
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 4, pb: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Warning sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
            Se perderá todo tu progreso
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Al cerrar sesión volverás a la pantalla de inicio de sesión
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
            <strong>Se eliminará permanentemente:</strong> Tu archivo cargado, categorización de variables, resultados de validación y cualquier trabajo no guardado.
          </Typography>
        </Alert>

        <Divider sx={{ my: 2 }}>
          <Chip label="¿Estás seguro?" size="small" />
        </Divider>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
          Puedes cancelar para continuar trabajando o cerrar sesión para salir completamente
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
          Continuar trabajando
        </Button>
        <Button 
          onClick={onConfirm}
          variant="contained"
          sx={{ 
            minWidth: 140,
            background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)'
            }
          }}
          startIcon={<Logout />}
        >
          Cerrar sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogoutConfirmation;