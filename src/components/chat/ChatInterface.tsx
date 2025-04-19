'use client';

import { useChat, type Message as VercelAIMessage } from '@ai-sdk/react'; // Importer ToolInvocation
import {ToolInvocation} from "ai";
import { useState, useRef, useEffect, memo } from 'react';
import { Send, Loader2, PaperclipIcon, Square, Terminal, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import ReactMarkdown, { type Options } from 'react-markdown'; // Importer Options pour le typage
import remarkGfm from 'remark-gfm';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Interface pour les props, si nécessaire (ici chatId optionnel)
interface ChatInterfaceProps {
  chatId?: string;
  initialMessages?: VercelAIMessage[];
}

// Le composant principal de l'interface de chat
const ChatInterface = ({ chatId = 'knowledge-hub-chat', initialMessages = [] }: ChatInterfaceProps) => {
  // Utilisation du hook useChat du Vercel AI SDK
  const {
    messages,           // Tableau des messages de la conversation
    input,              // Valeur actuelle de l'input utilisateur
    handleInputChange,  // Gestionnaire pour les changements de l'input
    handleSubmit,       // Gestionnaire pour la soumission du formulaire
    append,             // Fonction pour ajouter un message manuellement (non utilisée ici)
    status,             // Statut actuel du chat ('idle', 'loading', 'error', 'submitting', 'streaming')
    stop,               // Fonction pour arrêter la génération en cours
    error,              // Objet d'erreur en cas de problème
    reload,             // Fonction pour relancer la dernière requête
    data,               // Données supplémentaires envoyées depuis le serveur (non utilisées ici)
    setData,            // Fonction pour mettre à jour les données supplémentaires
  } = useChat({
    api: '/api/chat', // Endpoint de l'API backend
    id: chatId,       // ID unique pour la conversation (utile pour la persistance)
    initialMessages,  // Messages initiaux à charger
    maxSteps: 10,     // Nombre maximum d'allers-retours LLM <-> Outil
    sendExtraMessageFields: true, // Envoyer id et createdAt au backend
    // Callback quand la réponse est terminée
    onFinish: (message) => {
      console.log('Message final reçu:', message);
    },
    // Callback en cas d'erreur
    onError: (error) => {
      toast.error(`Une erreur est survenue: ${error.message}`);
      console.error('Erreur du hook useChat:', error);
    }
  });

  // Référence pour faire défiler automatiquement vers le bas
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // État pour les pièces jointes (non implémenté dans ce snippet)
  const [attachments, setAttachments] = useState<File[]>([]);

  // Défilement automatique vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ajustement automatique de la hauteur du textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Réinitialiser la hauteur
      // +2 pour un petit padding visuel
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  // Ajuster la hauteur lors de la saisie
  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Mettre le focus sur le textarea quand le chat est prêt
  useEffect(() => {
    if (textareaRef.current && status === 'ready') {
      textareaRef.current.focus();
    }
  }, [status]);

  // Gestion de la soumission via Ctrl+Enter ou Cmd+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault(); // Empêcher le saut de ligne
      if (input.trim() || attachments.length > 0) {
        // Préparer les données pour la soumission (non implémenté pour les fichiers ici)
        const submitEvent = e as unknown as React.FormEvent<HTMLFormElement>;
        handleSubmit(submitEvent, {
           // TODO: Ajouter la logique pour envoyer les `attachments` si nécessaire
           // options: { body: { attachments: ... } }
        });
        // Réinitialiser les pièces jointes après soumission
        setAttachments([]);
      }
    }
  };

  // Gestionnaire de soumission principal
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     if (input.trim() || attachments.length > 0) {
        handleSubmit(e, {
           // TODO: Ajouter la logique pour envoyer les `attachments` si nécessaire
        });
        setAttachments([]);
     }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Zone d'affichage des messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
        {messages.length === 0 && status === 'ready' ? (
          // Message d'accueil si aucune conversation n'a commencé
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center max-w-sm p-4 rounded-lg bg-muted/50">
              <Bot className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="text-lg font-medium mb-2">Knowledge Hub Assistant</h3>
              <p className="text-sm">
                Comment puis-je vous aider à explorer ou gérer vos connaissances aujourd'hui ?
              </p>
            </div>
          </div>
        ) : (
          // Affichage des messages existants
          messages.map((message) => (
            <MessageComponent
              key={message.id}
              message={message}
              // Indique si le dernier message de l'assistant est en cours de génération
              isLoading={status === 'streaming' && message.role === 'assistant' && messages[messages.length - 1].id === message.id}
            />
          ))
        )}

        {/* Indicateur "Thinking..." quand l'IA réfléchit */}
        {status === 'submitted' && (
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
        )}

        {/* Élément vide pour forcer le défilement */}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Zone de saisie utilisateur */}
      <div className="border-t bg-background p-3 md:p-4">
        {/* Affichage de l'erreur */}
         {error && (
          <div className="mb-2 p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center justify-between">
            <span>Erreur: {error.message}</span>
            <Button variant="ghost" size="sm" onClick={() => reload()}>Réessayer</Button>
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
              rows={1} // Commence avec une seule ligne
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
            Appuyez sur <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted rounded border">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted rounded border">Enter</kbd> pour envoyer.
          </p>
        </form>
      </div>
    </div>
  );
};

// --- Composant pour afficher un message individuel ---
// Utilisation de React.memo pour optimiser le rendu

interface MessageComponentProps {
  message: VercelAIMessage;
  isLoading: boolean; // Indique si ce message (assistant) est en cours de chargement
}

const MessageComponent = memo(
  ({ message, isLoading }: MessageComponentProps) => {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const isData = message.role === 'data'; // Pourrait être utilisé pour des données structurées spécifiques

    // Ne pas afficher les messages 'system' ou 'tool' directement.
    // Le rôle 'tool' est traité via les 'parts' du message 'assistant' précédent.
    // Le rôle 'system' n'est jamais affiché.
    // Le type VercelAIMessage inclut 'tool', mais la logique ici est de ne pas l'afficher comme une bulle séparée.
    if (message.role === 'system') {
      return null; // Correction: Ne pas rendre ces rôles directement
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
                      "px-4 py-2 rounded-xl shadow-sm max-w-full", // Permet au texte de prendre toute la largeur dispo
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    )}
                  >
                    {/* Correction: Appliquer les classes Prose au div parent */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownContent>{part.text}</MarkdownContent>
                    </div>
                  </Card>
                );
              }

              // Affichage des appels d'outils
              if (part.type === 'tool-invocation') {
                // Cast en 'any' pour accéder à .error, car le type ToolInvocation standard ne le garantit pas toujours
                const toolInvocation = part.toolInvocation as ToolInvocation & { error?: any, result?: any };
                const isCompleted = toolInvocation.state === 'result';
                // Correction: Vérifier la présence de la propriété 'error'
                const hasError = toolInvocation.error !== undefined;

                return (
                  <Card
                    key={`${message.id}-tool-${index}`}
                    className={cn(
                      "p-3 rounded-lg border text-xs w-full", // Prend toute la largeur dispo
                      hasError ? "border-destructive bg-destructive/10" : "border-border bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1 font-medium text-muted-foreground">
                      <Terminal className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {/* Ajustement du texte selon l'état */}
                        {hasError ? "Erreur de l'outil" : isCompleted ? "Résultat de l'outil" : "Appel de l'outil"}:{' '}
                        <code className="font-mono bg-muted px-1 py-0.5 rounded">{toolInvocation.toolName}</code>
                      </span>
                      {/* Afficher le loader seulement si l'appel est en cours et sans erreur */}
                      {!isCompleted && !hasError && <Loader2 className="h-3 w-3 animate-spin" />}
                    </div>

                    {/* Affichage des arguments de l'appel */}
                    {toolInvocation.args && (
                      <div className="mt-1">
                        <p className="text-xs text-muted-foreground mb-0.5">Arguments :</p>
                        <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                          {/* Vérifier si args est une string avant JSON.parse */}
                          {typeof toolInvocation.args === 'string'
                            ? toolInvocation.args
                            : JSON.stringify(toolInvocation.args, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Affichage du résultat */}
                    {isCompleted && toolInvocation.result !== undefined && (
                       <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-0.5">Résultat :</p>
                        <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                           {typeof toolInvocation.result === 'string'
                             ? toolInvocation.result
                             : JSON.stringify(toolInvocation.result, null, 2)}
                        </pre>
                      </div>
                    )}

                     {/* Affichage de l'erreur */}
                    {hasError && (
                      <div className="mt-2">
                        <p className="text-xs text-destructive mb-0.5">Erreur :</p>
                        <pre className="text-xs bg-destructive/10 text-destructive-foreground p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                          {typeof toolInvocation.error === 'string'
                           ? toolInvocation.error
                           : JSON.stringify(toolInvocation.error, null, 2)}
                        </pre>
                      </div>
                    )}
                  </Card>
                );
              }

              // Gérer d'autres types de 'parts' si nécessaire (ex: 'file')
              return null;
            })}

            {/* Indicateur de chargement spécifique à ce message */}
            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 pt-1">
                <span className="animate-pulse">...</span>
              </div>
            )}
          </div>

           {/* Avatar pour l'utilisateur */}
          {isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border mt-1">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  },
  // Fonction de comparaison pour React.memo
  (prevProps, nextProps) => {
    // Re-render seulement si l'ID, le rôle, les parts ou l'état de chargement changent
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.role === nextProps.message.role &&
      JSON.stringify(prevProps.message.parts) === JSON.stringify(nextProps.message.parts) &&
      prevProps.isLoading === nextProps.isLoading
    );
  }
);
MessageComponent.displayName = 'MessageComponent'; // Pour le débogage React DevTools

// --- Composant pour afficher le contenu Markdown ---
// Utilisation de React.memo pour optimiser le rendu du Markdown
// Correction: Utiliser le type Options de react-markdown
const MarkdownContent = memo(({ children }: { children: string }) => {
  if (!children) return null;

  // Définir les composants personnalisés pour react-markdown
  const components: Options['components'] = {
    code({ node, className, children, ...props }) {
      // Correction: Vérifier si className existe et commence par 'language-' pour différencier block/inline
      const match = /language-(\w+)/.exec(className || '');
      const isBlock = !!match;

      return isBlock ? (
        <pre className="bg-muted p-3 rounded-md overflow-x-auto my-2 text-sm">
          <code className={cn(className, "text-foreground")} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-muted px-1 py-0.5 rounded-sm font-mono text-sm" {...props}>
          {children}
        </code>
      );
    },
    a: ({ node, ...props }) => <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
    h1: ({ node, ...props }) => <h1 className="text-xl font-semibold mt-4 mb-2 border-b pb-1" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mt-3 mb-1.5" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-2 mb-1" {...props} />,
    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 pl-4 italic my-2 text-muted-foreground" {...props} />,
    hr: ({ node, ...props }) => <hr className="my-4 border-border" {...props} />,
    table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse border border-border" {...props} /></div>,
    thead: ({ node, ...props }) => <thead className="bg-muted/50" {...props} />,
    tbody: ({ node, ...props }) => <tbody {...props} />,
    tr: ({ node, ...props }) => <tr className="border-b border-border" {...props} />,
    th: ({ node, ...props }) => <th className="border border-border px-3 py-1.5 text-left font-medium" {...props} />,
    td: ({ node, ...props }) => <td className="border border-border px-3 py-1.5" {...props} />,
  };

  return (
    // Correction: Appliquer les classes Prose au div parent
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // Supporte les tables, GFM, etc.
        components={components} // Passer les composants personnalisés
        // Ne pas passer className ici
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => prevProps.children === nextProps.children);
MarkdownContent.displayName = 'MarkdownContent';

export default ChatInterface;
