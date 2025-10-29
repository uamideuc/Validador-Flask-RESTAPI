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
import { History, Check, Warning } from '@mui/icons-material';
import type { ReplicationProposal, NotFoundVariable } from './UserCategorizationReplicator';

interface UserCategorizationReplicationDialogProps {
  open: boolean;
  proposals: ReplicationProposal[];
  notFoundVariables?: NotFoundVariable[];
  matchCount: number;
  notFoundCount: number;
  totalSavedVariables: number;
  onAccept: () => void;
  onCancel: () => void;
}

const UserCategorizationReplicationDialog: React.FC<UserCategorizationReplicationDialogProps> = ({
  open,
  proposals,
  notFoundVariables = [],
  matchCount,
  notFoundCount,
  totalSavedVariables,
  onAccept,
  onCancel
}) => {
  // Porcentaje = cuántas variables guardadas EXISTEN en el archivo (compatibilidad)
  const matchPercentage = totalSavedVariables > 0
    ? Math.round(((totalSavedVariables - notFoundCount) / totalSavedVariables) * 100)
    : 0;

  // Modo informativo: cuando ya no hay variables para categorizar pero hay info útil
  const isInformativeMode = matchCount === 0 && notFoundCount > 0;

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
        borderBottom: 'none',
        mb: 3
      }}>
        <History sx={{ color: 'white' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Replicar Categorización Anterior
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 3 }}>
        {totalSavedVariables > 0 ? (
          <>
            {/* Estadísticas de coincidencia */}
            <Box sx={{
              display: 'flex',
              gap: 2,
              mb: 3,
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {matchCount > 0 && (
                <Chip
                  label={`${matchCount} coincidencias`}
                  color="success"
                  sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                />
              )}
              {notFoundCount > 0 && (
                <Chip
                  label={`${notFoundCount} no encontrada${notFoundCount !== 1 ? 's' : ''}`}
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
              {isInformativeMode ? (
                <>
                  Tu categorización anterior ha sido aplicada. Aquí está el resumen:
                </>
              ) : (
                <>
                  Se encontraron <strong>{matchCount}</strong> variable{matchCount !== 1 ? 's' : ''} que coincide{matchCount !== 1 ? 'n' : ''} con tu categorización anterior:
                </>
              )}
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
                  {/* Variables que coinciden (con ✓) */}
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
                          color="success"
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

                  {/* Variables guardadas que NO están en la base actual (con ⚠️) */}
                  {notFoundVariables.map(({ name, categoryTitle }) => (
                    <TableRow
                      key={name}
                      sx={{
                        '&:hover': { backgroundColor: '#fff8e1' },
                        backgroundColor: '#fffbf0'
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={name}
                          size="small"
                          variant="outlined"
                          color="warning"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Warning sx={{ fontSize: 16, color: '#ff9800' }} />
                          <Typography variant="body2" color="text.secondary">
                            {categoryTitle}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {!isInformativeMode && (
              <Alert severity="success" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>¿Deseas aplicar esta categorización?</strong><br />
                  Las columnas se moverán automáticamente a las categorías que tenían anteriormente.
                  Siempre puedes ajustar manualmente después si es necesario.
                </Typography>
              </Alert>
            )}

            {notFoundCount > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>Variables no encontradas</AlertTitle>
                {notFoundCount} {notFoundCount === 1 ? 'variable' : 'variables'} de tu categorización anterior no {notFoundCount === 1 ? 'fue encontrada' : 'fueron encontradas'} en este archivo.
              </Alert>
            )}
          </>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>No se encontraron coincidencias</AlertTitle>
            Las variables del archivo actual no coinciden con tu categorización anterior.
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
          {isInformativeMode || totalSavedVariables === 0 ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!isInformativeMode && matchCount > 0 && (
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
