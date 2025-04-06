import { NextRequest, NextResponse } from 'next/server';
import { checkMCPStatus } from '@/lib/mcp/vercel-ai-mcp';

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
    
    console.log('Checking MCP status with Vercel AI SDK...');
    
    try {
      // Utiliser la fonction utilitaire pour vérifier le statut
      const result = await checkMCPStatus(includeDetails);
      
      console.log('MCP status check result:', JSON.stringify(result, null, 2));
      
      // Renvoyer le résultat
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Error in checkMCPStatus:', error);
      throw error;
    }
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
