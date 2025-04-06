import { NextRequest, NextResponse } from 'next/server';
import { MCPClientWrapper } from '@/lib/mcp/mcp-client';

/**
 * API Route pour vérifier l'état du serveur MCP et sa connexion à Neo4j
 * GET /api/mcp-ping - version simple (statut)
 * GET /api/mcp-ping?details=true - version détaillée (statut + infos système)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier si on demande les détails
    const searchParams = request.nextUrl.searchParams;
    const includeDetails = searchParams.get('details') === 'true';
    
    // Créer le client MCP et appeler pingMCPServer
    const mcpClient = new MCPClientWrapper();
    const result = await mcpClient.pingMCPServer(includeDetails);
    
    // Renvoyer le résultat
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erreur lors du ping du serveur MCP:', error);
    
    // Renvoyer une erreur formatée
    return NextResponse.json(
      { 
        error: 'Impossible de contacter le serveur MCP', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}
