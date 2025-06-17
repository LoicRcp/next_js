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

// Helper pour exécuter les outils MCP avec logging amélioré
async function executeMcpToolForAgent(toolName: string, args: any): Promise<any> {
  const startTime = Date.now();
  
  console.log(`\n==== [Agent] MCP Tool Call: ${toolName} ====`);
  console.log(`[Agent] Tool args:`, JSON.stringify(args, null, 2));
  
  try {
    const mcpClient = await getMcpClient();
    console.log(`[Agent] MCP client obtained, calling tool...`);
    
    const result = await mcpClient.callTool({ name: toolName, args });
    
    const duration = Date.now() - startTime;
    console.log(`[Agent] ✅ Tool ${toolName} completed in ${duration}ms`);
    
    // Log plus détaillé du résultat
    if (result?.result) {
      console.log(`[Agent] Result type: ${typeof result.result}`);
      if (typeof result.result === 'string') {
        try {
          const parsed = JSON.parse(result.result);
          console.log(`[Agent] Parsed result keys: [${Object.keys(parsed).join(', ')}]`);
          if (parsed.data && typeof parsed.data === 'object') {
            console.log(`[Agent] Data keys: [${Object.keys(parsed.data).join(', ')}]`);
          }
          if (parsed.formatted_text) {
            console.log(`[Agent] Formatted text length: ${parsed.formatted_text.length} chars`);
          }
        } catch {
          console.log(`[Agent] Raw string result length: ${result.result.length} chars`);
        }
      } else if (typeof result.result === 'object') {
        console.log(`[Agent] Object result keys: [${Object.keys(result.result).join(', ')}]`);
      }
    }
    
    monitor.record({
      type: 'tool_call',
      duration: duration,
      metadata: { toolName, success: true }
    });
    
    console.log(`==== [Agent] Tool Call Complete: ${toolName} ====\n`);
    
    return result?.result ?? result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Agent] ❌ Tool ${toolName} failed after ${duration}ms:`, error.message);
    
    monitor.record({
      type: 'error',
      error: error.message,
      metadata: { toolName }
    });
    
    console.log(`==== [Agent] Tool Call Failed: ${toolName} ====\n`);
    throw error;
  }
}

/**
 * Exécute une recherche optimisée via l'Agent Lecteur avec logging amélioré
 */
export async function executeSearch(args: { 
  query: string; 
  integrationBatchId?: string; 
  chatId?: string; 
}): Promise<AgentCallResult> {
  const startTime = Date.now();
  console.log(`\n==== [Reader Agent] Starting Search ====`);
  console.log(`[Reader] Query: "${args.query}"`);
  console.log(`[Reader] BatchId: ${args.integrationBatchId}`);
  console.log(`[Reader] ChatId: ${args.chatId}`);
  
  try {
    const taskDescription = `Recherche : ${args.query}
Utilise les outils appropriés pour trouver toutes les informations pertinentes.
Si des nœuds pending existent, inclus-les avec includePending:true.`;

    console.log(`[Reader] Task description: "${taskDescription.substring(0, 100)}..."`);

    const messages: CoreMessage[] = [{ role: 'user', content: taskDescription }];

    console.log(`[Reader] Starting LLM call with generateText...`);
    
    // Utiliser generateText pour les recherches (coordination des outils)
    const result = await retryManager.executeWithRetry(async (model) => {
      console.log(`[Reader] Using model: ${model.modelId || 'unknown'}`);
      
      // Appliquer le reasoning au modèle
      const reasoningModel = createReasoningModel(model, { reasoningLevel: 'medium' });
      
      return await generateText({
        model: reasoningModel,
        system: READER_SYSTEM_PROMPT,
        messages,
        tools: createReaderTools(),
        maxSteps: 5, // Réduit de 100 à 5
        onStepFinish: ({ toolCalls, stepType, text }) => {
          console.log(`[Reader] Step finished - Type: ${stepType}, Tools: ${toolCalls.length}, Text: ${text ? text.length : 0} chars`);
          toolCalls.forEach((tc, index) => {
            console.log(`[Reader] Tool ${index + 1}: ${tc.toolName}`);
            if (tc.args) {
              console.log(`[Reader] Tool args preview: ${JSON.stringify(tc.args).substring(0, 100)}...`);
            }
          });
        }
      });
    });

    const duration = Date.now() - startTime;
    const totalTokens = (result.usage.promptTokens || 0) + (result.usage.completionTokens || 0);
    
    console.log(`[Reader] ✅ LLM completed in ${duration}ms`);
    console.log(`[Reader] Token usage: ${totalTokens} total (${result.usage.promptTokens} prompt + ${result.usage.completionTokens} completion)`);
    console.log(`[Reader] Response length: ${result.text.length} chars`);
    
    if (result.reasoning) {
      console.log(`[Reader] Reasoning length: ${result.reasoning.length} chars`);
    }

    monitor.record({
      type: 'success',
      duration: duration,
      tokens: {
        prompt: result.usage.promptTokens,
        completion: result.usage.completionTokens,
        total: totalTokens
      },
      metadata: { agent: 'reader' }
    });

    // Parser le résultat avec logging
    try {
      console.log(`[Reader] Attempting to parse JSON response...`);
      const parsed = JSON.parse(result.text);
      console.log(`[Reader] ✅ JSON parsed successfully`);
      console.log(`[Reader] Parsed keys: [${Object.keys(parsed).join(', ')}]`);
      
      const response = {
        success: parsed.success ?? true,
        data: parsed.retrieval_plan,
        summary_text: parsed.summary_text || result.text,
        reasoning: result.reasoning,
        usage: result.usage
      };
      
      console.log(`==== [Reader Agent] Search Complete (${duration}ms) ====\n`);
      return response;
    } catch (parseError) {
      console.log(`[Reader] ⚠️ JSON parse failed, using raw text response`);
      const response = {
        success: true,
        summary_text: result.text,
        reasoning: result.reasoning,
        usage: result.usage
      };
      
      console.log(`==== [Reader Agent] Search Complete (${duration}ms) ====\n`);
      return response;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Reader] ❌ Search failed after ${duration}ms:`, error.message);
    
    monitor.record({
      type: 'error',
      error: error.message,
      metadata: { agent: 'reader' }
    });
    
    console.log(`==== [Reader Agent] Search Failed (${duration}ms) ====\n`);
    
    return {
      success: false,
      error: `Erreur de recherche: ${error.message}`
    };
  }
}

/**
 * Exécute l'ajout/mise à jour avec workflow Read-Before-Write optimisé et logging amélioré
 */
export async function executeAddOrUpdate(args: {
  information: string;
  integrationBatchId?: string;
  chatId?: string;
}): Promise<AgentCallResult> {
  const startTime = Date.now();
  console.log(`\n==== [Integrator Agent] Starting Integration ====`);
  console.log(`[Integrator] Information: "${args.information.substring(0, 100)}..."`);
  console.log(`[Integrator] BatchId: ${args.integrationBatchId}`);
  console.log(`[Integrator] ChatId: ${args.chatId}`);
  
  try {
    // ÉTAPE 1 : Analyse rapide via Lecteur
    console.log(`[Integrator] === PHASE 1: Read Before Write ===`);
    const readTask = `Vérifie l'existence des entités mentionnées dans : "${args.information}"
Recherche uniquement les entités principales (projets, personnes, organisations).
Retourne leurs IDs si trouvés.`;

    console.log(`[Integrator] Read task: "${readTask.substring(0, 100)}..."`);
    
    const readMessages: CoreMessage[] = [{ role: 'user', content: readTask }];
    
    console.log(`[Integrator] Starting read phase...`);
    const readResult = await retryManager.executeWithRetry(async (model) => {
      const reasoningModel = createReasoningModel(model, { reasoningLevel: 'low' });
      return await generateText({
        model: reasoningModel,
        system: READER_SYSTEM_PROMPT,
        messages: readMessages,
        tools: createReaderTools(),
        maxSteps: 3,
        onStepFinish: ({ toolCalls, stepType }) => {
          console.log(`[Integrator-Read] Step: ${stepType}, Tools: ${toolCalls.length}`);
        }
      });
    });

    const readDuration = Date.now() - startTime;
    console.log(`[Integrator] ✅ Read phase completed in ${readDuration}ms`);
    console.log(`[Integrator] Read analysis length: ${readResult.text.length} chars`);

    // ÉTAPE 2 : Intégration avec contexte
    console.log(`[Integrator] === PHASE 2: Write Integration ===`);
    const writeTask = `Intègre : "${args.information}"
Contexte de l'analyse :
${readResult.text}

Instructions :
- Utilise les IDs fournis pour les entités existantes
- Crée les nouvelles entités nécessaires
- Établis toutes les relations pertinentes`;

    console.log(`[Integrator] Write task length: ${writeTask.length} chars`);

    const writeMessages: CoreMessage[] = [{ role: 'user', content: writeTask }];
    
    console.log(`[Integrator] Starting write phase...`);
    const writeResult = await retryManager.executeWithRetry(async (model) => {
      const reasoningModel = createReasoningModel(model, { reasoningLevel: 'high' });
      return await generateText({
        model: reasoningModel,
        system: INTEGRATOR_SYSTEM_PROMPT,
        messages: writeMessages,
        tools: createIntegratorTools(),
        maxSteps: 7,
        onStepFinish: ({ toolCalls, stepType, text }) => {
          console.log(`[Integrator-Write] Step: ${stepType}, Tools: ${toolCalls.length}, Text: ${text ? text.length : 0} chars`);
          toolCalls.forEach((tc, index) => {
            console.log(`[Integrator-Write] Tool ${index + 1}: ${tc.toolName}`);
          });
        }
      });
    });

    const writeDuration = Date.now() - startTime - readDuration;
    const totalDuration = Date.now() - startTime;
    const totalTokens = (writeResult.usage.promptTokens || 0) + (writeResult.usage.completionTokens || 0);
    
    console.log(`[Integrator] ✅ Write phase completed in ${writeDuration}ms`);
    console.log(`[Integrator] Total integration time: ${totalDuration}ms`);
    console.log(`[Integrator] Token usage: ${totalTokens} total`);
    console.log(`[Integrator] Write result length: ${writeResult.text.length} chars`);

    monitor.record({
      type: 'success',
      duration: totalDuration,
      tokens: {
        prompt: writeResult.usage.promptTokens,
        completion: writeResult.usage.completionTokens,
        total: totalTokens,
      },
      metadata: { agent: 'integrator' }
    });

    // Post-traitement pour les batches avec logging
    if (args.integrationBatchId) {
      console.log(`[Integrator] === PHASE 3: Batch Post-Processing ===`);
      await postProcessBatch(args.integrationBatchId, writeResult.text, args.chatId);
    }

    const response = {
      success: true,
      data: {
        readAnalysis: readResult.text,
        integrationResult: writeResult.text,
        reasoning: writeResult.reasoning
      },
      summary_text: "Information intégrée avec succès",
      usage: writeResult.usage
    };

    console.log(`==== [Integrator Agent] Integration Complete (${totalDuration}ms) ====\n`);
    return response;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Integrator] ❌ Integration failed after ${duration}ms:`, error.message);
    
    monitor.record({
      type: 'error',
      error: error.message,
      metadata: { agent: 'integrator' }
    });
    
    console.log(`==== [Integrator Agent] Integration Failed (${duration}ms) ====\n`);
    
    return {
      success: false,
      error: `Erreur d'intégration: ${error.message}`
    };
  }
}

// Fonction pour post-traiter les batches avec logging amélioré
async function postProcessBatch(
  integrationBatchId: string, 
  resultText: string,
  chatId?: string
): Promise<void> {
  console.log(`[Batch] Post-processing batch: ${integrationBatchId}`);
  
  try {
    console.log(`[Batch] Parsing integration result...`);
    const parsed = JSON.parse(resultText);
    const nodeIds = parsed.batchOperations?.nodesCreated?.map((n: any) => n.id) || [];
    
    console.log(`[Batch] Found ${nodeIds.length} nodes to mark with batch ID`);

    // Marquer les nœuds avec le batch ID
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      if (nodeId) {
        console.log(`[Batch] Marking node ${i + 1}/${nodeIds.length}: ${nodeId}`);
        
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
    console.log(`[Batch] Creating/updating IntegrationBatch node...`);
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
    
    console.log(`[Batch] ✅ Post-processing completed for batch: ${integrationBatchId}`);
    
  } catch (error) {
    console.error('[Batch] ❌ Error processing batch:', error);
  }
}

// Création des outils pour le Lecteur
function createReaderTools(): Record<string, Tool<any, any>> {
  return {
    // Outils d'analyse structurelle (NOUVEAUX)
    getGraphSchema: tool({
      description: "Obtient la structure globale du graphe (labels, types de relations)",
      parameters: z.object({
        detailLevel: z.enum(["basic", "detailed"]).optional().default("detailed"),
        focusLabel: z.string().optional(),
        focusRelationType: z.string().optional()
      }),
      execute: async (args) => executeMcpToolForAgent('getGraphSchema', args)
    }),
    
    queryGraph: tool({
      description: "Exécute une requête Cypher personnalisée pour analyser la structure",
      parameters: z.object({
        query: z.string(),
        params: z.string().optional().default("{}"),
        explanation: z.string().optional()
      }),
      execute: async (args) => executeMcpToolForAgent('queryGraph', args)
    }),
    
    // Outils de recherche existants
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
    }),
    
    // Outil pour compter les éléments
    aggregateNeighborProperties: tool({
      description: "Calcule des agrégats sur les propriétés des nœuds voisins",
      parameters: z.object({
        nodeQuery: z.string(),
        relationshipType: z.string().optional(),
        direction: z.enum(["OUTGOING", "INCOMING", "BOTH"]).optional().default("OUTGOING"),
        neighborLabel: z.string().optional(),
        propertyToAggregate: z.string(),
        aggregation: z.enum(["COUNT", "SUM", "AVG", "MIN", "MAX", "COLLECT"]).optional().default("COUNT")
      }),
      execute: async (args) => executeMcpToolForAgent('aggregateNeighborProperties', args)
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
