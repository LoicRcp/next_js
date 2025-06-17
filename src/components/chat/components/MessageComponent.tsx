'use client';

import { memo } from 'react';
import { type Message as VercelAIMessage } from '@ai-sdk/react';
import { Bot, User, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './MarkdownContent';
import { ToolInvocationDisplay } from './ToolInvocationDisplay';

/**
 * Props pour le composant MessageComponent
 */
interface MessageComponentProps {
  message: VercelAIMessage;
  isLoading: boolean; // Indique si ce message (assistant) est en cours de chargement
}

/**
 * Composant pour afficher un message individuel dans le chat
 * 
 * Gère l'affichage des messages utilisateur, assistant et des invocations d'outils.
 * Utilise React.memo pour optimiser le rendu et éviter les re-renders inutiles.
 * 
 * @param message - Le message à afficher
 * @param isLoading - Indicateur de chargement pour les messages assistant
 */
export const MessageComponent = memo(
  ({ message, isLoading }: MessageComponentProps) => {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const isData = message.role === 'data';

    // Ne pas afficher les messages 'system' ou 'tool' directement.
    // Le rôle 'tool' est traité via les 'parts' du message 'assistant' précédent.
    // Le rôle 'system' n'est jamais affiché.
    if (message.role === 'system') {
      return null;
    }

    return (
      <AnimatePresence>
        <motion.div
          className={cn("flex gap-3 w-full", isUser ? "justify-end" : "justify-start")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          layout // Permet une animation fluide lors de l'ajout/suppression
        >
          {/* Avatar pour l'assistant */}
          {isAssistant && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mt-1">
              <Bot className="h-5 w-5 text-primary" />
            </div>
          )}

          {/* Conteneur du contenu du message */}
          <div className={cn(
            "flex flex-col space-y-2",
            isUser ? "items-end" : "items-start",
            "max-w-[85%] md:max-w-[75%]" // Limite la largeur max
          )}>
            {/* Itération sur les 'parts' du message */}
            {message.parts?.map((part, index) => {
              // Affichage du texte
              if (part.type === 'text') {
                // Ne pas afficher de bulle vide si le texte est vide (souvent le cas avant un tool_call)
                if (!part.text.trim()) return null;
                
                return (
                  <Card
                    key={`${message.id}-text-${index}`}
                    className={cn(
                      "px-4 py-2 rounded-xl shadow-sm max-w-full",
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    )}
                  >
                    <MarkdownContent>{part.text}</MarkdownContent>
                  </Card>
                );
              }

              // Affichage des invocations d'outils
              if (part.type === 'tool-call') {
                return (
                  <ToolInvocationDisplay
                    key={`${message.id}-tool-${index}`}
                    toolInvocation={part}
                  />
                );
              }

              return null;
            })}

            {/* Avatar pour l'utilisateur (à droite) */}
            {isUser && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center mt-1">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }
);

MessageComponent.displayName = 'MessageComponent';
