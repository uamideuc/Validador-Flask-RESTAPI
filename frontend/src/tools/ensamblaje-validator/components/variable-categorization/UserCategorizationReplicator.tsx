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

interface NotFoundVariable {
  name: string;
  categoryId: string;
  categoryTitle: string;
}

export interface ReplicationResult {
  proposals: ReplicationProposal[];
  hasProposals: boolean;
  matchCount: number;
  notFoundCount: number;
  notFoundVariables: NotFoundVariable[];
  totalSavedVariables: number;
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
   * @param allVariableNames - TODAS las variables del archivo actual (categorizadas + sin categorizar)
   * @param uncategorizedVariables - Variables actuales sin categorizar
   * @param categories - Definición de categorías disponibles
   * @returns Resultado con proposals y estadísticas
   */
  replicate(
    lastCategorization: any,
    allVariableNames: string[],
    uncategorizedVariables: Variable[],
    categories: any[]
  ): ReplicationResult {
    const proposals: ReplicationProposal[] = [];
    const notFoundVariables: NotFoundVariable[] = [];

    // Crear lookup inverso: variable name -> category ID
    const variableToCategoryMap: Record<string, string> = {};

    Object.entries(lastCategorization).forEach(([categoryId, varNames]) => {
      if (Array.isArray(varNames)) {
        (varNames as string[]).forEach(name => {
          variableToCategoryMap[name] = categoryId;
        });
      }
    });

    // Crear Sets para lookup rápido
    const allVariablesSet = new Set(allVariableNames);
    const uncategorizedVariableNames = new Set(
      uncategorizedVariables.map(v => v.name)
    );

    // Generar proposals para variables que coinciden (están sin categorizar)
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

    // Identificar variables guardadas que NO EXISTEN en el archivo actual
    // (NO solo las que no están en uncategorized, sino las que NO existen en absoluto)
    Object.entries(variableToCategoryMap).forEach(([varName, categoryId]) => {
      if (!allVariablesSet.has(varName)) {
        const category = categories.find(cat => cat.id === categoryId);
        if (category) {
          notFoundVariables.push({
            name: varName,
            categoryId,
            categoryTitle: category.title
          });
        }
      }
    });

    const matchCount = proposals.length;
    const notFoundCount = notFoundVariables.length;
    const totalSavedVariables = Object.keys(variableToCategoryMap).length;

    return {
      proposals,
      hasProposals: proposals.length > 0,
      matchCount,
      notFoundCount,
      notFoundVariables,
      totalSavedVariables
    };
  },

  /**
   * Calcula estadísticas de coincidencia sin generar proposals
   * Útil para mostrar indicadores en la UI antes de ejecutar la replicación
   *
   * @param lastCategorization - Categorización guardada del usuario
   * @param allVariableNames - TODAS las variables del archivo actual (categorizadas + sin categorizar)
   * @param uncategorizedVariableNames - Solo las variables sin categorizar
   */
  calculateMatches(
    lastCategorization: any,
    allVariableNames: string[],
    uncategorizedVariableNames: string[]
  ): {
    hasMatches: boolean;
    matchCount: number;
    notFoundCount: number;
    totalSavedVariables: number;
    matchPercentage: number;
  } {
    if (!lastCategorization) {
      return {
        hasMatches: false,
        matchCount: 0,
        notFoundCount: 0,
        totalSavedVariables: 0,
        matchPercentage: 0
      };
    }

    // Extraer todas las variables de la categorización previa
    const lastVars = new Set<string>();
    Object.values(lastCategorization).forEach(varNames => {
      if (Array.isArray(varNames)) {
        (varNames as string[]).forEach(name => lastVars.add(name));
      }
    });

    // Crear Sets para lookup rápido
    const allVariablesSet = new Set(allVariableNames);
    const uncategorizedSet = new Set(uncategorizedVariableNames);

    // Calcular matchCount: variables guardadas que están disponibles sin categorizar (puedo aplicarlas)
    const matchCount = Array.from(lastVars).filter(v => uncategorizedSet.has(v)).length;

    // Calcular notFoundCount: variables guardadas que NO EXISTEN en el archivo actual
    const notFoundCount = Array.from(lastVars).filter(v => !allVariablesSet.has(v)).length;

    const totalSavedVariables = lastVars.size;
    // Porcentaje = cuántas variables guardadas EXISTEN en el archivo (compatibilidad)
    const matchPercentage = totalSavedVariables > 0
      ? ((totalSavedVariables - notFoundCount) / totalSavedVariables) * 100
      : 0;

    return {
      hasMatches: matchCount > 0 || notFoundCount > 0,
      matchCount,
      notFoundCount,
      totalSavedVariables,
      matchPercentage
    };
  }
};

export type { ReplicationProposal, NotFoundVariable };
