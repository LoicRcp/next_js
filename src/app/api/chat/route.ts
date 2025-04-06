import { StreamingTextResponse } from 'ai';
import { NextRequest } from 'next/server';

// Réponse placeholder - pour les tests uniquement
export async function POST(req: Request) {
  console.log('Chat API route called');
  
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;
    
    console.log('Messages received:', messages);
    console.log('Last message:', lastMessage);
    
    // Créer un flux de texte de placeholder
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const placeholderResponse = `Voici une réponse placeholder pour votre message: "${lastMessage}". 
        
J'agis comme si je connectais au serveur MCP et utilisais Claude, mais pour l'instant je suis juste une réponse codée en dur. Ceci est juste pour tester l'interface.`;
        
        // Simuler une réponse en streaming
        const chunks = placeholderResponse.split(' ');
        for (const chunk of chunks) {
          // Artificially slow down the stream
          await new Promise(resolve => setTimeout(resolve, 50));
          controller.enqueue(encoder.encode(chunk + ' '));
        }
        
        controller.close();
      }
    });
    
    // Renvoyer la réponse en streaming
    return new StreamingTextResponse(stream);
  } catch (error: any) {
    console.error('Error in chat API route:', error);
    
    // En cas d'erreur, renvoyer également un placeholder d'erreur
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`Désolé, une erreur s'est produite: ${error.message}`));
        controller.close();
      }
    });
    
    return new StreamingTextResponse(stream);
  }
}
