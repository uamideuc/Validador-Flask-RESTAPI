import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  School,
  Security,
  Info
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [accessKey, setAccessKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!accessKey.trim()) {
      setError('Por favor, ingrese la clave institucional.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await login(accessKey.trim());
      
      if (!result.success) {
        setError(result.user_message || result.error || 'Error desconocido');
      }
      // Si es exitoso, el AuthContext manejará la redirección
    } catch (error) {
      setError('Error inesperado. Por favor, inténtelo nuevamente.');
      console.error('Error en login:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleShowKey = () => {
    setShowKey(!showKey);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 3
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <School 
            sx={{ 
              fontSize: 60, 
              color: 'primary.main', 
              mb: 2 
            }} 
          />
          <Typography variant="h3" component="h1" gutterBottom>
            Validador de Instrumentos
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
            Sistema de Validación de Instrumentos Educativos
          </Typography>
        </Box>

        {/* Login Form */}
        <Paper 
          elevation={3}
          sx={{ 
            p: 4,
            borderRadius: 3,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Security sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Acceso Institucional
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ingrese su clave institucional para continuar
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Clave Institucional"
              type={showKey ? 'text' : 'password'}
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              variant="outlined"
              size="medium"
              autoComplete="current-password"
              autoFocus
              disabled={isSubmitting}
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="mostrar clave"
                      onClick={handleToggleShowKey}
                      edge="end"
                      disabled={isSubmitting}
                    >
                      {showKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }
              }}
            />

            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3, borderRadius: 2 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting || !accessKey.trim()}
              sx={{ 
                py: 1.5, 
                borderRadius: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 3,
                '&:hover': {
                  boxShadow: 6
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Verificando acceso...
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </Button>
          </form>
        </Paper>

        {/* Info Cards */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Card sx={{ flex: 1, minWidth: '280px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Info sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  Información
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                La clave institucional la proporciona su administrador de sistema.
                Su sesión expirará automáticamente después de 24 horas por seguridad.
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, minWidth: '280px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Security sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Seguridad
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Sus datos están protegidos con cifrado de extremo a extremo.
                Cada sesión es única e independiente para garantizar la privacidad.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="caption" color="text.secondary">
            Validador de Instrumentos v2.0 • Sistema Seguro de Validación
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
            Desarrollado con tecnologías de seguridad empresarial
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;