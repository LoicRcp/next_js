/**
 * Route API pour le chat du Knowledge Hub avec logging amélioré
 * 
 * Cette route gère les conversations avec l'IA multi-agents :
 * - Reçoit les messages de l'utilisateur
 * - Délègue le traitement à l'orchestrateur
 * - Retourne les réponses en streaming ou JSON selon le contexte
 * - Gère les erreurs avec des codes appropriés
 */
import { KnowledgeHubOrchestrator } from '@/lib/orchestration/KnowledgeHubOrchestrator';
import { NextResponse } from 'next/server';
import type { CoreMessage, StreamTextResult } from 'ai';

/**
 * Instance unique de l'orchestrateur pour optimiser les performances
 * Configuration :
 * - Reasoning activé pour des réponses plus réfléchies
 * - Maximum 7 étapes pour éviter les boucles infinies
 * - Streaming par défaut pour une meilleure UX
 */
const orchestrator = new KnowledgeHubOrchestrator({
  enableReasoning: true,
  maxSteps: 7,
  streamByDefault: true
});

/**
 * Gestionnaire POST pour les requêtes de chat avec logging détaillé
 * 
 * @param req - Requête contenant les messages et optionnellement un chatId
 * @returns Réponse streaming ou JSON selon le type de traitement
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`\n==== [API Route] New Request: ${requestId} ====`);
  console.log(`[API Route] Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Extraction des données de la requête avec logging
    console.log(`[API Route] Parsing request body...`);
    const { messages, chatId }: { 
      messages: CoreMessage[], 
      chatId?: string 
    } = await req.json();
    
    console.log(`[API Route] Request parsed successfully:`);
    console.log(`  - Messages count: ${messages ? messages.length : 0}`);
    console.log(`  - Chat ID: ${chatId || 'anonymous'}`);
    
    // Validation des données d'entrée avec logging détaillé
    if (!messages || messages.length === 0) {
      console.error(`[API Route] ❌ Validation failed: No messages provided`);
      return NextResponse.json(
        { error: "No messages provided" }, 
        { status: 400 }
      );
    }
    
    // Log des messages pour debug
    console.log(`[API Route] Message details:`);
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg.role}: "${(msg.content as string).substring(0, 100)}..."`);
    });
    
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content as string;
    console.log(`[API Route] User query: "${userQuery.substring(0, 150)}..."`);
    
    console.log(`[API Route] Processing ${messages.length} messages for chat: ${chatId || 'anonymous'}`);
    console.log(`[API Route] Delegating to orchestrator...`);
    
    // Délégation du traitement à l'orchestrateur multi-agents
    const result = await orchestrator.processRequest(messages, chatId);
    
    const processingDuration = Date.now() - startTime;
    console.log(`[API Route] Orchestrator completed in ${processingDuration}ms`);
    
    // Gestion des réponses streaming (interaction temps réel)
    if (result && 'toDataStreamResponse' in result && typeof result.toDataStreamResponse === 'function') {
      console.log(`[API Route] 🌊 Returning streaming response (${processingDuration}ms)`);
      console.log(`[API Route] Stream type: ${typeof result}`);
      console.log(`==== [API Route] Request Complete (Stream): ${requestId} ====\n`);
      
      return (result as StreamTextResult<any, any>).toDataStreamResponse();
    }
    
    // Gestion des réponses générées (traitement complexe terminé)
    console.log(`[API Route] 📝 Returning generated response (${processingDuration}ms)`);
    console.log(`[API Route] Response details:`);
    console.log(`  - Text length: ${result.text ? result.text.length : 0} chars`);
    console.log(`  - Usage: ${JSON.stringify(result.usage || {})}`);
    console.log(`  - Has reasoning: ${!!result.reasoning}`);
    
    if (result.reasoning) {
      console.log(`  - Reasoning length: ${result.reasoning.length} chars`);
    }
    
    const response = {
      content: result.text,
      usage: result.usage,
      reasoning: result.reasoning
    };
    
    console.log(`==== [API Route] Request Complete (Generate): ${requestId} ====\n`);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`\n[API Route] ❌ ERROR after ${duration}ms in request ${requestId}:`);
    console.error(`[API Route] Error type: ${error.name || 'Unknown'}`);
    console.error(`[API Route] Error message: ${error.message}`);
    
    if (error.stack) {
      console.error(`[API Route] Error stack:`);
      console.error(error.stack);
    }
    
    // Gestion d'erreur améliorée avec plus de contexte
    let statusCode = 500;
    let errorResponse: any = {
      error: "An internal server error occurred.",
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message;
      errorResponse.errorType = error.name;
    }
    
    if (error.name === 'AI_RateLimitError') {
      statusCode = 429;
      errorResponse.error = "Rate limit exceeded. Please try again later.";
      console.error(`[API Route] Rate limit exceeded for request ${requestId}`);
    } else if (error.name === 'AI_APICallError') {
      statusCode = 503;
      errorResponse.error = "AI service temporarily unavailable.";
      console.error(`[API Route] AI API call failed for request ${requestId}`);
    } else if (error.message?.includes('Neo4j') || error.message?.includes('MCP')) {
      statusCode = 503;
      errorResponse.error = "Knowledge base temporarily unavailable.";
      console.error(`[API Route] Knowledge base error for request ${requestId}`);
    }
    
    console.log(`==== [API Route] Request Failed: ${requestId} (${duration}ms) ====\n`);
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
