import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export interface RetryConfig {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface ModelTier {
  model: LanguageModel;
  tier: 'premium' | 'standard' | 'fallback';
  provider: string;
  maxRetries: number;
}

export class RetryManager {
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 10000
  };

  /**
   * Obtient les modèles disponibles par ordre de préférence
   */
  private getModelTiers(): ModelTier[] {
    const tiers: ModelTier[] = [];

    // // Tier Premium : Modèles les plus performants
    // if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    //   tiers.push({
    //     model: google('gemini-1.5-pro'),
    //     tier: 'premium',
    //     provider: 'google',
    //     maxRetries: 3
    //   });
    // }

    // if (process.env.OPENAI_API_KEY) {
    //   tiers.push({
    //     model: openai('gpt-4o'),
    //     tier: 'premium',
    //     provider: 'openai',
    //     maxRetries: 3
    //   });
    // }

    // Tier Standard : Modèles de milieu de gamme
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      tiers.push({
        model: google('gemini-1.5-flash'),
        tier: 'standard',
        provider: 'google',
        maxRetries: 2
      });
    }

    if (process.env.ANTHROPIC_API_KEY) {
      tiers.push({
        model: anthropic('claude-3-sonnet-20240229'),
        tier: 'standard',
        provider: 'anthropic',
        maxRetries: 2
      });
    }

    // Tier Fallback : Modèles de secours
    if (process.env.OPENAI_API_KEY) {
      tiers.push({
        model: openai('gpt-3.5-turbo'),
        tier: 'fallback',
        provider: 'openai',
        maxRetries: 1
      });
    }

    return tiers;
  }

  /**
   * Exécute une opération avec retry intelligent sur plusieurs modèles
   */
  async executeWithRetry<T>(
    operation: (model: LanguageModel) => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultConfig, ...customConfig };
    const models = this.getModelTiers();
    
    if (models.length === 0) {
      throw new Error('No AI models configured. Please set API keys.');
    }

    let lastError: Error = new Error('No models available');
    
    for (const modelTier of models) {
      console.log(`[RetryManager] Trying ${modelTier.provider} (${modelTier.tier} tier)`);
      
      try {
        return await this.retryWithBackoff(
          () => operation(modelTier.model),
          modelTier.maxRetries,
          config
        );
      } catch (error) {
        lastError = error as Error;
          const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[RetryManager] ${modelTier.provider} failed:`, errorMessage);
        
        // Si c'est une erreur non-récupérable, arrêter
        if (this.isNonRecoverableError(error)) {
          throw error;
        }
        
        // Continuer avec le prochain modèle
        console.log(`[RetryManager] Falling back to next model...`);
      }
    }
    
    // Tous les modèles ont échoué
    throw new Error(`All AI models failed. Last error: ${lastError.message}`);
  }

  /**
   * Retry avec backoff exponentiel
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        console.log(`[RetryManager] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Détermine si une erreur est non-récupérable
   */
  private isNonRecoverableError(error: any): boolean {
    const nonRecoverableErrors = [
      'InvalidToolArgumentsError',
      'NoSuchToolError',
      'InvalidRequestError'
    ];
    
    return nonRecoverableErrors.includes(error.name) ||
           error.message?.includes('invalid') ||
           error.message?.includes('not found');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}