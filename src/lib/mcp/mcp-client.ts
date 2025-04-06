/**
 * Client wrapper MCP pour Next.js
 * Permet à l'application frontend de communiquer avec le serveur MCP
 * 
 * @deprecated Depuis l'intégration du Vercel AI SDK 4.2, cette classe est considérée comme obsolète.
 * Utilisez plutôt `experimental_createMCPClient` du Vercel AI SDK pour une intégration MCP native.
 * 
 * Exemple de remplacement:
 * ```typescript
 * // Ancien code avec MCPClientWrapper
 * const mcpClient = new MCPClientWrapper();
 * const result = await mcpClient.pingMCPServer();
 * 
 * // Nouveau code avec Vercel AI SDK
 * const mcpClient = await experimental_createMCPClient({
 *   transport: { type: 'sse', url: process.env.MCP_SERVER_URL }
 * });
 * const mcpTools = await mcpClient.tools();
 * const result = await mcpTools.healthCheck({});
 * await mcpClient.close();
 * ```
 */
export class MCPClientWrapper {
  private mcpServerUrl: string;
  private requestId: number;

  /**
   * Initialise le client MCP
   * 
   * @deprecated Utilisez `experimental_createMCPClient` du Vercel AI SDK à la place.
   */
  constructor() {
    console.warn('MCPClientWrapper est déprécié. Utilisez experimental_createMCPClient du Vercel AI SDK à la place.');
    this.mcpServerUrl = process.env.MCP_SERVER_ENDPOINT || 'http://localhost:3001/mcp';
    this.requestId = 1;
  }

  /**
   * Génère un nouvel ID de requête
   * @returns {number} ID de requête unique
   * 
   * @deprecated Utilisez `experimental_createMCPClient` du Vercel AI SDK à la place.
   */
  private getNextRequestId(): number {
    return this.requestId++;
  }

  /**
   * Envoie une requête au serveur MCP
   * @param {Object} request - Requête JSON-RPC
   * @returns {Promise<Object>} Réponse du serveur
   * 
   * @deprecated Utilisez `experimental_createMCPClient` du Vercel AI SDK à la place.
   */
  async sendRequest(request: any): Promise<any> {
    try {
      const response = await fetch(this.mcpServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Erreur lors de la communication avec le serveur MCP:', error);
      throw error;
    }
  }

  /**
   * Vérifie l'état du serveur MCP et sa connexion à Neo4j
   * @param {boolean} includeDetails - Si true, inclut des informations détaillées
   * @returns {Promise<Object>} Statut du serveur
   * 
   * @deprecated Utilisez `experimental_createMCPClient` du Vercel AI SDK à la place.
   */
  async pingMCPServer(includeDetails = false): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'tools/call',
      params: {
        name: 'healthCheck',
        arguments: {
          includeDetails
        }
      }
    };

    return this.sendRequest(request);
  }

  /**
   * Appelle l'outil simpleChat du serveur MCP (à implémenter plus tard)
   * @param {string} prompt - Message de l'utilisateur
   * @param {Array} history - Historique de la conversation
   * @returns {Promise<Object>} Réponse de l'IA
   * 
   * @deprecated Utilisez `experimental_createMCPClient` du Vercel AI SDK à la place.
   */
  async callSimpleChat(prompt: string, history: any[]): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'tools/call',
      params: {
        name: 'simpleChat',
        arguments: {
          prompt,
          history
        }
      }
    };

    return this.sendRequest(request);
  }

  /**
   * Appelle l'outil queryGraph du serveur MCP (à implémenter plus tard)
   * @param {string} cypherQuery - Requête Cypher à exécuter
   * @param {Object} params - Paramètres de la requête
   * @returns {Promise<Object>} Résultats de la requête
   * 
   * @deprecated Utilisez `experimental_createMCPClient` du Vercel AI SDK à la place.
   */
  async queryGraph(cypherQuery: string, params: Record<string, any> = {}): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'tools/call',
      params: {
        name: 'queryGraph',
        arguments: {
          cypherQuery,
          params
        }
      }
    };

    return this.sendRequest(request);
  }

  /**
   * Appelle l'outil updateGraph du serveur MCP (à implémenter plus tard)
   * @param {string} cypherQuery - Requête Cypher à exécuter
   * @param {Object} params - Paramètres de la requête
   * @returns {Promise<Object>} Résultat de l'opération
   * 
   * @deprecated Utilisez `experimental_createMCPClient` du Vercel AI SDK à la place.
   */
  async updateGraph(cypherQuery: string, params: Record<string, any> = {}): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'tools/call',
      params: {
        name: 'updateGraph',
        arguments: {
          cypherQuery,
          params
        }
      }
    };

    return this.sendRequest(request);
  }

  /**
   * Liste tous les outils disponibles sur le serveur MCP
   * @returns {Promise<Object>} Liste des outils disponibles
   * 
   * @deprecated Utilisez `experimental_createMCPClient` du Vercel AI SDK à la place.
   */
  async listTools(): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'tools/list',
      params: {}
    };

    return this.sendRequest(request);
  }
}
