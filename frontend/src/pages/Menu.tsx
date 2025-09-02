import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Box,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import ToolCard, { ToolInfo } from '../components/navigation/ToolCard';
import ApiService from '../core/api';
import { useTools } from '../core/ToolStateContext';

interface MenuProps {
  onToolSelect: (toolId: string) => void;
}

const Menu: React.FC<MenuProps> = ({ onToolSelect }) => {
  const { getToolStatus } = useTools();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Definición de herramientas disponibles
  const availableTools: ToolInfo[] = [
    {
      id: 'ensamblaje',
      name: 'Validador de Ensamblaje',
      description: 'Herramienta especializada para validación de instrumentos educativos de tipo ensamblaje. Analiza duplicados, metadatos y clasificaciones.',
      icon: 'build',
      status: getToolStatus('ensamblaje'),
      available: true
    },
    {
      id: 'respuestas',
      name: 'Validador de Respuestas',
      description: 'Herramienta para validación de bases de datos de respuestas de estudiantes. Análisis de patrones y consistencia.',
      icon: 'assessment',
      status: getToolStatus('respuestas'),
      available: true // Clickeable para mostrar "en construcción"
    }
  ];

  useEffect(() => {
    // Verificar herramientas disponibles desde el backend
    const fetchTools = async () => {
      setLoading(true);
      try {
        const result = await ApiService.getAvailableTools();
        if (!result.success) {
          console.warn('No se pudieron cargar herramientas del backend:', result.error);
        }
      } catch (err) {
        console.warn('Error conectando con backend para herramientas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  const handleToolSelect = (toolId: string) => {
    const tool = availableTools.find(t => t.id === toolId);
    if (tool && tool.available) {
      onToolSelect(toolId);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Paper elevation={2} sx={{ p: 4, mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom color="primary">
            🛠️ Herramientas de Validación
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Selecciona la herramienta que necesitas para validar tus datos
          </Typography>
        </Paper>

        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        <Grid container spacing={4} sx={{ mt: 2 }}>
          {availableTools.map((tool) => (
            <Grid item xs={12} sm={6} md={6} key={tool.id}>
              <ToolCard
                tool={tool}
                onSelect={handleToolSelect}
              />
            </Grid>
          ))}
        </Grid>

        <Paper elevation={1} sx={{ p: 3, mt: 4, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            💡 ¿Cómo funciona?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            1. Selecciona la herramienta adecuada para tu tipo de validación<br/>
            2. Sube tu archivo de datos (Excel o CSV)<br/>
            3. Categoriza las variables según el tipo de instrumento<br/>
            4. Obtén reportes detallados con validaciones y exportaciones<br/>
            5. Cambia entre herramientas sin perder tu progreso
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Menu;