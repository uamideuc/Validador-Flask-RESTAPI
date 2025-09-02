import React from 'react';
import { Chip } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked, Construction } from '@mui/icons-material';

export type ToolStatus = 'empty' | 'in_progress' | 'completed' | 'construction' | 'temporal_changes';

interface ToolStatusBadgeProps {
  status: ToolStatus;
  size?: 'small' | 'medium';
}

const ToolStatusBadge: React.FC<ToolStatusBadgeProps> = ({ status, size = 'small' }) => {
  const getStatusConfig = (status: ToolStatus) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle />,
          label: '✓',
          color: 'success' as const,
        };
      case 'temporal_changes':
        return {
          icon: <RadioButtonUnchecked />,
          label: '⚠️',
          color: 'warning' as const,
        };
      case 'in_progress':
        return {
          icon: <RadioButtonUnchecked />,
          label: '•',
          color: 'warning' as const,
        };
      case 'construction':
        return {
          icon: <Construction />,
          label: '🚧',
          color: 'info' as const,
        };
      case 'empty':
      default:
        return null;
    }
  };

  const config = getStatusConfig(status);
  
  if (!config) {
    return null;
  }

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{ 
        minWidth: '24px',
        height: '20px',
        '& .MuiChip-label': {
          paddingX: 0.5,
          fontSize: '0.75rem'
        }
      }}
    />
  );
};

export default ToolStatusBadge;