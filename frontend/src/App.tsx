import React from 'react';
import { Container, Typography, Box, CircularProgress, AppBar, Toolbar, IconButton } from '@mui/material';
import { Logout } from '@mui/icons-material';
import { AuthProvider, useAuth } from './core/auth';
import Login from './pages/Login';
import ToolPage from './pages/Tool';

// Componente principal de la aplicación autenticada
function AppContent() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Validador de Instrumentos - Sesión Activa
          </Typography>
          <IconButton
            color="inherit"
            onClick={handleLogout}
            title="Cerrar Sesión"
          >
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Validador de Instrumentos
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom align="center" color="text.secondary">
            Herramienta para validar bases de datos de instrumentos educativos
          </Typography>

          {/* Tool Page - New Architecture */}
          <ToolPage />
        </Box>
      </Container>
    </>
  );
}

// Componente principal que maneja autenticación
function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AppContent />;
}

// App principal con proveedor de autenticación
function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;