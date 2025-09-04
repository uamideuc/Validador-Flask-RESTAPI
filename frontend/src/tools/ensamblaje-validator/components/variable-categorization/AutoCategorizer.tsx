interface Variable {
  name: string;
  sampleValues: string[];
}

// HARDCODED mapping exacto para auto-categorización
const AUTO_CATEGORIZATION_MAPPING: Record<string, string> = {
  // Identificación de Instrumento
  'instrumento': 'instrument_vars',
  'sector': 'instrument_vars',
  'forma': 'instrument_vars',
  'cuadernillo': 'instrument_vars',
  'nivel': 'instrument_vars',
  'grado': 'instrument_vars',
  'tipo': 'instrument_vars',
  
  // Identificación de Ítems
  'id_item': 'item_id_vars',
  'item_id': 'item_id_vars',
  'numero_item': 'item_id_vars',
  'codigo_item': 'item_id_vars',
  'id_pregunta': 'item_id_vars',
  'pregunta_id': 'item_id_vars',
  
  // Información Crítica
  'invertido': 'metadata_vars',
  'ancla': 'metadata_vars',
  'clave': 'metadata_vars',
  'valores_validos': 'metadata_vars',
  'valores_invalidos': 'metadata_vars',
  'puntaje': 'metadata_vars',
  'peso': 'metadata_vars',
  
  // Información Complementaria
  'dimension': 'classification_vars',
  'subdimension': 'classification_vars',
  'enunciado': 'classification_vars',
  'texto_pregunta': 'classification_vars',
  'competencia': 'classification_vars',
  'habilidad': 'classification_vars',
  'contenido': 'classification_vars'
};

interface AutoCategorizationProposal {
  variable: Variable;
  categoryId: string;
  categoryTitle: string;
}

export interface AutoCategorizerResult {
  proposals: AutoCategorizationProposal[];
  hasProposals: boolean;
}

export const AutoCategorizer = {
  categorize(uncategorizedVariables: Variable[], categories: any[]): AutoCategorizerResult {
    const proposals: AutoCategorizationProposal[] = [];

    uncategorizedVariables.forEach(variable => {
      const variableNameLower = variable.name.toLowerCase()
        .replace(/[_\s-]+/g, '_') // Normalize separators
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

      // SOLO exact matches - NO partial matching, NO inference
      const categoryId = AUTO_CATEGORIZATION_MAPPING[variableNameLower];

      if (categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (category) {
          proposals.push({
            variable,
            categoryId,
            categoryTitle: category.title
          });
        }
      }
    });

    return {
      proposals,
      hasProposals: proposals.length > 0
    };
  }
};

export type { AutoCategorizationProposal };