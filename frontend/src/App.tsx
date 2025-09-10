import React, { useState } from 'react';
import { Typography, Box, CircularProgress, AppBar, Toolbar, Button } from '@mui/material';
import { Logout } from '@mui/icons-material';
import { AuthProvider, useAuth } from './core/auth';
import { ToolsProvider, useTools } from './core/ToolStateContext';
import Login from './pages/Login';
import Menu from './pages/Menu';
import ToolPage from './pages/Tool';
import ToolTabs from './components/navigation/ToolTabs';
import LogoutConfirmation from './components/LogoutConfirmation';

// Componente principal de la aplicación autenticada
function AppContent() {
  const { logout } = useAuth();
  const { state, dispatch, getToolStatus } = useTools();
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirmation(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirmation(false);
    logout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirmation(false);
  };

  const handleToolSelect = (toolId: string) => {
    dispatch({ type: 'SET_CURRENT_TOOL', payload: toolId });
  };

  const handleMenuClick = () => {
    dispatch({ type: 'SET_CURRENT_TOOL', payload: null });
  };

  // Definir herramientas disponibles para los tabs
  const availableTools = [
    {
      id: 'ensamblaje',
      label: 'Validador - Ensamblajes',
      icon: 'build' as const,
      status: getToolStatus('ensamblaje'),
      available: true
    },
    {
      id: 'respuestas',
      label: 'Validador de Bases de Datos de Respuestas',
      icon: 'assessment' as const,
      status: getToolStatus('respuestas'),
      available: true // Clickeable para mostrar "en construcción"
    }
  ];

  const renderMainContent = () => {
    if (state.currentTool === null) {
      return <Menu onToolSelect={handleToolSelect} />;
    } else {
      return <ToolPage currentTool={state.currentTool} />;
    }
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Validador de Bases de Datos - Sesión Activa
          </Typography>
          <Button
            color="inherit"
            onClick={handleLogoutClick}
            endIcon={<Logout />}
            sx={{ 
              textTransform: 'none', // Mantiene el texto normal, no MAYÚSCULAS
              fontWeight: 400 // Peso de fuente normal
            }}
          >
            Cerrar sesión
          </Button>
        </Toolbar>
      </AppBar>

      {/* Tool Navigation Tabs */}
      <ToolTabs
        currentTool={state.currentTool}
        availableTools={availableTools}
        onToolChange={handleToolSelect}
        onMenuClick={handleMenuClick}
      />

      {/* Main Content */}
      {renderMainContent()}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmation
        open={showLogoutConfirmation}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
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

// App principal con proveedores de autenticación y herramientas
function App() {
  return (
    <AuthProvider>
      <ToolsProvider>
        <MainApp />
      </ToolsProvider>
    </AuthProvider>
  );
}

export default App;