import { experimental_createMCPClient } from 'ai';
import { MCPClientWrapper } from './mcp-client';

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
 * 
 * NOTE: Cette fonction utilise actuellement l'ancienne approche MCPClientWrapper
 * car il y a des problèmes avec l'approche SSE du Vercel AI SDK pour cette opération.
 */
export async function checkMCPStatus(includeDetails = false) {
  console.log('Using legacy MCPClientWrapper for healthcheck');
  
  try {
    // Utilisation temporaire de l'ancien wrapper pour le healthcheck
    const mcpClient = new MCPClientWrapper();
    const result = await mcpClient.pingMCPServer(includeDetails);
    
    console.log('healthCheck result received');
    return result;
  } catch (error) {
    console.error('Error executing healthCheck:', error);
    throw error;
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
  // Utilisation temporaire de l'ancien wrapper pour listTools
  console.log('Using legacy MCPClientWrapper for listTools');
  
  try {
    const mcpClient = new MCPClientWrapper();
    return await mcpClient.listTools();
  } catch (error) {
    console.error('Error listing MCP tools:', error);
    throw error;
  }
}
