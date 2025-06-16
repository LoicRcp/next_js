import type { CoreMessage } from 'ai';

/**
 * Middleware pour garantir qu'il n'y a jamais de messages vides
 * Corrige le problème "contents.parts must not be empty"
 */
export function ensureNonEmptyMessages(messages: CoreMessage[]): CoreMessage[] {
  return messages.map(message => {
    // Vérifier si le message est vide
    if (message.role === 'assistant' && (!message.content || message.content.trim() === '')) {
      console.warn('[Message Validator] Empty assistant message detected, adding default content');
      
      // Ajouter un contenu par défaut basé sur le contexte
      return {
        ...message,
        content: 'Je suis en train de traiter votre demande...'
      };
    }
    
    return message;
  });
}

/**
 * Valide et nettoie l'historique des messages
 */
export function validateMessageHistory(messages: CoreMessage[]): {
  valid: boolean;
  cleaned: CoreMessage[];
  errors: string[];
} {
  const errors: string[] = [];
  const cleaned: CoreMessage[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Vérifier la structure de base
    if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
      errors.push(`Message ${i}: Invalid role '${message.role}'`);
      continue;
    }
    
    // Vérifier le contenu
    if (typeof message.content !== 'string') {
      errors.push(`Message ${i}: Content must be a string`);
      continue;
    }
    
    // Nettoyer les messages vides de l'assistant
    if (message.role === 'assistant' && (!message.content || message.content.trim() === '')) {
      console.warn(`[Message Validator] Skipping empty assistant message at index ${i}`);
      continue; // Skip empty messages instead of adding them
    }
    
    cleaned.push(message);
  }
  
  return {
    valid: errors.length === 0,
    cleaned,
    errors
  };
}

/**
 * Extrait le dernier message utilisateur non vide
 */
export function getLastUserMessage(messages: CoreMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && messages[i].content) {
      return messages[i].content as string;
    }
  }
  return null;
}