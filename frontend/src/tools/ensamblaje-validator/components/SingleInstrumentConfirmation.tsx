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
  Chip
} from '@mui/material';
import { Assignment, Info, CheckCircle } from '@mui/icons-material';

interface SingleInstrumentConfirmationProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  totalVariables: number;
  itemIdVariables: string[];
  metadataVariables: string[];
  classificationVariables: string[];
}

const SingleInstrumentConfirmation: React.FC<SingleInstrumentConfirmationProps> = ({
  open,
  onConfirm,
  onCancel,
  totalVariables,
  itemIdVariables,
  metadataVariables,
  classificationVariables
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
        gap: 1,
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e9ecef'
      }}>
        <Assignment sx={{ color: '#1976d2' }} />
        <Typography variant="h6">
          Confirmación: Instrumento Único
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="body1" gutterBottom>
              <strong>No se detectaron variables de instrumento.</strong>
            </Typography>
            <Typography variant="body2">
              El sistema asumirá que toda la base de datos corresponde a un único instrumento.
            </Typography>
          </Box>
        </Alert>

        <Typography variant="body1" gutterBottom>
          ¿Confirma que toda la base corresponde a un único instrumento?
        </Typography>

        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Resumen de categorización:</strong>
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Chip 
              icon={<CheckCircle />}
              label={`${itemIdVariables.length} ID de Ítem`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip 
              icon={<Info />}
              label={`${metadataVariables.length} Metadata`}
              size="small"
              color="warning"
              variant="outlined"
            />
            <Chip 
              icon={<Assignment />}
              label={`${classificationVariables.length} Clasificación`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Box>
        </Box>

        <Box sx={{ 
          p: 2, 
          backgroundColor: '#f5f5f5', 
          borderRadius: 1,
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Implicaciones:</strong>
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>
              <Typography variant="body2" color="text.secondary">
                Todas las validaciones se aplicarán sobre el conjunto completo de datos
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Los reportes mostrarán resultados para "Instrumento Único"
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Se analizarán {itemIdVariables.length + metadataVariables.length + classificationVariables.length} de {totalVariables} variables en total.
              </Typography>
            </li>
          </ul>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3, 
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e9ecef',
        gap: 1
      }}>
        <Button 
          onClick={onCancel}
          variant="outlined"
          sx={{ minWidth: 120 }}
        >
          No, especificar variables
        </Button>
        <Button 
          onClick={onConfirm}
          variant="contained"
          sx={{ minWidth: 120 }}
          startIcon={<CheckCircle />}
        >
          Sí, proceder
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SingleInstrumentConfirmation;