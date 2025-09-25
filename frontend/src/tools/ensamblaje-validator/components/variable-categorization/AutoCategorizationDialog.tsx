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
  Alert,
  AlertTitle
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
        Sugerencias de Categorización Automática
      </DialogTitle>
      <DialogContent>
        {proposals.length > 0 ? (
          <>
            <Typography variant="body1" gutterBottom>
              Se encontraron {proposals.length} sugerencias de categorización basadas en nombres estándar de columnas:
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
          </>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>No se encontraron sugerencias adicionales</AlertTitle>
            Las columnas restantes requieren categorización manual basada
            en el conocimiento específico de tu base de datos.
          </Alert>
        )}

        {proposals.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Puedes arrastrar las columnas restantes a las categorías
            correspondientes o consultar los ejemplos disponibles.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color={proposals.length > 0 ? "inherit" : "primary"}>
          {proposals.length > 0 ? 'Cancelar' : 'Entendido'}
        </Button>
        {proposals.length > 0 && (
          <Button
            onClick={onAccept}
            variant="contained"
            color="primary"
            startIcon={<AutoAwesome />}
          >
            Aplicar Sugerencias
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AutoCategorizationDialog;