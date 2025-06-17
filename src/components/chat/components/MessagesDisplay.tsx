'use client';

import { useRef, useEffect } from 'react';
import { type Message as VercelAIMessage } from '@ai-sdk/react';
import { Bot, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { MessageComponent } from './MessageComponent';

/**
 * Props pour le composant MessagesDisplay
 */
interface MessagesDisplayProps {
  messages: VercelAIMessage[];
  status: 'ready' | 'submitted' | 'streaming' | 'error';
}

/**
 * Composant pour afficher la liste des messages du chat
 * 
 * Gère :
 * - L'affichage de tous les messages de la conversation
 * - Le message d'accueil quand aucune conversation n'a commencé
 * - L'indicateur de "réflexion" de l'IA
 * - Le défilement automatique vers le bas
 * 
 * @param messages - La liste des messages à afficher
 * @param status - Le statut actuel du chat
 */
export function MessagesDisplay({ messages, status }: MessagesDisplayProps) {
  // Référence pour faire défiler automatiquement vers le bas
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Défilement automatique vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
      {messages.length === 0 && status === 'ready' ? (
        // Message d'accueil si aucune conversation n'a commencé
        <WelcomeMessage />
      ) : (
        // Affichage des messages existants
        messages.map((message) => (
          <MessageComponent
            key={message.id}
            message={message}
            // Indique si le dernier message de l'assistant est en cours de génération
            isLoading={
              status === 'streaming' && 
              message.role === 'assistant' && 
              messages[messages.length - 1].id === message.id
            }
          />
        ))
      )}

      {/* Indicateur "Thinking..." quand l'IA réfléchit */}
      {status === 'submitted' && (
        <ThinkingIndicator />
      )}

      {/* Élément vide pour forcer le défilement */}
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}

/**
 * Composant pour le message d'accueil
 */
function WelcomeMessage() {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center max-w-sm p-4 rounded-lg bg-muted/50">
        <Bot className="h-10 w-10 mx-auto mb-3 text-primary" />
        <h3 className="text-lg font-medium mb-2">Knowledge Hub Assistant</h3>
        <p className="text-sm">
          Comment puis-je vous aider à explorer ou gérer vos connaissances aujourd'hui ?
        </p>
      </div>
    </div>
  );
}

/**
 * Composant pour l'indicateur de réflexion de l'IA
 */
function ThinkingIndicator() {
  return (
    <motion.div
      className="flex justify-start w-full max-w-3xl mx-auto px-4"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
    >
      <Card className="bg-muted p-3 inline-flex items-center gap-2 rounded-xl">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">L'assistant réfléchit...</span>
      </Card>
    </motion.div>
  );
}