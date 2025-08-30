import React from 'react';
import EnsamblajeValidator from '../tools/ensamblaje-validator';

interface ToolPageProps {
  activeTool?: string;
}

const ToolPage: React.FC<ToolPageProps> = ({ activeTool = 'ensamblaje-validator' }) => {
  
  // Simple switch para renderizar el componente correcto
  switch (activeTool) {
    case 'ensamblaje-validator':
      return <EnsamblajeValidator />;

    // case 'respuestas-validator': // Futuro
    //   return <RespuestasValidator />;

    default:
      return (
        <div>
          <p>Por favor, selecciona una herramienta.</p>
        </div>
      );
  }
};

export default ToolPage;