import { generateText, streamText, tool, type Tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createReasoningModel, formatReasoningPrompt } from '../reasoning/reasoning-wrapper';
import { executeSearch, executeAddOrUpdate } from '../agent-caller';
import { ensureNonEmptyMessages, validateMessageHistory } from '../utils/message-validator';
import type { CoreMessage } from 'ai';

export interface OrchestratorConfig {
  model: string;
  enableReasoning: boolean;
  maxSteps: number;
  streamByDefault: boolean;
}

export class KnowledgeHubOrchestrator {
  private config: OrchestratorConfig;
  private model: any;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      model: process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash',
      enableReasoning: true,
      maxSteps: 7, // Réduit de 100 à 7 pour la performance
      streamByDefault: true,
      ...config
    };

    console.log(`[Orchestrator] Initialized with config:`, {
      model: this.config.model,
      enableReasoning: this.config.enableReasoning,
      maxSteps: this.config.maxSteps,
      streamByDefault: this.config.streamByDefault
    });

    // Créer le modèle avec reasoning si activé
    const baseModel = google(this.config.model);
    this.model = this.config.enableReasoning 
      ? createReasoningModel(baseModel, { reasoningLevel: 'high' })
      : baseModel;
    
    console.log(`[Orchestrator] Model created with reasoning: ${this.config.enableReasoning}`);
  }

  /**
   * Détermine si on doit utiliser streamText ou generateText
   */
  private shouldStream(query: string): boolean {
    // Patterns qui nécessitent generateText pour la coordination
    const nonStreamPatterns = [
      /créer.*et.*lier/i,
      /analyser.*puis.*intégrer/i,
      /vérifier.*avant/i,
      /workflow/i
    ];

    const shouldUseStream = !nonStreamPatterns.some(p => p.test(query));
    console.log(`[Orchestrator] Stream decision for "${query.substring(0, 50)}...": ${shouldUseStream}`);
    
    return shouldUseStream;
  }

  /**
   * Crée les outils de haut niveau pour l'orchestrateur
   */
  private createTools(integrationBatchId?: string, chatId?: string): Record<string, Tool<any, any>> {
    console.log(`[Orchestrator] Creating tools with batchId: ${integrationBatchId}, chatId: ${chatId}`);
    
    return {
      // Délégation au Agent Lecteur (NOUVEAU - architecture correcte)
      callReaderAgent: tool({
        description: "Délègue une tâche d'exploration ou d'analyse à l'Agent Lecteur spécialisé",
        parameters: z.object({
          taskDescription: z.string().describe("Description détaillée de la tâche de lecture/analyse à effectuer")
        }),
        execute: async (args) => {
          console.log(`[Orchestrator] 📖 Delegating to Reader: "${args.taskDescription}"`);
          const startTime = Date.now();
          try {
            const result = await executeSearch({
              query: args.taskDescription,
              integrationBatchId,
              chatId
            });
            const duration = Date.now() - startTime;
            console.log(`[Orchestrator] ✅ Reader completed in ${duration}ms. Success: ${result.success}`);
            if (result.summary_text) {
              console.log(`[Orchestrator] Reader summary: "${result.summary_text.substring(0, 100)}..."`);
            }
            return result;
          } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[Orchestrator] ❌ Reader failed after ${duration}ms:`, error);
            throw error;
          }
        }
      }),

      // Délégation au Agent Intégrateur (NOUVEAU - architecture correcte)  
      callIntegratorAgent: tool({
        description: "Délègue une tâche d'intégration ou de modification à l'Agent Intégrateur spécialisé",
        parameters: z.object({
          taskDescription: z.string().describe("Description détaillée de l'information à intégrer ou de la modification à effectuer")
        }),
        execute: async (args) => {
          console.log(`[Orchestrator] ✏️ Delegating to Integrator: "${args.taskDescription}"`);
          const startTime = Date.now();
          try {
            const result = await executeAddOrUpdate({
              information: args.taskDescription,
              integrationBatchId,
              chatId
            });
            const duration = Date.now() - startTime;
            console.log(`[Orchestrator] ✅ Integrator completed in ${duration}ms. Success: ${result.success}`);
            if (result.summary_text) {
              console.log(`[Orchestrator] Integrator summary: "${result.summary_text.substring(0, 100)}..."`);
            }
            return result;
          } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[Orchestrator] ❌ Integrator failed after ${duration}ms:`, error);
            throw error;
          }
        }
      }),

      // Outils de haut niveau conservés pour compatibilité
      searchKnowledgeGraph: tool({
        description: "Recherche des informations dans le graphe de connaissances (délègue au Agent Lecteur)",
        parameters: z.object({
          query: z.string().describe("La requête de recherche")
        }),
        execute: async (args) => {
          console.log(`[Orchestrator] 🔍 Executing search: "${args.query}"`);
          const startTime = Date.now();
          try {
            const result = await executeSearch({
              query: args.query,
              integrationBatchId,
              chatId
            });
            const duration = Date.now() - startTime;
            console.log(`[Orchestrator] ✅ Search completed in ${duration}ms`);
            return result;
          } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[Orchestrator] ❌ Search failed after ${duration}ms:`, error);
            throw error;
          }
        }
      }),

      addOrUpdateKnowledge: tool({
        description: "Ajoute ou met à jour des informations dans le graphe (délègue au Agent Intégrateur)",
        parameters: z.object({
          information: z.string().describe("L'information à intégrer")
        }),
        execute: async (args) => {
          console.log(`[Orchestrator] ➕ Executing add/update: "${args.information}"`);
          const startTime = Date.now();
          try {
            const result = await executeAddOrUpdate({
              information: args.information,
              integrationBatchId,
              chatId
            });
            const duration = Date.now() - startTime;
            console.log(`[Orchestrator] ✅ Add/update completed in ${duration}ms`);
            return result;
          } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[Orchestrator] ❌ Add/update failed after ${duration}ms:`, error);
            throw error;
          }
        }
      })
    };
  }

  /**
   * Traite une requête avec l'approche optimale
   */
  async processRequest(
    messages: CoreMessage[], 
    chatId?: string
  ) {
    const startTime = Date.now();
    console.log(`\n==== [Orchestrator] Processing Request ====`);
    console.log(`[Orchestrator] ChatId: ${chatId}`);
    console.log(`[Orchestrator] Message count: ${messages.length}`);
    
    const {valid, cleaned, errors } = validateMessageHistory(messages);
    if (!valid) {
      console.error('[Orchestrator] ❌ Invalid message history:', errors);
      throw new Error('Invalid message history: ' + errors.join(', '));
    }
    console.log(`[Orchestrator] ✅ Message validation passed. Cleaned count: ${cleaned.length}`);

    const safeMessages = ensureNonEmptyMessages(cleaned);
    const integrationBatchId = chatId ? `batch_${chatId}_${Date.now()}` : undefined;
    console.log(`[Orchestrator] Generated batchId: ${integrationBatchId}`);
    
    const lastMessage = safeMessages[messages.length - 1];
    const query = lastMessage.content as string;
    console.log(`[Orchestrator] Last message: "${query.substring(0, 100)}..."`);

    // Déterminer la méthode optimale
    const useStream = this.shouldStream(query);
    const tools = this.createTools(integrationBatchId, chatId);
    console.log(`[Orchestrator] Tool count: ${Object.keys(tools).length}`);

    // Charger le prompt système de l'orchestrateur
    const systemPrompt = await this.loadSystemPrompt();
    console.log(`[Orchestrator] System prompt loaded: ${systemPrompt.length} chars`);

    try {
      let result;
      if (useStream) {
        console.log(`[Orchestrator] 🌊 Using STREAM mode`);
        result = await this.processWithStream(safeMessages, systemPrompt, tools);
      } else {
        console.log(`[Orchestrator] 📝 Using GENERATE mode`);
        result = await this.processWithGenerate(safeMessages, systemPrompt, tools);
      }
      
      const duration = Date.now() - startTime;
      console.log(`[Orchestrator] ✅ Request completed in ${duration}ms`);
      console.log(`==== [Orchestrator] Request Complete ====\n`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Orchestrator] ❌ Request failed after ${duration}ms:`, error);
      console.log(`==== [Orchestrator] Request Failed ====\n`);
      throw error;
    }
  }

  /**
   * Traitement avec streamText (pour l'UX temps réel)
   */
  private async processWithStream(
    messages: CoreMessage[],
    systemPrompt: string,
    tools: Record<string, Tool<any, any>>
  ) {
    console.log(`[Orchestrator] Starting stream processing...`);
    
    return streamText({
      model: this.model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: this.config.maxSteps,
      onStepFinish: ({ toolCalls, toolResults, text, stepType }) => {
        console.log(`[Orchestrator] 🔄 Stream step completed:`);
        console.log(`  - Type: ${stepType}`);
        console.log(`  - Tool calls: ${toolCalls.length}`);
        console.log(`  - Text length: ${text ? text.length : 0}`);
        
        if (toolCalls.length > 0) {
          toolCalls.forEach((call, index) => {
            console.log(`  - Tool ${index + 1}: ${call.toolName}`);
          });
        }
        
        // Vérifier qu'il y a toujours du contenu
        if (!text && toolCalls.length > 0) {
          console.warn('[Orchestrator] ⚠️ WARNING: Tool calls without text explanation detected');        
        }
      },
      // S'assurer qu'il y a toujours une réponse
      experimental_continueSteps: true,
      experimental_toolCallStreaming: false
    });
  }

  /**
   * Traitement avec generateText (pour la coordination complexe)
   */
  private async processWithGenerate(
    messages: CoreMessage[],
    systemPrompt: string,
    tools: Record<string, Tool<any, any>>
  ) {
    console.log(`[Orchestrator] Starting generate processing...`);
    
    const result = await generateText({
      model: this.model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: this.config.maxSteps,
      onStepFinish: ({
        toolCalls,
        toolResults,
        stepType,
        text
      }: {
        toolCalls: any[];
        toolResults: Array<{ result: any }>;
        stepType: string;
        text: string;
      }) => {
        console.log(`[Orchestrator] 🔄 Generate step completed:`);
        console.log(`  - Type: ${stepType}`);
        console.log(`  - Tool calls: ${toolCalls.length}`);
        console.log(`  - Text length: ${text ? text.length : 0}`);
        
        if (toolCalls.length > 0) {
          toolCalls.forEach((call, index) => {
            console.log(`  - Tool ${index + 1}: ${call.toolName}`);
            if (call.args) {
              const argsPreview = JSON.stringify(call.args).substring(0, 100);
              console.log(`    Args: ${argsPreview}...`);
            }
          });
        }

        if (toolResults && toolResults.length > 0) {
          toolResults.forEach((result, index) => {
            console.log(`  - Result ${index + 1}: ${typeof result.result}`);
            if (typeof result.result === 'string') {
              console.log(`    Preview: ${result.result.substring(0, 100)}...`);
            }
          });
        }
      }
    });

    console.log(`[Orchestrator] Generate result:`);
    console.log(`  - Text length: ${result.text.length}`);
    console.log(`  - Token usage: ${JSON.stringify(result.usage)}`);
    if (result.reasoning) {
      console.log(`  - Reasoning length: ${result.reasoning.length}`);
    }

    return result;
  }

  /**
   * Charge le prompt système depuis le fichier
   */
  private async loadSystemPrompt(): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');
    
    console.log(`[Orchestrator] Loading system prompt...`);
    
    try {
      // Essayer d'abord la version 3.2 améliorée
      let promptPath = path.resolve(
        process.cwd(),
        '..',
        'docs',
        'KnowledgeHub',
        'Obsidian',
        'Prompts',
        'Agent Orchestrateur v3.2.md'
      );
      
      if (fs.existsSync(promptPath)) {
        const content = fs.readFileSync(promptPath, 'utf-8');
        console.log(`[Orchestrator] ✅ Loaded v3.2 prompt: ${content.length} chars`);
        return content;
      }

      // Fallback sur la version originale
      promptPath = path.resolve(
        process.cwd(),
        '..',
        'docs',
        'KnowledgeHub',
        'Obsidian',
        'Prompts',
        'Agent Orchestrateur.md'
      );
      
      const content = fs.readFileSync(promptPath, 'utf-8');
      console.log(`[Orchestrator] ✅ Loaded original prompt: ${content.length} chars`);
      return content;
    } catch (error) {
      console.error('[Orchestrator] ❌ Failed to load system prompt:', error);
      const fallback = 'You are the Knowledge Hub Orchestrator. Always communicate what you are doing. Never return empty responses.';
      console.log(`[Orchestrator] Using fallback prompt: ${fallback.length} chars`);
      return fallback;
    }
  }
}
