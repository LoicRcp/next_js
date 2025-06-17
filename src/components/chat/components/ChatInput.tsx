'use client';

import { useRef, useEffect, useState } from 'react';
import { Send, Loader2, PaperclipIcon, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

/**
 * Props pour le composant ChatInput
 */
interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>, options?: any) => void;
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  stop: () => void;
  error?: Error | null;
  reload: () => void;
}

/**
 * Composant pour la zone de saisie du chat
 * 
 * Gère :
 * - La saisie de texte avec redimensionnement automatique
 * - Les raccourcis clavier (Ctrl+Enter)
 * - Les boutons d'envoi/arrêt
 * - L'affichage des erreurs
 * - Les pièces jointes (fonctionnalité future)
 * 
 * @param props - Les props de configuration du composant
 */
export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  status,
  stop,
  error,
  reload
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  /**
   * Ajustement automatique de la hauteur du textarea
   */
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  // Ajuster la hauteur lors de la saisie
  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Focus automatique quand le chat est prêt
  useEffect(() => {
    if (textareaRef.current && status === 'ready') {
      textareaRef.current.focus();
    }
  }, [status]);

  /**
   * Gestion des raccourcis clavier
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (input.trim() || attachments.length > 0) {
        const submitEvent = e as unknown as React.FormEvent<HTMLFormElement>;
        handleSubmit(submitEvent);
        setAttachments([]);
      }
    }
  };

  /**
   * Gestionnaire de soumission principal
   */
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() || attachments.length > 0) {
      handleSubmit(e);
      setAttachments([]);
    }
  };

  return (
    <div className="border-t bg-background p-3 md:p-4">
      {/* Affichage de l'erreur */}
      {error && (
        <div className="mb-2 p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center justify-between">
          <span>Erreur: {error.message}</span>
          <Button variant="ghost" size="sm" onClick={reload}>
            Réessayer
          </Button>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="flex flex-col gap-2">
        {/* TODO: Zone pour afficher les pièces jointes sélectionnées */}
        {/* {attachments.length > 0 && (...)} */}

        <div className="relative flex items-center">
          {/* Bouton pour pièces jointes (fonctionnalité future) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
            disabled={status !== 'ready'}
            onClick={() => toast.info("L'ajout de pièces jointes n'est pas encore implémenté.")}
            aria-label="Ajouter une pièce jointe"
          >
            <PaperclipIcon className="h-5 w-5" />
          </Button>

          {/* Champ de saisie principal */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question ou entrez une information..."
            className="resize-none min-h-[48px] max-h-[250px] w-full rounded-xl border border-input bg-background py-3 pl-12 pr-16 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring"
            rows={1}
            disabled={status !== 'ready'}
            aria-label="Message à envoyer"
          />

          {/* Bouton d'envoi ou d'arrêt */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {status === 'streaming' || status === 'submitted' ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={stop}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Arrêter la génération"
              >
                <Square className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={!input.trim() && attachments.length === 0}
                className="text-primary disabled:text-muted-foreground"
                aria-label="Envoyer le message"
              >
                <Send className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Aide contextuelle pour la soumission */}
        <p className="text-xs text-muted-foreground text-center mt-1">
          Appuyez sur{' '}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted rounded border">
            Ctrl
          </kbd>
          +
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted rounded border">
            Enter
          </kbd>{' '}
          pour envoyer.
        </p>
      </form>
    </div>
  );
}