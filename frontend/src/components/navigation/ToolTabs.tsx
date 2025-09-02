import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Typography,
  Tooltip
} from '@mui/material';
import { Home, Build, Assessment } from '@mui/icons-material';
import ToolStatusBadge, { ToolStatus } from './ToolStatusBadge';

export interface ToolTab {
  id: string;
  label: string;
  icon: 'home' | 'build' | 'assessment';
  status: ToolStatus;
  available: boolean;
}

interface ToolTabsProps {
  currentTool: string | null;
  availableTools: ToolTab[];
  onToolChange: (toolId: string | null) => void;
  onMenuClick: () => void;
}

const ToolTabs: React.FC<ToolTabsProps> = ({
  currentTool,
  availableTools,
  onToolChange,
  onMenuClick
}) => {
  const getTabIcon = (iconType: string) => {
    switch (iconType) {
      case 'home':
        return <Home />;
      case 'build':
        return <Build />;
      case 'assessment':
        return <Assessment />;
      default:
        return <Build />;
    }
  };

  // Crear tabs, incluyendo el botón de menú como primera "tab"
  const allTabs = [
    {
      id: 'menu',
      label: 'Menú',
      icon: 'home' as const,
      status: 'empty' as ToolStatus,
      available: true
    },
    ...availableTools.filter(tool => tool.available)
  ];

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    if (newValue === 'menu') {
      onMenuClick();
    } else {
      onToolChange(newValue);
    }
  };

  const getCurrentValue = () => {
    if (currentTool === null) return 'menu';
    return currentTool;
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Tabs
        value={getCurrentValue()}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            minHeight: 48,
            fontWeight: 500
          }
        }}
      >
        {allTabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getTabIcon(tab.icon)}
                <Typography variant="body2">{tab.label}</Typography>
                {tab.status !== 'empty' && (
                  <ToolStatusBadge status={tab.status} />
                )}
              </Box>
            }
            disabled={!tab.available}
            sx={{
              opacity: tab.available ? 1 : 0.6,
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 600
              }
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default ToolTabs;