// Route API optimisée avec reasoning et patterns Vercel AI SDK
import { KnowledgeHubOrchestrator } from '@/lib/orchestration/KnowledgeHubOrchestrator';
import { NextResponse } from 'next/server';
import type { CoreMessage, StreamTextResult } from 'ai';

// Créer une instance unique de l'orchestrateur
const orchestrator = new KnowledgeHubOrchestrator({
  enableReasoning: true,
  maxSteps: 7,
  streamByDefault: true
});

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    console.log("\n=== [API Route] New request received ===");
    
    const { messages, chatId }: { 
      messages: CoreMessage[], 
      chatId?: string 
    } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" }, 
        { status: 400 }
      );
    }

    console.log(`[API Route] Processing ${messages.length} messages for chat: ${chatId || 'anonymous'}`);
    
    // Déléguer le traitement à l'orchestrateur optimisé
    const result = await orchestrator.processRequest(messages, chatId);
    
    // Si c'est un stream, le retourner directement
    if (result && 'toDataStreamResponse' in result && typeof result.toDataStreamResponse === 'function') {
      console.log(`[API Route] Streaming response (${Date.now() - startTime}ms)`);
      return (result as StreamTextResult<any, any>).toDataStreamResponse();
    }
    
    // Si c'est un generateText result, formater la réponse
    console.log(`[API Route] Returning generated response (${Date.now() - startTime}ms)`);
    return NextResponse.json({
      content: result.text,
      usage: result.usage,
      reasoning: result.reasoning
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[API Route Error] After ${duration}ms:`, error.message);
    
    // Gestion d'erreur améliorée
    if (error.name === 'AI_RateLimitError') {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
    
    if (error.name === 'AI_APICallError') {
      return NextResponse.json(
        { error: "AI service temporarily unavailable." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "An internal server error occurred.", 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}