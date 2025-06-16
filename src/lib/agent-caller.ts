import { generateText, streamText, tool, type Tool, type CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getMcpClient } from './mcp-client';
import { RetryManager } from './resilience/retry-manager';
import { monitor } from './monitoring/performance-monitor';
import { createReasoningModel } from './reasoning/reasoning-wrapper';
import fs from 'fs';
import path from 'path';

// Configuration
const geminiModelId = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash';
const retryManager = new RetryManager();

// Types
export interface SearchArgs {
  query: string;
  integrationBatchId?: string;
  chatId?: string;
}

export interface AddOrUpdateArgs {
  information: string;
  integrationBatchId?: string;
  chatId?: string;
}

export interface AgentCallResult {
  success: boolean;
  data?: any;
  error?: string;
  summary_text?: string;
  reasoning?: string;
  usage?: any;
}

// Helper pour charger les prompts
function loadPrompt(fileName: string): string {
  const promptPath = path.resolve(
    process.cwd(),
    '../',
    'docs',
    'KnowledgeHub',
    'Obsidian',
    'Prompts',
    fileName
  );
  try {
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (err) {
    console.error(`[Agent Caller] Failed to load prompt: ${fileName}`, err);
    return `PROMPT LOAD ERROR: ${fileName}`;
  }
}

// Prompts des agents
const READER_SYSTEM_PROMPT = loadPrompt('Agent Lecteur.md');
const INTEGRATOR_SYSTEM_PROMPT = loadPrompt('Agent Integrateur.md');

// Helper pour exécuter les outils MCP
async function executeMcpToolForAgent(toolName: string, args: any): Promise<any> {
  const startTime = Date.now();
  
  try {
    const mcpClient = await getMcpClient();
    const result = await mcpClient.callTool({ name: toolName, args });
    
    monitor.record({
      type: 'tool_call',
      duration: Date.now() - startTime,
      metadata: { toolName, success: true }
    });
    
    return result?.result ?? result;
  } catch (error: any) {
    monitor.record({
      type: 'error',
      error: error.message,
      metadata: { toolName }
    });
    throw error;
  }
}

/**
 * Exécute une recherche optimisée via l'Agent Lecteur
 */
export async function executeSearch(args: { 
  query: string; 
  integrationBatchId?: string; 
  chatId?: string; 
}): Promise<AgentCallResult> {
  const startTime = Date.now();
  console.log("[Agent Search] Starting search:", args.query);

  try {
    const taskDescription = `Recherche : ${args.query}
    
Utilise les outils appropriés pour trouver toutes les informations pertinentes.
Si des nœuds pending existent, inclus-les avec includePending:true.`;

    const messages: CoreMessage[] = [{ role: 'user', content: taskDescription }];
    
    // Utiliser generateText pour les recherches (coordination des outils)
    const result = await retryManager.executeWithRetry(async (model) => {
      // Appliquer le reasoning au modèle
      const reasoningModel = createReasoningModel(model, { reasoningLevel: 'medium' });
      
      return await generateText({
        model: reasoningModel,
        system: READER_SYSTEM_PROMPT,
        messages,
        tools: createReaderTools(),
        maxSteps: 5, // Réduit de 100 à 5
        onStepFinish: ({ toolCalls }) => {
          toolCalls.forEach(tc => {
            console.log(`[Reader] Tool called: ${tc.toolName}`);
          });
        }
      });
    });

    const totalTokens = (result.usage.promptTokens || 0) + (result.usage.completionTokens || 0);

    monitor.record({
      type: 'success',
      duration: Date.now() - startTime,
      tokens: {
        prompt: result.usage.promptTokens,
        completion: result.usage.completionTokens,
        total: totalTokens
      },
      metadata: { agent: 'reader' }
    });

    // Parser le résultat
    try {
      const parsed = JSON.parse(result.text);
      return {
        success: parsed.success ?? true,
        data: parsed.retrieval_plan,
        summary_text: parsed.summary_text || result.text,
        reasoning: result.reasoning,
        usage: result.usage
      };
    } catch {
      return {
        success: true,
        summary_text: result.text,
        reasoning: result.reasoning,
        usage: result.usage
      };
    }
  } catch (error: any) {
    monitor.record({
      type: 'error',
      error: error.message,
      metadata: { agent: 'reader' }
    });
    
    return {
      success: false,
      error: `Erreur de recherche: ${error.message}`
    };
  }
}

/**
 * Exécute l'ajout/mise à jour avec workflow Read-Before-Write optimisé
 */
export async function executeAddOrUpdate(args: {
  information: string;
  integrationBatchId?: string;
  chatId?: string;
}): Promise<AgentCallResult> {
  const startTime = Date.now();
  console.log("[Agent AddUpdate] Starting integration:", args.information);

  try {
    // ÉTAPE 1 : Analyse rapide via Lecteur
    const readTask = `Vérifie l'existence des entités mentionnées dans : "${args.information}"
    
Recherche uniquement les entités principales (projets, personnes, organisations).
Retourne leurs IDs si trouvés.`;

    const readMessages: CoreMessage[] = [{ role: 'user', content: readTask }];
    
    const readResult = await retryManager.executeWithRetry(async (model) => {
      const reasoningModel = createReasoningModel(model, { reasoningLevel: 'low' });
      
      return await generateText({
        model: reasoningModel,
        system: READER_SYSTEM_PROMPT,
        messages: readMessages,
        tools: createReaderTools(),
        maxSteps: 3
      });
    });

    // ÉTAPE 2 : Intégration avec contexte
    const writeTask = `Intègre : "${args.information}"

Contexte de l'analyse :
${readResult.text}

Instructions :
- Utilise les IDs fournis pour les entités existantes
- Crée les nouvelles entités nécessaires
- Établis toutes les relations pertinentes`;

    const writeMessages: CoreMessage[] = [{ role: 'user', content: writeTask }];
    
    const writeResult = await retryManager.executeWithRetry(async (model) => {
      const reasoningModel = createReasoningModel(model, { reasoningLevel: 'high' });
      
      return await generateText({
        model: reasoningModel,
        system: INTEGRATOR_SYSTEM_PROMPT,
        messages: writeMessages,
        tools: createIntegratorTools(),
        maxSteps: 7
      });
    });

    const totalTokens = (writeResult.usage.promptTokens || 0) + (writeResult.usage.completionTokens || 0);
    monitor.record({
      type: 'success',
      duration: Date.now() - startTime,
      tokens: {
        prompt: writeResult.usage.promptTokens,
        completion: writeResult.usage.completionTokens,
        total: totalTokens,
      },
      metadata: { agent: 'integrator' }
    });

    // Post-traitement pour les batches
    if (args.integrationBatchId) {
      await postProcessBatch(args.integrationBatchId, writeResult.text, args.chatId);
    }

    return {
      success: true,
      data: {
        readAnalysis: readResult.text,
        integrationResult: writeResult.text,
        reasoning: writeResult.reasoning
      },
      summary_text: "Information intégrée avec succès",
      usage: writeResult.usage
    };

  } catch (error: any) {
    monitor.record({
      type: 'error',
      error: error.message,
      metadata: { agent: 'integrator' }
    });
    
    return {
      success: false,
      error: `Erreur d'intégration: ${error.message}`
    };
  }
}

// Fonction pour post-traiter les batches
async function postProcessBatch(
  integrationBatchId: string, 
  resultText: string,
  chatId?: string
): Promise<void> {
  try {
    const parsed = JSON.parse(resultText);
    const nodeIds = parsed.batchOperations?.nodesCreated?.map((n: any) => n.id) || [];
    
    // Marquer les nœuds avec le batch ID
    for (const nodeId of nodeIds) {
      if (nodeId) {
        await executeMcpToolForAgent('updateNodeProperties', {
          nodeQuery: JSON.stringify({ id: nodeId }),
          properties: JSON.stringify({
            integrationStatus: 'pending',
            integrationBatchId
          }),
          operation: 'set'
        });
      }
    }
    
    // Créer/MAJ le nœud IntegrationBatch
    await executeMcpToolForAgent('createNode', {
      label: 'IntegrationBatch',
      properties: JSON.stringify({
        batchId: integrationBatchId,
        status: 'pending',
        lastSummary: parsed.newSummary || '',
        conversationId: chatId,
        sourceType: 'batch_manager'
      }),
      identifyingProperties: JSON.stringify(['batchId'])
    });
  } catch (error) {
    console.error('[PostProcess] Error processing batch:', error);
  }
}
// Création des outils pour le Lecteur
function createReaderTools(): Record<string, Tool<any, any>> {
  return {
    findNodes: tool({
      description: "Recherche des nœuds par label et propriétés",
      parameters: z.object({
        label: z.string(),
        properties: z.string().optional().default("{}"),
        limit: z.number().optional().default(10)
      }),
      execute: async (args) => executeMcpToolForAgent('findNodes', args)
    }),
    
    searchWithContext: tool({
      description: "Recherche contextuelle avec boost de pertinence",
      parameters: z.object({
        query: z.string(),
        contextNodeIds: z.array(z.string()).optional().default([]),
        includePending: z.boolean().optional().default(false),
        limit: z.number().optional().default(10)
      }),
      execute: async (args) => executeMcpToolForAgent('searchWithContext', args)
    }),
    
    getNodeDetails: tool({
      description: "Récupère les détails d'un nœud",
      parameters: z.object({
        nodeQuery: z.string(),
        detailLevel: z.enum(["core", "fullProperties"]).optional().default("core")
      }),
      execute: async (args) => executeMcpToolForAgent('getNodeDetails', args)
    }),
    
    getNeighborSummary: tool({
      description: "Résumé des nœuds voisins",
      parameters: z.object({
        nodeQuery: z.string(),
        relationshipType: z.string().optional().default(""),
        direction: z.enum(["OUTGOING", "INCOMING", "BOTH"]).optional().default("OUTGOING"),
        propertiesToReturn: z.string().optional().default("name,status,summary"),
        limit: z.number().optional().default(20)
      }),
      execute: async (args) => executeMcpToolForAgent('getNeighborSummary', args)
    })
  };
}

// Création des outils pour l'Intégrateur
function createIntegratorTools(): Record<string, Tool<any, any>> {
  return {
    findNodes: tool({
      description: "Vérifier l'existence de nœuds",
      parameters: z.object({
        label: z.string(),
        properties: z.string().optional().default("{}"),
        limit: z.number().optional().default(5)
      }),
      execute: async (args) => executeMcpToolForAgent('findNodes', args)
    }),
    
    createNode: tool({
      description: "Créer un nouveau nœud",
      parameters: z.object({
        label: z.string(),
        properties: z.string(),
        identifyingProperties: z.string().optional().default('[]')
      }),
      execute: async (args) => executeMcpToolForAgent('createNode', args)
    }),
    
    createRelationship: tool({
      description: "Créer une relation entre nœuds",
      parameters: z.object({
        startNodeQuery: z.string(),
        endNodeQuery: z.string(),
        relationshipType: z.string(),
        properties: z.string().optional().default("{}")
      }),
      execute: async (args) => executeMcpToolForAgent('createRelationship', args)
    }),
    
    updateNodeProperties: tool({
      description: "Mettre à jour les propriétés d'un nœud",
      parameters: z.object({
        nodeQuery: z.string(),
        properties: z.string(),
        operation: z.enum(["set", "replace", "remove"]).optional().default("set")
      }),
      execute: async (args) => executeMcpToolForAgent('updateNodeProperties', args)
    }),
    
    batchOperations: tool({
      description: "Exécuter plusieurs opérations atomiquement",
      parameters: z.object({
        operations: z.array(z.object({
          tool: z.string(),
          params: z.any()
        })),
        transactional: z.boolean().optional().default(true)
      }),
      execute: async (args) => executeMcpToolForAgent('batchOperations', args)
    })
  };
}