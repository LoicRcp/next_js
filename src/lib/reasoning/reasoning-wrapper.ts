import { defaultSettingsMiddleware, experimental_wrapLanguageModel, wrapLanguageModel } from 'ai';
import type { LanguageModel } from 'ai';

export interface ReasoningConfig {
  enableReasoning?: boolean;
  reasoningLevel?: 'low' | 'medium' | 'high';
  structuredFormat?: boolean;
}

/**
 * Wrapper pour activer le reasoning explicite sur les modèles
 */
export function createReasoningModel(
  baseModel: LanguageModel,
  config: ReasoningConfig = {}
): LanguageModel {
  const {
    enableReasoning = true,
    reasoningLevel = 'medium',
    structuredFormat = true
  } = config;

  if (!enableReasoning) {
    return baseModel;
  }

  // Utiliser le wrapper expérimental pour le reasoning
  return wrapLanguageModel({
    model: baseModel,
    middleware: defaultSettingsMiddleware({
      settings: {
        providerMetadata: {
          google: {
            thinkingConfig: {
              includeThoughts: true, 
            },
          },
          openai: {
            reasoningEffort: reasoningLevel,
          },
        },
      },
    }),
  });
}

/**
 * Formatte un prompt pour encourager le reasoning explicite
 */
export function formatReasoningPrompt(originalPrompt: string): string {
  return `<thinking>
Avant de répondre, je dois analyser cette requête étape par étape :
1. Comprendre l'intention principale
2. Identifier les éléments clés
3. Planifier ma réponse
4. Vérifier la cohérence
</thinking>

${originalPrompt}`;
}

/**
 * Extrait le reasoning d'une réponse
 */
export function extractReasoningFromResponse(response: string): {
  reasoning: string | null;
  answer: string;
} {
  const thinkingMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/);
  
  if (thinkingMatch) {
    const reasoning = thinkingMatch[1].trim();
    const answer = response.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
    return { reasoning, answer };
  }
  
  return { reasoning: null, answer: response };
}