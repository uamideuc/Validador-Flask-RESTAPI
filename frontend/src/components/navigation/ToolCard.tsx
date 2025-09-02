import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip
} from '@mui/material';
import { Build, Assessment, Construction } from '@mui/icons-material';
import ToolStatusBadge, { ToolStatus } from './ToolStatusBadge';

export interface ToolInfo {
  id: string;
  name: string;
  description: string;
  icon: 'build' | 'assessment' | 'construction';
  status: ToolStatus;
  available: boolean;
}

interface ToolCardProps {
  tool: ToolInfo;
  onSelect: (toolId: string) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect }) => {
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'build':
        return <Build sx={{ fontSize: 40, color: 'primary.main' }} />;
      case 'assessment':
        return <Assessment sx={{ fontSize: 40, color: 'secondary.main' }} />;
      case 'construction':
        return <Construction sx={{ fontSize: 40, color: 'warning.main' }} />;
      default:
        return <Build sx={{ fontSize: 40, color: 'grey.500' }} />;
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        },
        opacity: tool.available ? 1 : 0.7
      }}
    >
      <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {getIcon(tool.icon)}
          {tool.status !== 'empty' && (
            <Box sx={{ ml: 1 }}>
              <ToolStatusBadge status={tool.status} size="medium" />
            </Box>
          )}
        </Box>
        
        <Typography variant="h6" component="h3" gutterBottom>
          {tool.name}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          {tool.description}
        </Typography>

        {!tool.available && (
          <Box sx={{ mt: 2 }}>
            <Chip 
              label="En construcción" 
              color="warning" 
              variant="outlined" 
              size="small"
            />
          </Box>
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button
          variant={tool.available ? "contained" : "outlined"}
          onClick={() => onSelect(tool.id)}
          disabled={!tool.available}
          size="large"
        >
          {tool.available ? 
            (tool.status === 'construction' ? 'Ver Estado' : 'Abrir Herramienta') 
            : 'Próximamente'
          }
        </Button>
      </CardActions>
    </Card>
  );
};

export default ToolCard;