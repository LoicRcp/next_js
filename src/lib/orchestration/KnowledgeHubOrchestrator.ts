import { generateText, streamText, tool, type Tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createReasoningModel, formatReasoningPrompt } from '../reasoning/reasoning-wrapper';
import { executeSearch, executeAddOrUpdate } from '../agent-caller';
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

    // Créer le modèle avec reasoning si activé
    const baseModel = google(this.config.model);
    this.model = this.config.enableReasoning 
      ? createReasoningModel(baseModel, { reasoningLevel: 'high' })
      : baseModel;
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

    return !nonStreamPatterns.some(p => p.test(query));
  }

  /**
   * Crée les outils de haut niveau pour l'orchestrateur
   */
  private createTools(integrationBatchId?: string, chatId?: string): Record<string, Tool<any, any>> {
    return {
      searchKnowledgeGraph: tool({
        description: "Recherche des informations dans le graphe de connaissances",
        parameters: z.object({
          query: z.string().describe("La requête de recherche")
        }),
        execute: async (args) => {
          console.log(`[Orchestrator] Executing search: ${args.query}`);
          return await executeSearch({
            query: args.query,
            integrationBatchId,
            chatId
          });
        }
      }),
      
      addOrUpdateKnowledge: tool({
        description: "Ajoute ou met à jour des informations dans le graphe",
        parameters: z.object({
          information: z.string().describe("L'information à intégrer")
        }),
        execute: async (args) => {
          console.log(`[Orchestrator] Executing add/update: ${args.information}`);
          return await executeAddOrUpdate({
            information: args.information,
            integrationBatchId,
            chatId
          });
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
    const integrationBatchId = chatId ? `batch_${chatId}_${Date.now()}` : undefined;
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content as string;
    
    // Déterminer la méthode optimale
    const useStream = this.shouldStream(query);
    const tools = this.createTools(integrationBatchId, chatId);

    // Charger le prompt système de l'orchestrateur
    const systemPrompt = await this.loadSystemPrompt();

    if (useStream) {
      return this.processWithStream(messages, systemPrompt, tools);
    } else {
      return this.processWithGenerate(messages, systemPrompt, tools);
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
    return streamText({
      model: this.model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: this.config.maxSteps,
      onStepFinish: ({ toolCalls, toolResults, text }) => {
        console.log(`[Orchestrator] Step completed with ${toolCalls.length} tool calls`);
        
        // Vérifier qu'il y a toujours du contenu
        if (!text && toolCalls.length > 0) {
          console.warn('[Orchestrator] WARNING: Tool calls without text explanation detected');
        }
      },
      // S'assurer qu'il y a toujours une réponse
      experimental_continueSteps: true
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
    const result = await generateText({
      model: this.model,
      system: systemPrompt,
      messages,
      tools,
      maxSteps: this.config.maxSteps,
      onStepFinish: ({ toolCalls, toolResults }) => {
        console.log(`[Orchestrator] Step completed with ${toolCalls.length} tool calls`);
      }
    });

    return result;
  }

  /**
   * Charge le prompt système depuis le fichier
   */
  private async loadSystemPrompt(): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');
    
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
        return fs.readFileSync(promptPath, 'utf-8');
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
      
      return fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
      console.error('[Orchestrator] Failed to load system prompt:', error);
      return 'You are the Knowledge Hub Orchestrator. Always communicate what you are doing. Never return empty responses.';
    }
  }
}