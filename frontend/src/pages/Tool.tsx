import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Alert,
  CircularProgress 
} from '@mui/material';
import EnsamblajeValidator from '../tools/ensamblaje-validator';
import ApiService from '../core/api';

interface ToolPageProps {
  activeTool?: string;
}

const ToolPage: React.FC<ToolPageProps> = ({ activeTool }) => {
  const [selectedTool, setSelectedTool] = useState<string>(activeTool || 'ensamblaje');
  const [availableTools, setAvailableTools] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchAvailableTools = async () => {
      setLoading(true);
      try {
        const result = await ApiService.getAvailableTools();
        console.log('Available tools API result:', result);
        if (result.success) {
          console.log('Available tools:', result.tools);
          setAvailableTools(result.tools || {});
        } else {
          setError('Error cargando herramientas disponibles');
        }
      } catch (err) {
        console.error('Error fetching tools:', err);
        setError('Error conectando con el servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableTools();
  }, []);

  const handleToolChange = (event: SelectChangeEvent) => {
    setSelectedTool(event.target.value);
  };

  const renderToolSelector = () => (
    <Box sx={{ mb: 2 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" sx={{ ml: 1 }}>Cargando herramientas...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>🛠️ Herramienta</InputLabel>
          <Select
            value={selectedTool}
            label="🛠️ Herramienta"
            onChange={handleToolChange}
          >
            {Object.entries(availableTools).map(([toolId, toolInfo]: [string, any]) => (
              <MenuItem key={toolId} value={toolId}>
                {toolInfo.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );

  const renderSelectedTool = () => {
    switch (selectedTool) {
      case 'ensamblaje':
        return <EnsamblajeValidator />;

      // case 'respuestas': // Futuro
      //   return <RespuestasValidator />;

      default:
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" color="text.secondary">
              Por favor, selecciona una herramienta válida.
            </Typography>
          </Paper>
        );
    }
  };

  return (
    <Box>
      {renderToolSelector()}
      {renderSelectedTool()}
    </Box>
  );
};

export default ToolPage;