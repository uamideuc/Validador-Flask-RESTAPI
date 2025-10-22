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
import { RestartAlt, Warning } from '@mui/icons-material';

interface ProcessResetConfirmationProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ProcessResetConfirmation: React.FC<ProcessResetConfirmationProps> = ({
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
        background: 'linear-gradient(135deg, #ed6c02 0%, #ff9800 100%)',
        color: 'white',
        borderBottom: 'none'
      }}>
        <Warning sx={{ color: 'white' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          ¿Reiniciar el proceso completo?
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, pb: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
            Se perderá todo el trabajo actual
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Esta acción eliminará completamente tu progreso en la validación
          </Typography>
        </Box>

        <Alert
          severity="warning"
          sx={{
            mb: 3,
            backgroundColor: '#fff3e0',
            border: '1px solid #ffe0b2',
            '& .MuiAlert-icon': { color: '#ed6c02' }
          }}
        >
          <Typography variant="body2">
            <strong>Todo tu trabajo se eliminará:</strong> Se perderá el archivo cargado, la categorización de columnas y todos los resultados de validación.
          </Typography>
        </Alert>

        <Divider sx={{ my: 2 }}>
          <Chip label="¿Estás seguro?" size="small" />
        </Divider>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
          Esta acción no se puede deshacer. Podrás comenzar una nueva validación desde cero.
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
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="warning"
          sx={{
            minWidth: 140,
            background: 'linear-gradient(135deg, #ed6c02 0%, #ff9800 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)'
            }
          }}
          startIcon={<RestartAlt />}
        >
          Reiniciar proceso
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProcessResetConfirmation;
