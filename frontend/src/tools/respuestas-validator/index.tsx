import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip
} from '@mui/material';
import { 
  Construction, 
  CheckCircle
} from '@mui/icons-material';

const RespuestasValidator: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 3, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
        <Construction sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          🚧 Validador de Respuestas
        </Typography>
        <Typography variant="h6" paragraph>
          Herramienta en construcción
        </Typography>
        <Chip 
          label="Próximamente disponible" 
          color="warning" 
          variant="outlined"
          size="medium"
        />
      </Paper>

      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ textAlign: 'center' }}>
          Esta herramienta estará especializada en la validación y análisis de bases de datos 
          que contienen respuestas de estudiantes a instrumentos educativos.
        </Typography>
      </Paper>

      <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          🎯 Estado del Desarrollo
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2">Arquitectura base implementada</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2">Sistema de navegación multi-herramienta</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Construction color="warning" fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              Lógica de validación específica - En desarrollo
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Construction color="warning" fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              Interfaz de usuario especializada - En desarrollo
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default RespuestasValidator;