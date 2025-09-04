import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import type { AutoCategorizationProposal } from './AutoCategorizer';

interface AutoCategorizationDialogProps {
  open: boolean;
  proposals: AutoCategorizationProposal[];
  onAccept: () => void;
  onCancel: () => void;
}

const AutoCategorizationDialog: React.FC<AutoCategorizationDialogProps> = ({
  open,
  proposals,
  onAccept,
  onCancel
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onCancel}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        🤖 Sugerencias de Categorización Automática
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Se encontraron {proposals.length} sugerencias de categorización basadas en nombres comunes de columnas:
        </Typography>
        
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Columna</strong></TableCell>
                <TableCell><strong>Categoría Sugerida</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {proposals.map(({ variable, categoryTitle }) => (
                <TableRow key={variable.name}>
                  <TableCell>
                    <Chip label={variable.name} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{categoryTitle}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>¿Deseas aplicar estas sugerencias?</strong><br />
            Las columnas se moverán automáticamente a las categorías propuestas. 
            Siempre puedes moverlas manualmente después si es necesario.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          Cancelar
        </Button>
        <Button 
          onClick={onAccept} 
          variant="contained" 
          color="primary"
          startIcon={<AutoAwesome />}
        >
          Aplicar Sugerencias
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutoCategorizationDialog;