import { google } from '@ai-sdk/google';
import { generateText, tool, type Tool, type CoreMessage } from 'ai';
import { z } from 'zod';
import { getMcpClient } from './mcp-client';
import fs from 'fs';
import path from 'path';

// --- Définition des types (inchangés) ---
interface AgentCallArgs {
  taskDescription: string;
  integrationBatchId?: string;
  hasExistingPendingData?: boolean;
  lastSummary?: string;
  chatId?: string;
}

interface AgentCallResult {
  success: boolean;
  data?: any;
  error?: string;
  summary_text?: string;
}

// --- Configuration (inchangée) ---
const geminiModelId = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash';

// --- Prompts (IMPORTS FROM .md FILES) ---

// Helper to load prompt content synchronously at startup
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

const READER_SYSTEM_PROMPT = loadPrompt('Agent Lecteur.md');
const INTEGRATOR_SYSTEM_PROMPT_A = loadPrompt('Agent Integrateur.md');
const INTEGRATOR_SYSTEM_PROMPT_B = loadPrompt('Agent Integrateur.md');
// --------------------------------------------------------------------







async function checkExistingPendingData(integrationBatchId: string): Promise<{
  hasData: boolean;
  nodeCount: number;
}> {
  try {
    const result = await executeMcpToolForAgent('findNodes', {
      label: 'InformationFragment',
      properties: JSON.stringify({
        integrationBatchId: integrationBatchId,
        integrationStatus: 'pending'
      }),
      limit: 1
    });
    
    const nodeCount = result?.data?.count || 0;
    return {
      hasData: nodeCount > 0,
      nodeCount: nodeCount
    };
  } catch (error) {
    console.error(`[Batch Check] Error checking pending data:`, error);
    return { hasData: false, nodeCount: 0 };
  }
}

// Helper pour récupérer le lastSummary d'un batch
async function getBatchSummary(integrationBatchId: string): Promise<string> {
  try {
    const result = await executeMcpToolForAgent('findNodes', {
      label: 'IntegrationBatch',
      properties: JSON.stringify({
        batchId: integrationBatchId
      }),
      limit: 1
    });
    
    if (result?.data?.nodes && result.data.nodes.length > 0) {
      return result.data.nodes[0].lastSummary || '';
    }
    return '';
  } catch (error) {
    console.error(`[Batch Summary] Error retrieving batch summary:`, error);
    return '';
  }
}

// Helper pour marquer les nœuds comme pending
async function markNodesAsPending(nodeIds: string[], integrationBatchId: string): Promise<void> {
  for (const nodeId of nodeIds) {
    try {
      await executeMcpToolForAgent('updateNodeProperties', {
        nodeQuery: JSON.stringify({ id: nodeId }),
        properties: JSON.stringify({
          integrationBatchId: integrationBatchId,
          integrationStatus: 'pending'
        }),
        operation: 'set'
      });
      console.log(`[Batch Marking] Node ${nodeId} marked as pending for batch ${integrationBatchId}`);
    } catch (error) {
      console.error(`[Batch Marking] Failed to mark node ${nodeId}:`, error);
    }
  }
}

// Helper pour créer ou mettre à jour le nœud IntegrationBatch
async function manageBatchNode(
  integrationBatchId: string, 
  newSummary: string,
  isNewBatch: boolean,
  chatId?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  if (isNewBatch) {
    // Créer un nouveau nœud IntegrationBatch
    try {
      await executeMcpToolForAgent('createNode', {
        label: 'IntegrationBatch',
        properties: JSON.stringify({
          batchId: integrationBatchId,
          status: 'pending',
          lastSummary: newSummary,
          conversationId: chatId,
          sourceType: 'batch_manager'
        }),
        identifyingProperties: JSON.stringify(['batchId'])
      });
      console.log(`[Batch Node] Created new IntegrationBatch: ${integrationBatchId}`);
    } catch (error) {
      console.error(`[Batch Node] Failed to create batch node:`, error);
    }
  } else {
    // Mettre à jour le nœud existant
    try {
      await executeMcpToolForAgent('updateNodeProperties', {
        nodeQuery: JSON.stringify({ 
          label: 'IntegrationBatch',
          property: 'batchId',
          value: integrationBatchId 
        }),
        properties: JSON.stringify({
          lastSummary: newSummary,
          lastUpdatedAt: now
        }),
        operation: 'set'
      });
      console.log(`[Batch Node] Updated IntegrationBatch: ${integrationBatchId}`);
    } catch (error) {
      console.error(`[Batch Node] Failed to update batch node:`, error);
    }
  }
}







// --- Fonction d'exécution MCP (inchangée) ---
async function executeMcpToolForAgent(toolName: string, args: any): Promise<any> {
    console.log(`[Agent Caller] Attempting to execute MCP tool '${toolName}' for specialized agent...`);
    console.log(`[Agent Caller] Args:`, args);
    const mcpClient = await getMcpClient();
    if (!mcpClient) {
        console.error(`[Agent Caller] Failed to get MCP Client for tool '${toolName}'.`);
        throw new Error(`Tool server connection failed for tool '${toolName}'.`);
    }
    try {
        const toolResponse: any = await mcpClient.callTool({ name: toolName, args: args });
        console.log(`[Agent Caller] Received response from MCP tool '${toolName}'.`);
        if (toolResponse?.error) {
            const errorCode = toolResponse.error.code ?? 'N/A';
            const errorMessage = toolResponse.error.message ?? 'Unknown tool error';
            console.error(`[Agent Caller] MCP Tool Error [${toolName}]: Code ${errorCode} - ${errorMessage}`);
            throw new Error(`Tool execution failed: ${errorMessage} (Code: ${errorCode})`);
        }
        const finalResult = toolResponse?.result ?? toolResponse;
        console.log(`[Agent Caller] MCP Tool '${toolName}' executed successfully.`);
        return finalResult;
    } catch (error: any) {
        console.error(`[Agent Caller] Error during MCP call for tool '${toolName}':`, error);
        throw new Error(`MCP communication error for '${toolName}': ${error.message}`);
    }
}

// --- Schémas Zod pour les Outils MCP (Copiés/Adaptés depuis l'ancien route.ts) ---

// --- Outils de Advanced Graph Tools (Paramètres en camelCase) ---
const getNeighborSummaryToolSchema = z.object({
    nodeQuery: z.string()
      .describe("Critères pour identifier le nœud central (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    relationshipType: z.string().optional().default("")
      .describe("Type de relation à suivre (optionnel, laisser vide pour toutes les relations)"),
    direction: z.enum(["OUTGOING", "INCOMING", "BOTH"]).optional().default("OUTGOING")
      .describe("Direction des relations (OUTGOING, INCOMING, BOTH)"),
    neighborLabel: z.string().optional().default("")
      .describe("Label des nœuds voisins (optionnel, laisser vide pour tous les labels)"),
    propertiesToReturn: z.string().optional().default("id,title")
      .describe("Liste des propriétés à inclure dans le résumé, séparées par des virgules. Exemple: 'id,title,status'"),
    limit: z.number().int().optional().default(50)
      .describe("Nombre maximum de voisins à retourner")
});

const findPathsToolSchema = z.object({
    startNodeQuery: z.string()
      .describe("Critères pour identifier le nœud de départ (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    endNodeQuery: z.string()
      .describe("Critères pour identifier le nœud d'arrivée (JSON string). Format : '{\"id\":\"uuid-456\"}' ou '{\"label\":\"Tâche\", \"property\":\"title\", \"value\":\"Implémenter API\"}'"),
    relationshipTypes: z.string().optional().default("")
      .describe("Types de relations à suivre, séparés par des virgules. Exemple: 'DEPENDS_ON,RELATED_TO'. Laisser vide pour tous les types."),
    maxDepth: z.number().int().min(1).max(5).optional().default(3)
      .describe("Profondeur maximale de recherche"),
    limit: z.number().int().min(1).max(10).optional().default(3)
      .describe("Nombre maximum de chemins à retourner")
});

const aggregateNeighborPropertiesToolSchema = z.object({
    nodeQuery: z.string()
      .describe("Critères pour identifier le nœud central (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    relationshipType: z.string().optional().default("")
      .describe("Type de relation à suivre (optionnel, laisser vide pour toutes les relations)"),
    direction: z.enum(["OUTGOING", "INCOMING", "BOTH"]).optional().default("OUTGOING")
      .describe("Direction des relations (OUTGOING, INCOMING, BOTH)"),
    neighborLabel: z.string().optional().default("")
      .describe("Label des nœuds voisins (optionnel, laisser vide pour tous les labels)"),
    propertyToAggregate: z.string()
      .describe("Propriété sur laquelle calculer l'agrégat"),
    aggregation: z.enum(["COUNT", "SUM", "AVG", "MIN", "MAX", "COLLECT"]).optional().default("COUNT")
      .describe("Type d'agrégation à effectuer")
});

const findNodesToolSchema = z.object({
    label: z.string().describe("Label du nœud à rechercher."),
    properties: z.string().optional().default("{}").describe("Propriétés pour filtrer (JSON string). Recherche par 'id' (UUID) ou propriétés métier. Exemple: '{\"id\":\"uuid-123\"}' ou '{\"status\":\"En cours\"}'"),
    limit: z.number().int().optional().default(10).describe("Nombre maximum de résultats.")
});

const getNodeDetailsToolSchema = z.object({
    nodeQuery: z.string()
      .describe("Critères d'identification du nœud (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    detailLevel: z.enum(["core", "fullProperties"]).optional().default("core") // Modifié pour correspondre à l'implémentation
      .describe("Niveau de détail souhaité ('core' ou 'fullProperties').")
});

const searchNodesByTextToolSchema = z.object({
    indexName: z.string().default("nodeContentIndex")
      .describe("Nom de l'index Full-Text à utiliser (ex: 'nodeContentIndex')."),
    queryText: z.string()
      .describe("Texte ou requête de recherche."),
    limit: z.number().int().optional().default(10)
      .describe("Nombre maximum de résultats."),
    minScore: z.number().optional().default(0.0)
      .describe("Score de pertinence minimum.")
});

const searchWithContextToolSchema = z.object({
    query: z.string()
      .describe("Requête textuelle pour la recherche"),
    contextNodeIds: z.array(z.string()).optional().default([])
      .describe("IDs des nœuds de contexte pour améliorer la pertinence"),
    includePending: z.boolean().optional().default(false)
      .describe("Inclure les nœuds en attente d'intégration (integrationStatus: 'pending')"),
    limit: z.number().int().optional().default(10)
      .describe("Nombre maximum de résultats à retourner")
});

const batchOperationsToolSchema = z.object({
    operations: z.array(z.object({
      tool: z.string().describe("Nom de l'outil MCP à exécuter (ex: createNode, createRelationship)"),
      params: z.any().describe("Paramètres spécifiques à l'outil invoqué")
    })).describe("Liste des opérations à exécuter en lot."),
    transactional: z.boolean().optional().default(true).describe("Si true, toutes les opérations sont exécutées dans une seule transaction.")
});

// --- Outils de Graph Tools ---
const queryGraphToolSchema = z.object({
    query: z.string().describe("Requête Cypher à exécuter"),
    params: z.string().optional().default("{}").describe("Paramètres JSON de la requête."),
    explanation: z.string().optional().default("").describe("Explication de la requête.")
});

const updateGraphToolSchema = z.object({
    query: z.string().describe("Requête Cypher de modification."),
    params: z.string().optional().default("{}").describe("Paramètres JSON."),
    explanation: z.string().optional().default("").describe("Explication de la modification.")
});

const getGraphSchemaToolSchema = z.object({
    detailLevel: z.enum(["basic", "detailed"]).optional().default("basic").describe("Niveau de détail."),
    focusLabel: z.string().optional().default("").describe("Label spécifique (optionnel)."),
    focusRelationType: z.string().optional().default("").describe("Type de relation spécifique (optionnel).")
});

const createRelationshipToolSchema = z.object({
    startNodeQuery: z.string().describe("Critères JSON nœud source."),
    endNodeQuery: z.string().describe("Critères JSON nœud cible."),
    relationshipType: z.string().describe("Type de relation."),
    properties: z.string().optional().default("{}").describe("Propriétés JSON relation (optionnel).")
});

const updateNodePropertiesToolSchema = z.object({
    nodeQuery: z.string().describe("Critères JSON du nœud."),
    properties: z.string().describe("Propriétés JSON à màj."),
    operation: z.enum(["set", "replace", "remove"]).optional().default("set").describe("Type d'opération.")
});

const addNodeLabelToolSchema = z.object({
    nodeQuery: z.string().describe("Critères JSON du nœud."),
    label: z.string().describe("Nouveau label à ajouter.")
});

const deleteRelationshipToolSchema = z.object({
    startNodeQuery: z.string().describe("Critères JSON nœud source."),
    endNodeQuery: z.string().describe("Critères JSON nœud cible."),
    relationshipType: z.string().optional().default("").describe("Type de relation (optionnel).")
});

const deleteNodeToolSchema = z.object({
    nodeQuery: z.string().describe("Critères JSON du nœud."),
    detach: z.boolean().optional().default(false).describe("Supprimer aussi les relations.")
});

const checkRelationshipExistsToolSchema = z.object({
    startNodeQuery: z.string().describe("Critères JSON nœud source."),
    endNodeQuery: z.string().describe("Critères JSON nœud cible."),
    relationshipType: z.string().optional().default("").describe("Type de relation (optionnel)."),
    bidirectional: z.boolean().optional().default(false).describe("Vérif bidirectionnelle.")
});

const createNodeToolSchema = z.object({
    label: z.string().describe("Label du nœud à créer."),
    properties: z.string().describe("Propriétés JSON (doit inclure sourceType)."),
    identifyingProperties: z.string().optional().default('[]').describe("Propriétés JSON pour vérif existence.")
});

// --- Outils de Schema Tools ---
const getSchemaCatalogueToolSchema = z.object({
    elementType: z.enum(["tag", "relationship_type"]).describe("Type d'élément ('tag' ou 'relationship_type').")
});

const addSchemaElementToolSchema = z.object({
    elementType: z.enum(["tag", "relationship_type"]).describe("Type d'élément ('tag' ou 'relationship_type')."),
    name: z.string().describe("Nom du nouvel élément."),
    description: z.string().describe("Description obligatoire.")
});

// --- Listes d'Outils par Agent ---

const readerTools: Record<string, Tool<any, any>> = {
    findNodes: tool({ description: "Recherche des nœuds par label et/ou propriétés.", parameters: findNodesToolSchema, execute: async (args) => executeMcpToolForAgent('findNodes', args) }),
    getNodeDetails: tool({ description: "Récupère toutes les informations d'un nœud spécifique.", parameters: getNodeDetailsToolSchema, execute: async (args) => executeMcpToolForAgent('getNodeDetails', args) }),
    getNeighborSummary: tool({ description: "Récupère un résumé des propriétés spécifiques de nombreux nœuds voisins.", parameters: getNeighborSummaryToolSchema, execute: async (args) => executeMcpToolForAgent('getNeighborSummary', args) }),
    checkRelationshipExists: tool({ description: "Vérifie si une relation spécifique existe entre deux nœuds.", parameters: checkRelationshipExistsToolSchema, execute: async (args) => executeMcpToolForAgent('checkRelationshipExists', args) }),
    findPaths: tool({ description: "Trouve les chemins entre deux nœuds.", parameters: findPathsToolSchema, execute: async (args) => executeMcpToolForAgent('findPaths', args) }),
    aggregateNeighborProperties: tool({ description: "Calcule des agrégats sur les propriétés des nœuds voisins.", parameters: aggregateNeighborPropertiesToolSchema, execute: async (args) => executeMcpToolForAgent('aggregateNeighborProperties', args) }),
    getGraphSchema: tool({ description: "Liste les labels, types de relations et propriétés du graphe.", parameters: getGraphSchemaToolSchema, execute: async (args) => executeMcpToolForAgent('getGraphSchema', args) }),
    getSchemaCatalogue: tool({ description: "Liste les éléments de schéma existants (tags, types de relation RELATED_TO).", parameters: getSchemaCatalogueToolSchema, execute: async (args) => executeMcpToolForAgent('getSchemaCatalogue', args) }),
    queryGraph: tool({ description: "Exécute une requête Cypher personnalisée en lecture seule.", parameters: queryGraphToolSchema, execute: async (args) => executeMcpToolForAgent('queryGraph', args) }),
    searchNodesByText: tool({
        description: "Recherche des nœuds contenant un texte spécifique via l'index Full-Text Search. À utiliser pour les recherches textuelles ouvertes.",
        parameters: searchNodesByTextToolSchema,
        execute: async (args) => executeMcpToolForAgent('searchNodesByText', args)
    }),
    searchWithContext: tool({
        description: "Recherche des nœuds basée sur une requête textuelle avec contexte conversationnel optionnel pour améliorer la pertinence.",
        parameters: searchWithContextToolSchema,
        execute: async (args) => executeMcpToolForAgent('searchWithContext', args)
    }),
};

const integratorTools: Record<string, Tool<any, any>> = {
    // Lecture
    findNodes: tool({ description: "Recherche des nœuds par label et/ou propriétés.", parameters: findNodesToolSchema, execute: async (args) => executeMcpToolForAgent('findNodes', args) }),
    getNodeDetails: tool({ description: "Récupère toutes les informations d'un nœud spécifique.", parameters: getNodeDetailsToolSchema, execute: async (args) => executeMcpToolForAgent('getNodeDetails', args) }),
    checkRelationshipExists: tool({ description: "Vérifie si une relation spécifique existe entre deux nœuds.", parameters: checkRelationshipExistsToolSchema, execute: async (args) => executeMcpToolForAgent('checkRelationshipExists', args) }),
    getSchemaCatalogue: tool({ description: "Liste les éléments de schéma existants (tags, types de relation RELATED_TO).", parameters: getSchemaCatalogueToolSchema, execute: async (args) => executeMcpToolForAgent('getSchemaCatalogue', args) }),
    searchNodesByText: tool({ description: "Recherche des nœuds contenant un texte spécifique via l'index Full-Text Search. À utiliser pour vérifier l'existence de contenu similaire.", parameters: searchNodesByTextToolSchema, execute: async (args) => executeMcpToolForAgent('searchNodesByText', args) }),
    // Écriture
    createNode: tool({ description: "Crée un nouveau nœud après vérification d'existence.", parameters: createNodeToolSchema, execute: async (args) => executeMcpToolForAgent('createNode', args) }),
    createRelationship: tool({ description: "Crée une relation entre deux nœuds existants.", parameters: createRelationshipToolSchema, execute: async (args) => executeMcpToolForAgent('createRelationship', args) }),
    updateNodeProperties: tool({ description: "Met à jour les propriétés d'un nœud existant.", parameters: updateNodePropertiesToolSchema, execute: async (args) => executeMcpToolForAgent('updateNodeProperties', args) }),
    addNodeLabel: tool({ description: "Ajoute un label supplémentaire à un nœud existant.", parameters: addNodeLabelToolSchema, execute: async (args) => executeMcpToolForAgent('addNodeLabel', args) }),
    deleteRelationship: tool({ description: "Supprime une relation spécifique entre deux nœuds.", parameters: deleteRelationshipToolSchema, execute: async (args) => executeMcpToolForAgent('deleteRelationship', args) }),
    deleteNode: tool({ description: "Supprime un nœud du graphe.", parameters: deleteNodeToolSchema, execute: async (args) => executeMcpToolForAgent('deleteNode', args) }),
    addSchemaElement: tool({ description: "Ajoute un nouvel élément (tag ou type de relation) au catalogue externe.", parameters: addSchemaElementToolSchema, execute: async (args) => executeMcpToolForAgent('addSchemaElement', args) }),
    updateGraph: tool({ description: "Exécute une requête Cypher de modification complexe.", parameters: updateGraphToolSchema, execute: async (args) => executeMcpToolForAgent('updateGraph', args) }),
    batchOperations: tool({ description: "Exécute plusieurs opérations en une transaction atomique.", parameters: batchOperationsToolSchema, execute: async (args) => executeMcpToolForAgent('batchOperations', args) }),
};


// --- Fonctions d'Exécution des Agents Spécialisés (Logique LLM inchangée) ---

/**
 * Exécute un appel à l'Agent Lecteur.
 */
export async function executeReaderAgentCall(args: AgentCallArgs): Promise<AgentCallResult> {
  console.log("[Agent Caller] Executing Reader Agent Call with task:", args.taskDescription);
  try {
    const messages: CoreMessage[] = [{ role: 'user', content: args.taskDescription }];
    console.log("[Agent Caller] Calling Reader LLM...");
    const { text, toolResults, finishReason, usage } = await generateText({
      model: google(geminiModelId),
      system: READER_SYSTEM_PROMPT,
      messages: messages,
      tools: readerTools,
      maxSteps: 100,
      onStepFinish: async (stepResult) => {
        const toolResults = stepResult.toolResults as Array<{ toolName: string; args: any; result: any }> | undefined;
        if (toolResults && toolResults.length > 0) {
          for (const toolResult of toolResults) {
            console.log(`[Reader Agent][Step] Tool used: ${toolResult.toolName}, Args:`, toolResult.args, 'Result:', toolResult.result, "reason:", stepResult.reasoning), "text:", stepResult.text;
          }
        } else {
          console.log(`[Reader Agent][Step] No tool used in this step.`);
        }
      },
    });
    
    // --- AJOUT LOG LECTEUR ---
    console.log("-------------------------------------------");
    console.log("[Reader Agent] RAW RESPONSE TEXT:");
    console.log(text);
    console.log("-------------------------------------------");
    // --- FIN AJOUT LOG LECTEUR ---
    
    console.log(`[Reader Agent] Finish Reason: ${finishReason}, Usage: I=${usage.promptTokens}, O=${usage.completionTokens}`);
    console.log(`[Reader Agent] Raw Response Text:`, text);
    try {
        let toExtract = text;
        if (text.includes("```json") || text.includes("```")) {
            const startIndex = text.indexOf("```json") + 7;
            const endIndex = text.indexOf("```", startIndex);
            const jsonString = text.substring(startIndex, endIndex).trim();
            console.log("[Integrator Agent] Extracted JSON string:", jsonString);
            toExtract = jsonString;
        }

        const parsedResult = JSON.parse(toExtract);
        if (parsedResult.success && parsedResult.result) {
             console.log("[Reader Agent] Parsed result:", parsedResult.result);
             return { success: true, summary_text: parsedResult.result.summary_text || "Résumé non fourni.", data: { nodes_to_fetch: parsedResult.result.nodes_to_fetch || [], relationships_to_explore: parsedResult.result.relationships_to_explore || [] } };
        } else {
             console.warn("[Reader Agent] Response format incorrect:", parsedResult);
             return { success: false, error: "L'Agent Lecteur a retourné une réponse dans un format inattendu.", summary_text: text };
        }
    } catch (parseError: any) {
        console.error("[Reader Agent] Failed to parse JSON response:", parseError);
        return { success: false, error: `Erreur de parsing de la réponse du Lecteur: ${parseError.message}`, summary_text: text || "Réponse vide ou invalide de l'Agent Lecteur." };
    }
  } catch (error: any) {
    console.error("[Agent Caller] Error executing Reader Agent call:", error);
    return { success: false, error: `Erreur lors de l'appel à l'Agent Lecteur: ${error.message}` };
  }
}

/**
 * Exécute un appel à l'Agent Intégrateur.
 */
export async function executeIntegratorAgentCall(args: AgentCallArgs): Promise<AgentCallResult> {
  console.log("[Agent Caller] Executing Integrator Agent Call with task:", args.taskDescription);
  console.log("[Agent Caller] Integration context:", { 
    integrationBatchId: args.integrationBatchId, 
    chatId: args.chatId 
  });

  // Génération ou récupération de l'integrationBatchId
  const integrationBatchId = args.integrationBatchId || `batch_${args.chatId || 'default'}_${Date.now()}`;
  
  let hasExistingPendingData = false;
  let lastSummary = "";
  let isNewBatch = true;

  try {
    // Étape 1: Vérifier s'il existe des données pending pour ce batch
    console.log(`[Agent Caller] Checking for existing pending data in batch: ${integrationBatchId}`);
    const pendingCheck = await checkExistingPendingData(integrationBatchId);
    hasExistingPendingData = pendingCheck.hasData;
    console.log(`[Agent Caller] Existing pending data found: ${hasExistingPendingData} (${pendingCheck.nodeCount} nodes)`);

    // Étape 2: Si des données existent, récupérer le lastSummary
    if (hasExistingPendingData) {
      isNewBatch = false;
      lastSummary = await getBatchSummary(integrationBatchId);
      if (typeof lastSummary === 'string' && lastSummary.length > 0) {
        console.log(`[Agent Caller] Retrieved last summary: ${lastSummary.substring(0, 100)}...`);
      } else {
        lastSummary = '';
        console.log(`[Agent Caller] No last summary found.`);
      }
    }

    // Étape 3: Sélectionner le prompt approprié
    const systemPrompt = hasExistingPendingData 
      ? (INTEGRATOR_SYSTEM_PROMPT_B ? INTEGRATOR_SYSTEM_PROMPT_B.replace('{lastSummary}', lastSummary || '') : '')
      : (INTEGRATOR_SYSTEM_PROMPT_A || '');

    // Étape 4: Préparer le message pour l'Agent Intégrateur
    const contextMessage = [
      `integrationBatchId: ${integrationBatchId}`,
      hasExistingPendingData ? `hasExistingPendingData: true` : `hasExistingPendingData: false`,
      hasExistingPendingData && lastSummary ? `lastSummary: ${lastSummary}` : '',
      `Tâche: ${args.taskDescription}`
    ].filter(Boolean).join('\n\n');

    const messages: CoreMessage[] = [{ 
      role: 'user', 
      content: contextMessage 
    }];

    console.log(`[Agent Caller] Calling Integrator LLM (Mode: ${hasExistingPendingData ? 'Modification/Extension' : 'Création Initiale'})...`);

    // Étape 5: Appel au LLM
    const { text, toolResults, finishReason, usage } = await generateText({
      model: google(geminiModelId),
      system: systemPrompt,
      messages: messages,
      tools: integratorTools,
      maxSteps: 100,
      onStepFinish: async (stepResult) => {
        const toolResults = stepResult.toolResults as Array<{ toolName: string; args: any; result: any }> | undefined;

        if (toolResults && toolResults.length > 0) {
          for (const toolResult of toolResults) {
            console.log(`[Reader Agent][Step] Tool used: ${toolResult.toolName}, Args:`, toolResult.args, 'Result:', toolResult.result, "reason:", stepResult.reasoning), "text:", stepResult.text;
          }
        } else {
          console.log(`[Integrator Agent][Step] No tool used in this step.`);
        }
      },
    });

    console.log("-------------------------------------------");
    console.log("[Integrator Agent] RAW RESPONSE TEXT:");
    console.log(text);
    console.log("-------------------------------------------");
    console.log(`[Integrator Agent] Finish Reason: ${finishReason}, Usage: I=${usage?.promptTokens}, O=${usage?.completionTokens}`);

    // Étape 6: Parser la réponse
    try {
      let toExtract = text;
      if (text.includes("```json")) {
        const startIndex = text.indexOf("```json") + 7;
        const endIndex = text.indexOf("```", startIndex);
        toExtract = text.substring(startIndex, endIndex).trim();
      }

      const parsedResult = JSON.parse(toExtract);
      
      if (!parsedResult.success) {
        throw new Error(parsedResult.error || "L'Agent Intégrateur a signalé un échec");
      }

      // Étape 7: Post-traitement - Marquer les nœuds affectés
      const affectedNodeIds = parsedResult.affectedNodeIds || [];
      const newSummary = parsedResult.newSummary || "Aucun résumé fourni";

      if (affectedNodeIds.length > 0) {
        console.log(`[Agent Caller] Marking ${affectedNodeIds.length} nodes as pending...`);
        await markNodesAsPending(affectedNodeIds, integrationBatchId);
      }

      // Étape 8: Créer ou mettre à jour le nœud IntegrationBatch
      console.log(`[Agent Caller] Managing IntegrationBatch node...`);
      await manageBatchNode(integrationBatchId, newSummary, isNewBatch, args.chatId);

      // Étape 9: Retourner le résultat enrichi
      return {
        success: true,
        summary_text: newSummary,
        data: {
          operation_type: parsedResult.operation_type,
          affectedNodeIds: affectedNodeIds,
          integrationBatchId: integrationBatchId,
          batchStatus: isNewBatch ? 'created' : 'updated',
          hasExistingPendingData: hasExistingPendingData
        }
      };

    } catch (parseError: any) {
      console.error("[Integrator Agent] Failed to parse or process response:", parseError);
      
      // En cas d'erreur, essayer de marquer le batch comme failed
      if (integrationBatchId && !isNewBatch) {
        try {
          await executeMcpToolForAgent('updateNodeProperties', {
            nodeQuery: JSON.stringify({ 
              label: 'IntegrationBatch',
              property: 'batchId',
              value: integrationBatchId 
            }),
            properties: JSON.stringify({
              status: 'failed',
              errorMessage: parseError.message,
              lastUpdatedAt: new Date().toISOString()
            }),
            operation: 'set'
          });
        } catch (updateError) {
          console.error("[Batch Error] Failed to mark batch as failed:", updateError);
        }
      }

      return {
        success: false,
        error: `Erreur de traitement: ${parseError.message}`,
        summary_text: text || "Réponse invalide de l'Agent Intégrateur"
      };
    }

  } catch (error: any) {
    console.error("[Agent Caller] Error executing Integrator Agent call:", error);
    return {
      success: false,
      error: `Erreur lors de l'appel à l'Agent Intégrateur: ${error.message}`
    };
  }
}

// TODO: Ajouter la fonction pour l'Agent Restructurateur (asynchrone)
// export async function executeRestructuratorCycle() { ... }