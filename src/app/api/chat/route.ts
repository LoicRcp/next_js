// app/api/chat/route.ts
import { google } from '@ai-sdk/google';
import {
  streamText,
  tool,
  type CoreMessage,
  type Tool,
  type ToolCall,
  type ToolExecutionOptions,
} from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getMcpClient } from '@/lib/mcp-client';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

// --- Constantes et Vérification initiale (inchangées) ---
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash';
const SYSTEM_PROMPT = `
You are the Knowledge Hub Orchestrator Agent. Your primary role is to interact conversationally with the user, understand their requests, plan necessary actions, and delegate the execution to specialized Agents via the provided tools. You synthesize results for the user. You MUST use the available tools to interact with the knowledge graph or external services. Do not attempt to access data directly. Be concise and helpful. Always check if information exists before attempting to create it using findNode. Prioritize updating existing information over creating duplicates.
`; // Mise à jour mineure: find_nodes -> findNode
const GOOGLE_API_KEY_ENV_VAR = 'GOOGLE_GENERATIVE_AI_API_KEY';

if (!process.env[GOOGLE_API_KEY_ENV_VAR]) {
  console.warn(`\n[Startup Warning] Environment variable ${GOOGLE_API_KEY_ENV_VAR} is not set. Google AI calls might fail.`);
}

// --- Définition Statique des Schémas Zod pour les Outils ---
// ATTENTION: Les noms des paramètres DANS les schémas doivent correspondre
// à ceux définis dans inputSchema des outils backend respectifs.
// graph-tools.js utilise camelCase (sauf nouveaux find/create qui sont camelCase)
// advanced-graph-tools.js utilise snake_case
// schema-tools.js utilise snake_case

// --- Outils de Advanced Graph Tools (snake_case params) ---
const getNeighborSummaryToolSchema = z.object({
    nodeQuery: z.string() // Nom interne schema Zod renommé
      .describe("Critères pour identifier le nœud central (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    relationship_type: z.string().optional().default("")
      .describe("Type de relation à suivre (optionnel, laisser vide pour toutes les relations)"),
    direction: z.enum(["OUTGOING", "INCOMING", "BOTH"]).optional().default("OUTGOING")
      .describe("Direction des relations (OUTGOING, INCOMING, BOTH)"),
    neighbor_label: z.string().optional().default("")
      .describe("Label des nœuds voisins (optionnel, laisser vide pour tous les labels)"),
    properties_to_return: z.string().optional().default("id,title")
      .describe("Liste des propriétés à inclure dans le résumé, séparées par des virgules. Exemple: 'id,title,status'"),
    limit: z.number().int().optional().default(50)
      .describe("Nombre maximum de voisins à retourner")
  });

const findPathsToolSchema = z.object({
    startNodeQuery: z.string() // Nom interne schema Zod renommé
      .describe("Critères pour identifier le nœud de départ (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    endNodeQuery: z.string() // Nom interne schema Zod renommé
      .describe("Critères pour identifier le nœud d'arrivée (JSON string). Format : '{\"id\":\"uuid-456\"}' ou '{\"label\":\"Tâche\", \"property\":\"title\", \"value\":\"Implémenter API\"}'"),
    relationship_types: z.string().optional().default("")
      .describe("Types de relations à suivre, séparés par des virgules. Exemple: 'DEPENDS_ON,RELATED_TO'. Laisser vide pour tous les types."),
    max_depth: z.number().int().min(1).max(5).optional().default(3)
      .describe("Profondeur maximale de recherche"),
    limit: z.number().int().min(1).max(10).optional().default(3)
      .describe("Nombre maximum de chemins à retourner")
  });

const aggregateNeighborPropertiesToolSchema = z.object({
    nodeQuery: z.string() // Nom interne schema Zod renommé
      .describe("Critères pour identifier le nœud central (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    relationship_type: z.string().optional().default("")
      .describe("Type de relation à suivre (optionnel, laisser vide pour toutes les relations)"),
    direction: z.enum(["OUTGOING", "INCOMING", "BOTH"]).optional().default("OUTGOING")
      .describe("Direction des relations (OUTGOING, INCOMING, BOTH)"),
    neighbor_label: z.string().optional().default("")
      .describe("Label des nœuds voisins (optionnel, laisser vide pour tous les labels)"),
    property_to_aggregate: z.string()
      .describe("Propriété sur laquelle calculer l'agrégat"),
    aggregation: z.enum(["COUNT", "SUM", "AVG", "MIN", "MAX", "COLLECT"]).optional().default("COUNT")
      .describe("Type d'agrégation à effectuer")
  });

const findNodesToolSchema = z.object({ // Version conservée depuis advanced-graph-tools
    label: z.string().describe("Label du nœud à rechercher."), // Paramètre vient de advanced-graph-tools
    properties: z.string().optional().default("{}").describe("Propriétés pour filtrer (JSON string). Recherche par 'id' (UUID) ou propriétés métier. Exemple: '{\"id\":\"uuid-123\"}' ou '{\"status\":\"En cours\"}'"), // Paramètre vient de advanced-graph-tools
    limit: z.number().int().optional().default(10).describe("Nombre maximum de résultats.") // Paramètre vient de advanced-graph-tools
});

const getNodeDetailsToolSchema = z.object({ // Version conservée depuis advanced-graph-tools
    nodeQuery: z.string() // Nom interne schema Zod renommé
      .describe("Critères d'identification du nœud (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    detailLevel: z.enum(["core", "full_properties"]).optional().default("core") // detailLevel vient d'advanced-graph-tools
      .describe("Niveau de détail souhaité ('core' pour propriétés essentielles + résumé relations, 'full_properties' pour toutes les propriétés + résumé relations).")
});


// --- Outils de Graph Tools (camelCase params, sauf nouveaux) ---
const queryGraphToolSchema = z.object({
    query: z.string()
      .describe("Requête Cypher à exécuter"),
    params: z.string().optional().default("{}")
      .describe("Paramètres de la requête Cypher, fournis sous forme de chaîne JSON valide. Exemple: '{\"userId\": 123}'"),
    explanation: z.string().optional().default("")
      .describe("Explication en langage naturel de ce que fait cette requête (pour documentation)")
});

const updateGraphToolSchema = z.object({
    query: z.string()
      .describe("Requête Cypher de création ou de mise à jour"),
    params: z.string().optional().default("{}")
      .describe("Paramètres de la requête Cypher, fournis sous forme de chaîne JSON valide. Exemple: '{\"userId\": 123}'"),
    explanation: z.string().optional().default("")
      .describe("Explication en langage naturel de ce que fait cette mise à jour (pour documentation)")
});

const getGraphSchemaToolSchema = z.object({ // Nom variable renommé
    detailLevel: z.enum(["basic", "detailed"]).optional().default("basic")
      .describe("Niveau de détail (basic = labels et relations uniquement, detailed = avec propriétés)"),
    focusLabel: z.string().optional().default("")
      .describe("Se concentrer sur un label spécifique (optionnel, laisser vide pour ne pas filtrer)"),
    focusRelationType: z.string().optional().default("")
      .describe("Se concentrer sur un type de relation spécifique (optionnel, laisser vide pour ne pas filtrer)")
});

const createRelationshipToolSchema = z.object({
    startNodeQuery: z.string()
      .describe("Critères pour identifier le nœud source (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    endNodeQuery: z.string()
      .describe("Critères pour identifier le nœud cible (JSON string). Format : '{\"id\":\"uuid-456\"}' ou '{\"label\":\"Tâche\", \"property\":\"title\", \"value\":\"Implémenter API\"}'"),
    relationshipType: z.string()
      .describe("Type de relation à créer"),
    properties: z.string().optional().default("{}")
      .describe("Propriétés à attacher à la relation, fournies sous forme de chaîne JSON valide. Exemple: '{\"created\": \"2023-01-01\", \"priority\": 1}'")
});

const updateNodePropertiesToolSchema = z.object({
    nodeQuery: z.string()
      .describe("Critères pour identifier le nœud (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    properties: z.string()
      .describe("Propriétés à mettre à jour (JSON string). **Important** : La propriété 'id' ne peut pas être modifiée. La propriété 'sourceType' ne peut pas être modifiée via l'opération 'set'. La propriété 'updatedAt' est automatiquement mise à jour. Exemple: '{\"status\":\"Terminé\", \"updatedBy\":\"Alice\"}'"), // Description mise à jour
    operation: z.enum(["set", "replace", "remove"]).optional().default("set")
      .describe("Type d'opération. 'set' (défaut, mise à jour), 'replace' remplace toutes les propriétés *sauf* 'id' et 'sourceType', 'remove' (supprime les propriétés spécifiées)") // Description mise à jour
});

const addNodeLabelToolSchema = z.object({
    nodeQuery: z.string()
      .describe("Critères pour identifier le nœud (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    label: z.string()
      .describe("Nouveau label à ajouter au nœud")
});

const deleteRelationshipToolSchema = z.object({
    startNodeQuery: z.string()
      .describe("Critères pour identifier le nœud source (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    endNodeQuery: z.string()
      .describe("Critères pour identifier le nœud cible (JSON string). Format : '{\"id\":\"uuid-456\"}' ou '{\"label\":\"Tâche\", \"property\":\"title\", \"value\":\"Implémenter API\"}'"),
    relationshipType: z.string().optional().default("")
      .describe("Type de relation à supprimer (optionnel, laisser vide pour supprimer toutes les relations entre les nœuds)")
});

const deleteNodeToolSchema = z.object({
    nodeQuery: z.string()
      .describe("Critères pour identifier le nœud (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    detach: z.boolean().optional().default(false) // Default était true, corrigé à false si besoin
      .describe("Si true, supprime également toutes les relations du nœud (DETACH DELETE)")
    // confirmation: retiré
});

const checkRelationshipExistsToolSchema = z.object({
    startNodeQuery: z.string()
      .describe("Critères pour identifier le nœud source (JSON string). Format : '{\"id\":\"uuid-123\"}' ou '{\"label\":\"Projet\", \"property\":\"name\", \"value\":\"Projet A\"}'"),
    endNodeQuery: z.string()
      .describe("Critères pour identifier le nœud cible (JSON string). Format : '{\"id\":\"uuid-456\"}' ou '{\"label\":\"Tâche\", \"property\":\"title\", \"value\":\"Implémenter API\"}'"),
    relationshipType: z.string().optional().default("")
      .describe("Type de relation à vérifier (optionnel, laisser vide pour vérifier l'existence de n'importe quelle relation)"),
    bidirectional: z.boolean().optional().default(false)
      .describe("Si true, vérifie également les relations dans la direction opposée")
});

// --- Nouveaux Outils de Graph Tools ---
const findNodeToolSchema = z.object({
    label: z.string()
      .describe("Label du nœud à rechercher"),
    properties: z.string().optional().default("{}")
      .describe("Propriétés pour filtrer (JSON string). Recherche par 'id' (UUID) ou propriétés métier. Exemple: '{\"id\":\"uuid-123\"}' ou '{\"status\":\"En cours\"}'"),
    limit: z.number().int().optional().default(10)
      .describe("Nombre maximum de résultats")
});

const createNodeToolSchema = z.object({
    label: z.string()
      .describe("Label du nœud à créer"),
    properties: z.string()
      .describe("Propriétés pour le nouveau nœud (JSON string). **Doit inclure 'sourceType'**. Peut inclure des propriétés métier pour la vérification d'existence (ex: 'name'). Les propriétés 'id', 'createdAt', 'updatedAt' sont automatiquement ajoutées. Exemple: '{\"name\":\"Nouveau Projet\", \"status\":\"Planifié\", \"sourceType\":\"chat\"}'"),
    identifyingProperties: z.string().optional().default('[]')
      .describe("Liste (JSON string) des clés de propriétés de 'properties' à utiliser pour vérifier l'existence préalable du nœud. Si vide ou omis, aucune vérification n'est faite. Exemple: '[\"name\"]'")
});


// --- Outils de Schema Tools (snake_case params) ---
const getSchemaCatalogueToolSchema = z.object({
    element_type: z.enum(["tag", "relationship_type"]) // Param snake_case
      .describe("Le type d'élément de schéma à lister ('tag' ou 'relationship_type').")
});

const addSchemaElementToolSchema = z.object({
    element_type: z.enum(["tag", "relationship_type"]) // Param snake_case
      .describe("Le type d'élément de schéma à ajouter ('tag' ou 'relationship_type')."),
    name: z.string() // Param snake_case (ici name est simple)
      .describe("Le nom du nouvel élément (ex: 'concept_clé', 'depends_on')."),
    description: z.string() // Param snake_case (ici description est simple)
      .describe("Une description expliquant la signification de ce nouvel élément.")
});


// --- Fonction Créateur pour la Fonction 'execute' via MCP (inchangée) ---
function createMcpExecutor(toolName: string) {
    return async (args: any, options: ToolExecutionOptions): Promise<any> => {
        console.log(`[MCP Executor] Attempting to execute tool '${toolName}' via MCP...`);
        console.log(`[MCP Executor] Args received:`, args);
        console.log(`[MCP Executor] ToolCallId: ${options.toolCallId}`);

        const mcpClient = await getMcpClient();
        if (!mcpClient) {
            console.error(`[MCP Executor] Failed to get MCP Client for tool '${toolName}'.`);
            throw new Error(`Tool server connection failed for tool '${toolName}'.`);
        }

        try {
            const toolResponse: any = await mcpClient.callTool({
                name: toolName, // Utilise le nom CamelCase fourni
                args: args,
            });
            console.log(`[MCP Executor] Received response from MCP tool '${toolName}'.`);

            if (toolResponse && typeof toolResponse === 'object' && toolResponse.error && typeof toolResponse.error === 'object') {
                const errorCode = toolResponse.error.code ?? 'N/A';
                const errorMessage = toolResponse.error.message ?? 'Unknown tool error';
                console.error(`[MCP Executor] MCP Tool Error [${toolName}]: Code ${errorCode} - ${errorMessage}`);
                throw new Error(`Tool execution failed: ${errorMessage} (Code: ${errorCode})`);
            }

            const finalResult = (toolResponse && typeof toolResponse === 'object' && 'result' in toolResponse)
                                  ? toolResponse.result
                                  : toolResponse;

            console.log(`[MCP Executor] Tool '${toolName}' executed successfully. Result:`, finalResult);
            return finalResult;

        } catch (error: any) {
            console.error(`[MCP Executor] Error during MCP call for tool '${toolName}':`, error);
            throw new Error(`MCP communication error for '${toolName}': ${error.message}`);
        }
    };
}


// --- Création de l'objet 'tools' pour Vercel AI SDK ---
// MODIFIÉ : Utilisation des noms CamelCase et des nouveaux schémas
const availableTools: Record<string, Tool<any, any>> = {
  // --- Basic Graph Tools (from graph-tools.js) ---
  queryGraph: tool({
      description: "Exécute une requête Cypher personnalisée sur la base de données Neo4j.",
      parameters: queryGraphToolSchema,
      execute: createMcpExecutor('queryGraph'), // CamelCase name
  }),
  updateGraph: tool({
      description: "Crée ou met à jour des nœuds et des relations dans le graphe.",
      parameters: updateGraphToolSchema,
      execute: createMcpExecutor('updateGraph'), // CamelCase name
  }),
  getGraphSchema: tool({ // Renamed from listGraphSchema
      description: "Liste les labels, types de relations et propriétés du graphe.",
      parameters: getGraphSchemaToolSchema, // Renamed schema variable
      execute: createMcpExecutor('getGraphSchema'), // CamelCase name (corrected verb)
  }),
  createRelationship: tool({
      description: "Crée une relation entre deux nœuds existants.",
      parameters: createRelationshipToolSchema, // Updated schema
      execute: createMcpExecutor('createRelationship'), // CamelCase name
  }),
  updateNodeProperties: tool({
      description: "Met à jour les propriétés d'un nœud existant.",
      parameters: updateNodePropertiesToolSchema, // Updated schema
      execute: createMcpExecutor('updateNodeProperties'), // CamelCase name
  }),
  addNodeLabel: tool({
      description: "Ajoute un label supplémentaire à un nœud existant.",
      parameters: addNodeLabelToolSchema, // Updated schema
      execute: createMcpExecutor('addNodeLabel'), // CamelCase name
  }),
  deleteRelationship: tool({
      description: "Supprime une relation spécifique entre deux nœuds.",
      parameters: deleteRelationshipToolSchema, // Updated schema
      execute: createMcpExecutor('deleteRelationship'), // CamelCase name
  }),
  deleteNode: tool({
      description: "Supprime un nœud du graphe.",
      parameters: deleteNodeToolSchema, // Updated schema (no confirmation)
      execute: createMcpExecutor('deleteNode'), // CamelCase name
  }),
  checkRelationshipExists: tool({
      description: "Vérifie si une relation spécifique existe entre deux nœuds.",
      parameters: checkRelationshipExistsToolSchema, // Updated schema
      execute: createMcpExecutor('checkRelationshipExists'), // CamelCase name
  }),
  // --- Nouveaux Outils ---
  findNode: tool({
      description: "Recherche des nœuds par label et/ou propriétés.",
      parameters: findNodeToolSchema, // Nouveau schema
      execute: createMcpExecutor('findNode'), // CamelCase name
  }),
  createNode: tool({
      description: "Crée un nouveau nœud après avoir vérifié qu'un nœud similaire n'existe pas déjà.",
      parameters: createNodeToolSchema, // Nouveau schema
      execute: createMcpExecutor('createNode'), // CamelCase name
  }),

  // --- Advanced Graph Tools (from advanced-graph-tools.js) ---
  // Note: Parameters inside schemas are snake_case, but tool names are CamelCase
  getNeighborSummary: tool({
      description: "Récupère un résumé des propriétés spécifiques de nombreux nœuds voisins.",
      parameters: getNeighborSummaryToolSchema, // Updated schema (params renamed inside)
      execute: createMcpExecutor('getNeighborSummary'), // CamelCase name
  }),
  findPaths: tool({
      description: "Trouve les chemins entre deux nœuds.",
      parameters: findPathsToolSchema, // Updated schema (params renamed inside)
      execute: createMcpExecutor('findPaths'), // CamelCase name
  }),
  aggregateNeighborProperties: tool({
      description: "Calcule des agrégats sur les propriétés des nœuds voisins.",
      parameters: aggregateNeighborPropertiesToolSchema, // Updated schema (params renamed inside)
      execute: createMcpExecutor('aggregateNeighborProperties'), // CamelCase name
  }),
   findNodes: tool({ // Version conservée depuis advanced-graph-tools
       description: "Recherche des nœuds par label et/ou propriétés.",
       parameters: findNodesToolSchema, // Schema correspondant
       execute: createMcpExecutor('findNodes'), // CamelCase name
   }),
   getNodeDetails: tool({ // Version conservée depuis advanced-graph-tools
       description: "Récupère toutes les informations d'un nœud spécifique.",
       parameters: getNodeDetailsToolSchema, // Schema correspondant
       execute: createMcpExecutor('getNodeDetails'), // CamelCase name
   }),

  // --- Schema Tools (from schema-tools.js) ---
  // Note: Parameters inside schemas are snake_case, but tool names are CamelCase
  getSchemaCatalogue: tool({
      description: "Liste les éléments de schéma existants (tags, types de relation RELATED_TO, etc.) depuis le catalogue externe.",
      parameters: getSchemaCatalogueToolSchema, // Schema avec param snake_case
      execute: createMcpExecutor('getSchemaCatalogue'), // CamelCase name
  }),
  addSchemaElement: tool({
      description: "Ajoute un nouvel élément (tag ou type de relation RELATED_TO) au catalogue externe, avec sa description.",
      parameters: addSchemaElementToolSchema, // Schema avec params snake_case
      execute: createMcpExecutor('addSchemaElement'), // CamelCase name
  }),
};

// --- Route Handler POST (Logique interne inchangée) ---
export async function POST(req: Request) {
  try {
    console.log("\n--- [API Route] Received POST request ---");

    const { messages }: { messages: CoreMessage[] } = await req.json();
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }
    console.log(`[API Route] Processing ${messages.length} messages.`);

    const mcpClient = await getMcpClient();
    if (!mcpClient) {
      console.error("[API Route] MCP Client potentially unavailable at startup.");
    } else {
      console.log("[API Route] MCP client checked.");
    }

    console.log(`[API Route] Calling Google AI model '${GEMINI_MODEL_ID}'...`);
    const result = await streamText({
      model: google(GEMINI_MODEL_ID),
      system: SYSTEM_PROMPT,
      messages,
      tools: availableTools, // Utilise l'objet mis à jour

      onFinish: ({ finishReason, usage }) => {
          console.log(`[API Route] Stream finished. Reason: ${finishReason}`);
          console.log(`[API Route] Token Usage: Input=${usage.promptTokens}, Output=${usage.completionTokens}, Total=${usage.totalTokens}`);
      },
      onError: (error) => {
         console.error("[API Route] Error during streamText processing:", error);
      }
    });

    console.log("[API Route] Streaming response back to client...");
    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error(`[API Route Error - ${new Date().toISOString()}] Unhandled Error:`);
    console.error("  Message:", error.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error("  Stack:", error.stack);
    } else {
         console.error("  (Stack trace hidden in production)");
    }
    const detail = error.message.includes("MCP") || error.message.includes("Tool")
        ? error.message
        : "An internal server error occurred.";

    return NextResponse.json(
      { error: "An internal server error occurred.", details: detail },
      { status: 500, statusText: "Internal Server Error" }
    );
  }
}