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
};

const integratorTools: Record<string, Tool<any, any>> = {
    // Lecture
    findNodes: tool({ description: "Recherche des nœuds par label et/ou propriétés.", parameters: findNodesToolSchema, execute: async (args) => executeMcpToolForAgent('findNodes', args) }),
    getNodeDetails: tool({ description: "Récupère toutes les informations d'un nœud spécifique.", parameters: getNodeDetailsToolSchema, execute: async (args) => executeMcpToolForAgent('getNodeDetails', args) }),
    checkRelationshipExists: tool({ description: "Vérifie si une relation spécifique existe entre deux nœuds.", parameters: checkRelationshipExistsToolSchema, execute: async (args) => executeMcpToolForAgent('checkRelationshipExists', args) }),
    getSchemaCatalogue: tool({ description: "Liste les éléments de schéma existants (tags, types de relation RELATED_TO).", parameters: getSchemaCatalogueToolSchema, execute: async (args) => executeMcpToolForAgent('getSchemaCatalogue', args) }),
    // Écriture
    createNode: tool({ description: "Crée un nouveau nœud après vérification d'existence.", parameters: createNodeToolSchema, execute: async (args) => executeMcpToolForAgent('createNode', args) }),
    createRelationship: tool({ description: "Crée une relation entre deux nœuds existants.", parameters: createRelationshipToolSchema, execute: async (args) => executeMcpToolForAgent('createRelationship', args) }),
    updateNodeProperties: tool({ description: "Met à jour les propriétés d'un nœud existant.", parameters: updateNodePropertiesToolSchema, execute: async (args) => executeMcpToolForAgent('updateNodeProperties', args) }),
    addNodeLabel: tool({ description: "Ajoute un label supplémentaire à un nœud existant.", parameters: addNodeLabelToolSchema, execute: async (args) => executeMcpToolForAgent('addNodeLabel', args) }),
    deleteRelationship: tool({ description: "Supprime une relation spécifique entre deux nœuds.", parameters: deleteRelationshipToolSchema, execute: async (args) => executeMcpToolForAgent('deleteRelationship', args) }),
    deleteNode: tool({ description: "Supprime un nœud du graphe.", parameters: deleteNodeToolSchema, execute: async (args) => executeMcpToolForAgent('deleteNode', args) }),
    addSchemaElement: tool({ description: "Ajoute un nouvel élément (tag ou type de relation) au catalogue externe.", parameters: addSchemaElementToolSchema, execute: async (args) => executeMcpToolForAgent('addSchemaElement', args) }),
    updateGraph: tool({ description: "Exécute une requête Cypher de modification complexe.", parameters: updateGraphToolSchema, execute: async (args) => executeMcpToolForAgent('updateGraph', args) }),
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
      model: google(geminiModelId), system: READER_SYSTEM_PROMPT, messages: messages, tools: readerTools, maxSteps: 5,
      responseFormat: { type: 'json_object' },
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
  const integrationBatchId = args.integrationBatchId || `batch_${Date.now()}`;
  const hasExistingPendingData = args.hasExistingPendingData || false;
  const lastSummary = args.lastSummary || "";
  try {
     const systemPrompt = hasExistingPendingData ? INTEGRATOR_SYSTEM_PROMPT_B.replace('{lastSummary}', lastSummary) : INTEGRATOR_SYSTEM_PROMPT_A;
     const messages: CoreMessage[] = [{ role: 'user', content: `integrationBatchId: ${integrationBatchId}\n\nTâche: ${args.taskDescription}` }];
     console.log(`[Agent Caller] Calling Integrator LLM (Mode: ${hasExistingPendingData ? 'Modification/Ajout' : 'Création Initiale'})...`);
     const { text, toolResults, finishReason, usage } = await generateText({
       model: google(geminiModelId), system: systemPrompt, messages: messages, tools: integratorTools, maxSteps: 5,
       responseFormat: { type: 'json_object' },
     });
     
     // --- AJOUT LOG INTEGRATEUR ---
     console.log("-------------------------------------------");
     console.log("[Integrator Agent] RAW RESPONSE TEXT:");
     console.log(text);
     console.log("-------------------------------------------");
     // --- FIN AJOUT LOG INTEGRATEUR ---
     
     console.log(`[Integrator Agent] Finish Reason: ${finishReason}, Usage: I=${usage.promptTokens}, O=${usage.completionTokens}`);
     console.log(`[Integrator Agent] Raw Response Text:`, text);
     // --- Logique Post-LLM (Placeholder) ---
     console.log("[Agent Caller] Placeholder: Logique Post-LLM (marquage pending, etc.) à implémenter.");
     // ---------------------------------------
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
        if (parsedResult.success) {
            console.log("[Integrator Agent] Parsed result:", parsedResult);
            return { success: true, summary_text: parsedResult.newSummary || "Résumé non fourni.", data: { operation_type: parsedResult.operation_type, affectedNodeIds: parsedResult.affectedNodeIds || [], integrationBatchId: integrationBatchId } };
        } else {
             console.warn("[Integrator Agent] Response format incorrect:", parsedResult);
             return { success: false, error: "L'Agent Intégrateur a retourné une réponse dans un format inattendu.", summary_text: text };
        }
     } catch (parseError: any) {
        console.error("[Integrator Agent] Failed to parse JSON response:", parseError);
        return { success: false, error: `Erreur de parsing de la réponse de l'Intégrateur: ${parseError.message}`, summary_text: text || "Réponse vide ou invalide de l'Agent Intégrateur." };
     }
   } catch (error: any) {
     console.error("[Agent Caller] Error executing Integrator Agent call:", error);
     return { success: false, error: `Erreur lors de l'appel à l'Agent Intégrateur: ${error.message}` };
   }
}

// TODO: Ajouter la fonction pour l'Agent Restructurateur (asynchrone)
// export async function executeRestructuratorCycle() { ... }