import React from 'react';
import { Box, Paper, Typography, Alert } from '@mui/material';
import EnsamblajeValidator from '../tools/ensamblaje-validator';
import RespuestasValidator from '../tools/respuestas-validator/index';

interface ToolPageProps {
  currentTool: string;
}

const ToolPage: React.FC<ToolPageProps> = ({ currentTool }) => {
  
  const renderSelectedTool = () => {
    switch (currentTool) {
      case 'ensamblaje':
        return <EnsamblajeValidator />;

      case 'respuestas':
        return <RespuestasValidator />;

      default:
        return (
          <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Alert severity="warning">
                <Typography variant="h6" component="h3" gutterBottom>
                  Herramienta no encontrada
                </Typography>
                <Typography variant="body2">
                  La herramienta "{currentTool}" no está disponible. 
                  Regresa al menú para seleccionar una herramienta válida.
                </Typography>
              </Alert>
            </Paper>
          </Box>
        );
    }
  };

  return (
    <Box>
      {renderSelectedTool()}
    </Box>
  );
};

export default ToolPage;