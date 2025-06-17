'use client';
import { useChat, type Message as VercelAIMessage } from '@ai-sdk/react';
import { toast } from 'sonner';
import { MessagesDisplay, ChatInput } from './components';
import { useEffect, useRef } from 'react';

/**
 * Props pour le composant ChatInterface
 */
interface ChatInterfaceProps {
  chatId?: string;
  initialMessages?: VercelAIMessage[];
}

/**
 * Composant principal de l'interface de chat du Knowledge Hub avec logging amélioré
 * 
 * Ce composant orchestre toute l'interface de chat et gère :
 * - La communication avec l'API backend via le Vercel AI SDK
 * - L'état global de la conversation
 * - La coordination entre l'affichage des messages et la saisie
 * 
 * L'architecture multi-agents est gérée côté backend, ce composant
 * se contente d'afficher les résultats de manière user-friendly.
 * 
 * @param chatId - ID unique pour la conversation (défaut: 'knowledge-hub-chat')
 * @param initialMessages - Messages initiaux à charger
 */
const ChatInterface = ({ 
  chatId = 'knowledge-hub-chat', 
  initialMessages = [] 
}: ChatInterfaceProps) => {
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  console.log(`\n==== [ChatInterface] Component Initialize ====`);
  console.log(`[ChatInterface] Session ID: ${sessionId.current}`);
  console.log(`[ChatInterface] Chat ID: ${chatId}`);
  console.log(`[ChatInterface] Initial messages: ${initialMessages.length}`);

  /**
   * Configuration du hook useChat du Vercel AI SDK avec logging amélioré
   * 
   * Ce hook gère automatiquement :
   * - L'envoi des messages à l'API
   * - La réception des réponses en streaming
   * - La gestion des erreurs
   * - L'état de la conversation
   */
  const {
    messages,           // Tableau des messages de la conversation
    input,              // Valeur actuelle de l'input utilisateur
    handleInputChange,  // Gestionnaire pour les changements de l'input
    handleSubmit,       // Gestionnaire pour la soumission du formulaire
    append,             // Fonction pour ajouter un message manuellement
    status,             // Statut actuel ('idle', 'loading', 'error', 'submitting', 'streaming')
    stop,               // Fonction pour arrêter la génération en cours
    error,              // Objet d'erreur en cas de problème
    reload,             // Fonction pour relancer la dernière requête
    data,               // Données supplémentaires du serveur
    setData,            // Fonction pour mettre à jour les données supplémentaires
  } = useChat({
    api: '/api/chat',           // Endpoint de l'API backend
    id: chatId,                 // ID unique pour la conversation
    initialMessages,            // Messages initiaux à charger
    maxSteps: 10,               // Nombre maximum d'allers-retours LLM <-> Outil
    sendExtraMessageFields: true, // Envoyer id et createdAt au backend
    
    // Callback avant l'envoi
    onRequest: (request) => {
      console.log(`\n==== [ChatInterface] Sending Request ====`);
      console.log(`[ChatInterface] Session: ${sessionId.current}`);
      console.log(`[ChatInterface] Timestamp: ${new Date().toISOString()}`);
      console.log(`[ChatInterface] Messages to send: ${request.body ? JSON.parse(request.body as any).messages?.length : 0}`);
      console.log(`[ChatInterface] Current status: ${status}`);
    },
    
    // Callback pendant le streaming
    onResponse: (response) => {
      console.log(`[ChatInterface] 🌊 Response received:`);
      console.log(`  - Status: ${response.status}`);
      console.log(`  - Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      console.log(`  - OK: ${response.ok}`);
      
      if (!response.ok) {
        console.error(`[ChatInterface] ❌ Response not OK: ${response.status} ${response.statusText}`);
      }
    },
    
    // Callback quand la réponse est terminée
    onFinish: (message, { usage, finishReason }) => {
      console.log(`[ChatInterface] ✅ Response finished:`);
      console.log(`  - Message length: ${message.content.length} chars`);
      console.log(`  - Role: ${message.role}`);
      console.log(`  - Finish reason: ${finishReason}`);
      if (usage) {
        console.log(`  - Token usage: ${JSON.stringify(usage)}`);
      }
      console.log(`  - Total messages now: ${messages.length + 1}`);
      
      // Toast de succès discret pour le développement
      if (process.env.NODE_ENV === 'development') {
        toast.success(`Réponse reçue (${message.content.length} chars)`, {
          duration: 2000,
          position: 'bottom-right'
        });
      }
    },
    
    // Callback en cas d'erreur avec logging détaillé
    onError: (error) => {
      console.error(`\n[ChatInterface] ❌ ERROR occurred:`);
      console.error(`  - Error type: ${error.name || 'Unknown'}`);
      console.error(`  - Error message: ${error.message}`);
      console.error(`  - Session: ${sessionId.current}`);
      console.error(`  - Current status: ${status}`);
      console.error(`  - Messages count: ${messages.length}`);
      
      if (error.stack) {
        console.error(`  - Stack trace:`, error.stack);
      }
      
      // Différencier les types d'erreurs pour des messages plus spécifiques
      let userMessage = `Une erreur est survenue: ${error.message}`;
      
      if (error.message.includes('fetch')) {
        userMessage = 'Erreur de connexion. Vérifiez votre connexion réseau.';
      } else if (error.message.includes('Rate limit')) {
        userMessage = 'Trop de requêtes. Veuillez patienter un moment.';
      } else if (error.message.includes('unavailable')) {
        userMessage = 'Service temporairement indisponible. Réessayez dans quelques instants.';
      }
      
      toast.error(userMessage, {
        duration: 5000,
        action: {
          label: 'Réessayer',
          onClick: () => {
            console.log(`[ChatInterface] User clicked retry button`);
            reload();
          }
        }
      });
    },
    
    // Callback pour le streaming des données
    experimental_onMessageStream: (message, { data }) => {
      console.log(`[ChatInterface] 📡 Message stream chunk:`);
      console.log(`  - Content length: ${message.content.length}`);
      console.log(`  - Has data: ${!!data}`);
      if (data && data.length > 0) {
        console.log(`  - Data items: ${data.length}`);
      }
    }
  });

  // Effect pour logger les changements de statut
  useEffect(() => {
    console.log(`[ChatInterface] Status changed to: ${status}`);
    
    // Logger des métriques utiles selon le statut
    switch (status) {
      case 'loading':
        console.log(`[ChatInterface] Loading started. Messages: ${messages.length}`);
        break;
      case 'streaming':
        console.log(`[ChatInterface] Streaming started. Last message: ${messages[messages.length - 1]?.content?.substring(0, 50)}...`);
        break;
      case 'idle':
        console.log(`[ChatInterface] Returned to idle. Total messages: ${messages.length}`);
        break;
      case 'error':
        console.log(`[ChatInterface] Error state. Error: ${error?.message}`);
        break;
    }
  }, [status, messages.length, error]);

  // Effect pour logger les changements de messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log(`[ChatInterface] Messages updated. Count: ${messages.length}`);
      console.log(`[ChatInterface] Last message: ${lastMessage.role} - "${lastMessage.content.substring(0, 100)}..."`);
    }
  }, [messages.length]);

  // Effect pour logger l'input utilisateur
  useEffect(() => {
    if (input.length > 0 && input.length % 50 === 0) {
      console.log(`[ChatInterface] User input length: ${input.length} chars`);
    }
  }, [input.length]);

  // Logger les données supplémentaires si elles existent
  useEffect(() => {
    if (data && data.length > 0) {
      console.log(`[ChatInterface] Additional data received: ${data.length} items`);
      console.log(`[ChatInterface] Data preview:`, data.slice(0, 2));
    }
  }, [data]);

  console.log(`[ChatInterface] Rendering with status: ${status}, messages: ${messages.length}`);

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Zone d'affichage des messages */}
      <MessagesDisplay 
        messages={messages} 
        status={status as 'ready' | 'submitted' | 'streaming' | 'error'} 
      />

      {/* Zone de saisie utilisateur */}
      <ChatInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={(e) => {
          console.log(`[ChatInterface] Form submitted. Input length: ${input.length}`);
          console.log(`[ChatInterface] Input preview: "${input.substring(0, 100)}..."`);
          handleSubmit(e);
        }}
        status={status as 'ready' | 'submitted' | 'streaming' | 'error'}
        stop={() => {
          console.log(`[ChatInterface] Stop button clicked. Current status: ${status}`);
          stop();
        }}
        error={error}
        reload={() => {
          console.log(`[ChatInterface] Reload button clicked. Messages: ${messages.length}`);
          reload();
        }}
      />
    </div>
  );
};

export default ChatInterface;
