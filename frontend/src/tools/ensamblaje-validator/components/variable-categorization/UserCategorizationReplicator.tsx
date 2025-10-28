interface Variable {
  name: string;
  sampleValues: string[];
}

interface ReplicationProposal {
  variable: Variable;
  categoryId: string;
  categoryTitle: string;
  source: 'user_previous'; // Diferenciador para styling
}

export interface ReplicationResult {
  proposals: ReplicationProposal[];
  hasProposals: boolean;
  matchCount: number;
  unmatchedCount: number;
  totalVariables: number;
}

/**
 * 🎯 CONSERVACIÓN: Replicador de categorizaciones previas del usuario
 *
 * Similar a AutoCategorizer pero usando la última categorización del usuario
 * en lugar de un mapping hardcodeado.
 *
 * @example
 * const result = UserCategorizationReplicator.replicate(
 *   lastCategorization,
 *   uncategorizedVariables,
 *   CATEGORIES
 * );
 *
 * if (result.hasProposals) {
 *   // Mostrar modal de confirmación
 * }
 */
export const UserCategorizationReplicator = {
  /**
   * Genera propuestas de categorización basadas en una categorización previa
   *
   * @param lastCategorization - Categorización guardada del usuario
   * @param uncategorizedVariables - Variables actuales sin categorizar
   * @param categories - Definición de categorías disponibles
   * @returns Resultado con proposals y estadísticas
   */
  replicate(
    lastCategorization: any,
    uncategorizedVariables: Variable[],
    categories: any[]
  ): ReplicationResult {
    const proposals: ReplicationProposal[] = [];

    // Crear lookup inverso: variable name -> category ID
    const variableToCategoryMap: Record<string, string> = {};

    Object.entries(lastCategorization).forEach(([categoryId, varNames]) => {
      if (Array.isArray(varNames)) {
        (varNames as string[]).forEach(name => {
          variableToCategoryMap[name] = categoryId;
        });
      }
    });

    // Generar proposals para variables que coinciden
    uncategorizedVariables.forEach(variable => {
      const categoryId = variableToCategoryMap[variable.name];

      if (categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (category) {
          proposals.push({
            variable,
            categoryId,
            categoryTitle: category.title,
            source: 'user_previous'
          });
        }
      }
    });

    const matchCount = proposals.length;
    const totalVariables = uncategorizedVariables.length;
    const unmatchedCount = totalVariables - matchCount;

    return {
      proposals,
      hasProposals: proposals.length > 0,
      matchCount,
      unmatchedCount,
      totalVariables
    };
  },

  /**
   * Calcula estadísticas de coincidencia sin generar proposals
   * Útil para mostrar indicadores en la UI antes de ejecutar la replicación
   */
  calculateMatches(
    lastCategorization: any,
    currentVariables: string[]
  ): { hasMatches: boolean; matchCount: number; totalVariables: number; matchPercentage: number } {
    if (!lastCategorization) {
      return { hasMatches: false, matchCount: 0, totalVariables: currentVariables.length, matchPercentage: 0 };
    }

    // Extraer todas las variables de la categorización previa
    const lastVars = new Set<string>();
    Object.values(lastCategorization).forEach(varNames => {
      if (Array.isArray(varNames)) {
        (varNames as string[]).forEach(name => lastVars.add(name));
      }
    });

    // Calcular coincidencias
    const matches = currentVariables.filter(v => lastVars.has(v));
    const matchCount = matches.length;
    const totalVariables = currentVariables.length;
    const matchPercentage = totalVariables > 0 ? (matchCount / totalVariables) * 100 : 0;

    return {
      hasMatches: matchCount > 0,
      matchCount,
      totalVariables,
      matchPercentage
    };
  }
};

export type { ReplicationProposal };
