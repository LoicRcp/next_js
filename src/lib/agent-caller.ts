import { google } from '@ai-sdk/google';
import { generateText, tool, type Tool, type CoreMessage } from 'ai';
import { z } from 'zod';
import { getMcpClient } from './mcp-client';
import fs from 'fs';
import path from 'path';

// --- Définition des types ---
interface SearchArgs {
  query: string;
  integrationBatchId?: string;
  chatId?: string;
}

interface AddOrUpdateArgs {
  information: string;
  integrationBatchId?: string;
  chatId?: string;
}

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


// --- Nouvelles Fonctions d'Exécution des Agents (avec workflow Read-Before-Write) ---

/**
 * Exécute une recherche simple via l'Agent Lecteur
 */
export async function executeSearch(args: SearchArgs): Promise<AgentCallResult> {
  console.log("[Agent Caller] Executing Search with query:", args.query);
  try {
    // Préparer la taskDescription pour l'Agent Lecteur
    const taskDescription = `Recherche dans le graphe de connaissances : ${args.query}

Effectue une recherche complète pour répondre à cette requête. Utilise les outils appropriés (searchWithContext, findNodes, getNodeDetails) pour trouver toutes les informations pertinentes.

Si des nœuds avec integrationStatus='pending' existent et sont pertinents, inclus-les dans ta recherche en utilisant includePending:true.`;

    const messages: CoreMessage[] = [{ role: 'user', content: taskDescription }];
    
    console.log("[Agent Caller] Calling Reader LLM for search...");
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
            console.log(`[Reader Agent][Step] Tool used: ${toolResult.toolName}`);
          }
        }
      },
    });
    
    console.log("[Reader Agent] Raw response:", text);
    
    // Parser la réponse JSON du Lecteur
    try {
      const parsedResult = JSON.parse(text);
      if (!parsedResult.success) {
        return {
          success: false,
          error: parsedResult.error || "Erreur dans la recherche",
          summary_text: parsedResult.summary_text
        };
      }
      
      return {
        success: true,
        data: parsedResult.result,
        summary_text: parsedResult.result?.summary_text || "Recherche effectuée"
      };
    } catch (parseError) {
      // Si le parsing échoue, retourner le texte brut
      return {
        success: true,
        summary_text: text || "Recherche effectuée"
      };
    }
  } catch (error: any) {
    console.error("[Agent Caller] Error executing search:", error);
    return {
      success: false,
      error: `Erreur lors de la recherche: ${error.message}`
    };
  }
}

// TODO: Ajouter la fonction pour l'Agent Restructurateur (asynchrone)
// export async function executeRestructuratorCycle() { ... }

/**
 * Exécute l'ajout ou la mise à jour d'informations avec workflow Read-Before-Write
 */
export async function executeAddOrUpdate(args: AddOrUpdateArgs): Promise<AgentCallResult> {
  console.log("[Agent Caller] Executing Add/Update with information:", args.information);
  
  try {
    // ÉTAPE 1 : READ - Vérifier l'existence des entités via l'Agent Lecteur
    console.log("[Agent Caller] Step 1: Checking existing entities...");
    
    const readTaskDescription = `Analyse cette information et vérifie si les entités principales existent déjà dans le graphe :

"${args.information}"

Recherche spécifiquement :
1. Les projets mentionnés
2. Les personnes nommées
3. Les organisations citées
4. Les concepts clés

Pour chaque entité trouvée, fournis son ID unique. Indique clairement ce qui existe déjà et ce qui n'existe pas.
N'oublie pas de vérifier aussi les nœuds avec integrationStatus='pending' en utilisant includePending:true.`;

    const readMessages: CoreMessage[] = [{ role: 'user', content: readTaskDescription }];
    
    const { text: readText } = await generateText({
      model: google(geminiModelId),
      system: READER_SYSTEM_PROMPT,
      messages: readMessages,
      tools: readerTools,
      maxSteps: 100
    });
    
    console.log("[Agent Caller] Reader analysis result:", readText);
    
    // ÉTAPE 2 : WRITE - Utiliser l'Agent Intégrateur avec le contexte du Lecteur
    console.log("[Agent Caller] Step 2: Writing/updating with context...");
    
    // Vérifier si des données existent déjà pour ce batch
    let hasExistingPendingData = false;
    let lastSummary = '';
    
    if (args.integrationBatchId) {
      const checkResult = await checkExistingPendingData(args.integrationBatchId);
      hasExistingPendingData = checkResult.hasData;
      
      if (hasExistingPendingData) {
        lastSummary = await getBatchSummary(args.integrationBatchId);
      }
    }
    
    const writeTaskDescription = `Intègre cette information dans le graphe :

"${args.information}"

Contexte de l'analyse préalable :
${readText}

Instructions :
- Pour les entités qui existent déjà (avec leurs IDs fournis ci-dessus), utilise ces IDs pour créer les liens appropriés
- Pour les entités qui n'existent pas, crée-les
- Assure-toi de créer une structure cohérente avec toutes les relations nécessaires
${hasExistingPendingData ? `- Des données existent déjà dans ce batch. Résumé précédent : ${lastSummary}` : ''}`;

    const integratorMessages: CoreMessage[] = [{ role: 'user', content: writeTaskDescription }];
    
    const { text: writeText } = await generateText({
      model: google(geminiModelId),
      system: hasExistingPendingData ? INTEGRATOR_SYSTEM_PROMPT_B : INTEGRATOR_SYSTEM_PROMPT_A,
      messages: integratorMessages,
      tools: integratorTools,
      maxSteps: 100,
      onStepFinish: async (stepResult) => {
        const toolResults = stepResult.toolResults as Array<{ toolName: string; args: any; result: any }> | undefined;
        if (toolResults && toolResults.length > 0) {
          for (const toolResult of toolResults) {
            console.log(`[Integrator Agent][Step] Tool used: ${toolResult.toolName}`);
          }
        }
      },
    });
    
    console.log("[Agent Caller] Integrator result:", writeText);
    
    // Parser et traiter la réponse de l'Intégrateur
    try {
      const parsedResult = JSON.parse(writeText);
      
      if (!parsedResult.success) {
        return {
          success: false,
          error: parsedResult.error || "Erreur lors de l'intégration",
          summary_text: parsedResult.newSummary
        };
      }
      
      // Post-traitement : marquer les nœuds avec integrationStatus et integrationBatchId
      if (args.integrationBatchId && parsedResult.batchOperations?.nodesCreated) {
        const nodeIds = parsedResult.batchOperations.nodesCreated.map((n: any) => n.id);
        
        // Ajouter les propriétés de batch à tous les nœuds créés
        for (const nodeId of nodeIds) {
          if (nodeId) {
            await executeMcpToolForAgent('updateNodeProperties', {
              nodeQuery: JSON.stringify({ id: nodeId }),
              properties: JSON.stringify({
                integrationStatus: 'pending',
                integrationBatchId: args.integrationBatchId
              }),
              operation: 'set'
            });
          }
        }
        
        // Créer ou mettre à jour le nœud IntegrationBatch
        const isNewBatch = !hasExistingPendingData;
        
        if (isNewBatch) {
          await executeMcpToolForAgent('createNode', {
            label: 'IntegrationBatch',
            properties: JSON.stringify({
              batchId: args.integrationBatchId,
              status: 'pending',
              lastSummary: parsedResult.newSummary || '',
              createdAt: new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
              conversationId: args.chatId
            })
          });
        } else {
          await executeMcpToolForAgent('updateNodeProperties', {
            nodeQuery: JSON.stringify({ 
              label: 'IntegrationBatch',
              property: 'batchId',
              value: args.integrationBatchId 
            }),
            properties: JSON.stringify({
              lastSummary: parsedResult.newSummary || '',
              lastUpdatedAt: new Date().toISOString()
            }),
            operation: 'set'
          });
        }
      }
      
      return {
        success: true,
        data: {
          readAnalysis: readText,
          integrationResult: parsedResult,
          integrationBatchId: args.integrationBatchId
        },
        summary_text: parsedResult.newSummary || "Information intégrée avec succès"
      };
      
    } catch (parseError: any) {
      console.error("[Agent Caller] Failed to parse integrator response:", parseError);
      return {
        success: false,
        error: `Erreur de traitement: ${parseError.message}`,
        summary_text: writeText || "Erreur lors de l'intégration"
      };
    }
    
  } catch (error: any) {
    console.error("[Agent Caller] Error executing add/update:", error);
    return {
      success: false,
      error: `Erreur lors de l'ajout/mise à jour: ${error.message}`
    };
  }
}

// TODO: Ajouter la fonction pour l'Agent Restructurateur (asynchrone)
// export async function executeRestructuratorCycle() { ... }
