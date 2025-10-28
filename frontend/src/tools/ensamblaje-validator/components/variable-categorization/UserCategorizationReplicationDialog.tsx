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
  AlertTitle,
  Box
} from '@mui/material';
import { History, Check } from '@mui/icons-material';
import type { ReplicationProposal } from './UserCategorizationReplicator';

interface UserCategorizationReplicationDialogProps {
  open: boolean;
  proposals: ReplicationProposal[];
  matchCount: number;
  unmatchedCount: number;
  totalVariables: number;
  onAccept: () => void;
  onCancel: () => void;
}

const UserCategorizationReplicationDialog: React.FC<UserCategorizationReplicationDialogProps> = ({
  open,
  proposals,
  matchCount,
  unmatchedCount,
  totalVariables,
  onAccept,
  onCancel
}) => {
  const matchPercentage = totalVariables > 0 ? Math.round((matchCount / totalVariables) * 100) : 0;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
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
        background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
        color: 'white',
        borderBottom: 'none'
      }}>
        <History sx={{ color: 'white' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Replicar Categorización Anterior
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, pb: 3 }}>
        {proposals.length > 0 ? (
          <>
            {/* Estadísticas de coincidencia */}
            <Box sx={{
              display: 'flex',
              gap: 2,
              mb: 3,
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Chip
                label={`${matchCount} coincidencias`}
                color="success"
                sx={{ fontWeight: 600, fontSize: '0.9rem' }}
              />
              {unmatchedCount > 0 && (
                <Chip
                  label={`${unmatchedCount} no coinciden`}
                  color="warning"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                />
              )}
              <Chip
                label={`${matchPercentage}% de coincidencia`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.9rem' }}
              />
            </Box>

            <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
              Se encontraron <strong>{matchCount}</strong> variables que coinciden con tu categorización anterior:
            </Typography>

            <TableContainer
              component={Paper}
              sx={{
                mt: 2,
                maxHeight: 400,
                border: '1px solid #e0e0e0'
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 600 }}>
                      Columna
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 600 }}>
                      Categoría
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proposals.map(({ variable, categoryTitle }) => (
                    <TableRow
                      key={variable.name}
                      sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}
                    >
                      <TableCell>
                        <Chip
                          label={variable.name}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Check sx={{ fontSize: 16, color: '#4caf50' }} />
                          <Typography variant="body2">{categoryTitle}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>¿Deseas aplicar esta categorización?</strong><br />
                Las columnas se moverán automáticamente a las categorías que tenían anteriormente.
                Siempre puedes ajustar manualmente después si es necesario.
              </Typography>
            </Alert>

            {unmatchedCount > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>Variables no coincidentes</AlertTitle>
                {unmatchedCount} {unmatchedCount === 1 ? 'variable no coincide' : 'variables no coinciden'} con
                la categorización anterior y deberán ser categorizadas manualmente.
              </Alert>
            )}
          </>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>No se encontraron coincidencias</AlertTitle>
            Las variables del archivo actual no coinciden con tu categorización anterior.
            Deberás categorizar las columnas manualmente.
          </Alert>
        )}
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
          {proposals.length > 0 ? 'Cancelar' : 'Entendido'}
        </Button>
        {proposals.length > 0 && (
          <Button
            onClick={onAccept}
            variant="contained"
            sx={{
              minWidth: 140,
              background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #8e24aa 0%, #ab47bc 100%)'
              }
            }}
            startIcon={<History />}
          >
            Replicar Categorización
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UserCategorizationReplicationDialog;
