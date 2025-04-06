import { experimental_createMCPClient } from 'ai';

/**
 * Utilitaires pour l'utilisation du Model Context Protocol (MCP) avec Vercel AI SDK
 * Ces fonctions remplacent l'ancien MCPClientWrapper par les fonctionnalités natives du SDK
 */

/**
 * Crée un client MCP avec le Vercel AI SDK
 * @returns Promesse résolvant le client MCP
 */
export async function createMCPClient() {
  console.log('Creating MCP client with URL:', process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp/sse');
  return experimental_createMCPClient({
    transport: {
      type: 'sse',
      url: process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp/sse',
      headers: {
        // Vous pouvez ajouter des headers d'authentification si nécessaire
      }
    },
  });
}

/**
 * Effectue un healthcheck du serveur MCP et de Neo4j
 * @param includeDetails Si true, inclut des informations détaillées sur l'état du système
 * @returns Statut du serveur et de Neo4j
 */
export async function checkMCPStatus(includeDetails = false) {
  console.log('Entering checkMCPStatus function');
  const mcpClient = await createMCPClient();
  
  try {
    console.log('Attempting to get tools from MCP client');
    const mcpTools = await mcpClient.tools();
    console.log('Successfully got tools:', Object.keys(mcpTools));
    
    // Vérifier si healthCheck existe
    if (!mcpTools.healthCheck) {
      console.log('No healthCheck tool found, returning fallback response');
      return {
        result: {
          content: [
            {
              type: 'text',
              text: 'Erreur: Outil healthCheck non disponible sur le serveur MCP.'
            }
          ],
          status: {
            mcp: {
              status: 'ERROR',
              timestamp: new Date().toISOString()
            },
            neo4j: {
              connected: false,
              error: 'Outil healthCheck non disponible'
            }
          },
          isError: true
        },
        jsonrpc: "2.0",
        id: Date.now()
      };
    }
    
    // @ts-ignore - Nous savons que l'outil healthCheck existe
    console.log('Calling healthCheck tool with includeDetails:', includeDetails);
    const result = await mcpTools.healthCheck({ includeDetails });
    console.log('healthCheck result:', JSON.stringify(result, null, 2));
    
    // Formater la réponse pour qu'elle corresponde à l'ancienne structure pour compatibilité
    const formattedResult = {
      result: result,
      jsonrpc: "2.0",
      id: Date.now()
    };
    
    return formattedResult;
  } catch (error) {
    console.error('Error executing healthCheck:', error);
    throw error;
  } finally {
    // S'assurer que le client est toujours fermé
    console.log('Closing MCP client');
    await mcpClient.close();
  }
}

/**
 * Exécute une requête Cypher en lecture sur Neo4j
 * Remplace l'ancien mcpClient.queryGraph
 * @param cypherQuery Requête Cypher à exécuter
 * @param params Paramètres de la requête
 * @returns Résultats de la requête
 */
export async function queryGraph(cypherQuery: string, params: Record<string, any> = {}) {
  const mcpClient = await createMCPClient();
  
  try {
    const mcpTools = await mcpClient.tools();
    
    // @ts-ignore - Nous savons que queryGraph sera implémenté
    const result = await mcpTools.queryGraph({ cypherQuery, params });
    
    return result;
  } finally {
    await mcpClient.close();
  }
}

/**
 * Exécute une requête Cypher en écriture sur Neo4j
 * Remplace l'ancien mcpClient.updateGraph
 * @param cypherQuery Requête Cypher à exécuter
 * @param params Paramètres de la requête
 * @returns Résultat de l'opération
 */
export async function updateGraph(cypherQuery: string, params: Record<string, any> = {}) {
  const mcpClient = await createMCPClient();
  
  try {
    const mcpTools = await mcpClient.tools();
    
    // @ts-ignore - Nous savons que updateGraph sera implémenté
    const result = await mcpTools.updateGraph({ cypherQuery, params });
    
    return result;
  } finally {
    await mcpClient.close();
  }
}

/**
 * Liste tous les outils disponibles sur le serveur MCP
 * @returns Liste des outils disponibles
 */
export async function listMCPTools() {
  const mcpClient = await createMCPClient();
  
  try {
    const mcpTools = await mcpClient.tools();
    
    // Transformer en format compatible avec l'ancienne API
    const toolsList = Object.keys(mcpTools).map(toolName => {
      return {
        name: toolName,
        // On pourrait éventuellement récupérer plus d'informations
        // mais ce n'est pas directement exposé par le SDK
      };
    });
    
    return {
      tools: toolsList
    };
  } finally {
    await mcpClient.close();
  }
}
