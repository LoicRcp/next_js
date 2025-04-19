// lib/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// --- Configuration ---
const MCP_SERVER_BASE_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';
// S'assurer que l'URL est correctement formée pour SSEClientTransport
const MCP_SSE_ENDPOINT_URL = new URL(process.env.MCP_SERVER_ENDPOINT || `${MCP_SERVER_BASE_URL}/mcp-sse`);

let mcpClientInstance: Client | null = null;
let isConnecting = false;
let connectionPromise: Promise<Client | null> | null = null;

// Fonction interne pour établir la connexion
async function connectMcpClient(): Promise<Client | null> {
  // Si une instance existe et est supposée connectée (simplification ici), la retourner
  // Une vérification d'état plus robuste serait idéale si le SDK le permet
  if (mcpClientInstance) return mcpClientInstance;
  if (isConnecting && connectionPromise) return connectionPromise; // Empêcher les connexions parallèles

  isConnecting = true;
  console.log(`Attempting to initialize MCP connection to ${MCP_SSE_ENDPOINT_URL.href}...`);

  connectionPromise = (async (): Promise<Client | null> => {
    try {
      // Créer le transport SSE
      const transport = new SSEClientTransport(MCP_SSE_ENDPOINT_URL);
      // Créer le client MCP
      const client = new Client({ name: 'knowledgehub-nextjs-backend', version: '1.0.0' });

      // --- Suppression du handler onDisconnect ---

      // Tenter la connexion
      await client.connect(transport);
      console.log("MCP Client connected successfully via shared module.");
      mcpClientInstance = client; // Stocker l'instance connectée
      return mcpClientInstance;

    } catch (error: any) {
      console.error("Failed to connect MCP Client in shared module:", error.message);
      mcpClientInstance = null; // Assurer qu'elle est nulle en cas d'échec
      return null; // Retourner null pour indiquer l'échec
    } finally {
        isConnecting = false;
        connectionPromise = null; // Réinitialiser la promesse de connexion
    }
  })();

  return connectionPromise;
}

/**
 * Obtient l'instance partagée et connectée du client MCP.
 * Tente de se connecter si ce n'est pas déjà fait.
 * Lance une erreur si la connexion échoue.
 * @returns {Promise<Client>} L'instance du client MCP connectée.
 * @throws {Error} Si la connexion au serveur MCP ne peut pas être établie.
 */
export async function getMcpClient(): Promise<Client> {
  const client = await connectMcpClient();
  if (!client) {
    // Lancer une erreur claire si la connexion a échoué
    throw new Error("MCP Client is not available. Connection failed or not established.");
  }
  // Idéalement, vérifier ici si le client est toujours considéré comme connecté
  // if (!client.isConnected()) { ... } // Si une telle méthode existe
  return client;
}

/**
 * Ferme la connexion du client MCP partagé, si elle existe.
 * Doit être appelée lors de l'arrêt propre du serveur backend.
 * @returns {Promise<void>}
 */
export async function closeMcpClient(): Promise<void> {
  const clientToClose = mcpClientInstance; // Prendre référence avant de la nullifier
  if (clientToClose) {
    console.log("Closing shared MCP client connection...");
    mcpClientInstance = null; // Mettre à null immédiatement pour éviter réutilisation
    isConnecting = false; // Stopper toute tentative de connexion en cours
    connectionPromise = null;
    await clientToClose.close().catch((err: any) => {
      // Logguer l'erreur mais ne pas la relancer pour ne pas bloquer l'arrêt
      console.error("Error closing shared MCP client:", err.message)
    });
    console.log("Shared MCP client closed attempt finished.");
  } else {
     console.log("Shared MCP client was already null, no need to close.");
  }
}

// Gérer l'arrêt du processus (peut nécessiter ajustement selon déploiement)
// Note: Ceci est basique et pourrait ne pas être idéal pour tous les environnements
let isShuttingDown = false;
async function handleShutdownSignal() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\nReceived shutdown signal.');
    await closeMcpClient();
    process.exit(0);
}
process.on('SIGINT', handleShutdownSignal); // Ctrl+C
process.on('SIGTERM', handleShutdownSignal); // Signal d'arrêt standard