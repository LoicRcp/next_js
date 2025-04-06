'use client';

import { useChat } from '@ai-sdk/react';
import { Attachment, UIMessage } from 'ai';
import { useState, useRef, useEffect, memo } from 'react';
import { Send, Loader2, PaperclipIcon, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatInterfaceProps {
  chatId?: string;
  initialMessages?: UIMessage[];
}

const ChatInterface = ({ chatId = 'knowledge-hub-chat', initialMessages = [] }: ChatInterfaceProps) => {
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    append, 
    status,
    stop 
  } = useChat({
    api: '/api/chat',
    id: chatId,
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    onFinish: () => {
      // Actions à effectuer après la réception complète d'un message
      console.log('Message completed');
    },
    onError: (error) => {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
      console.error('Chat error:', error);
    }
  });

  // Référence pour faire défiler vers le bas
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Faire défiler vers le bas lorsque de nouveaux messages arrivent
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Ajuster automatiquement la hauteur du textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Gestion du focus sur textarea
  useEffect(() => {
    if (textareaRef.current && status === 'ready') {
      textareaRef.current.focus();
    }
  }, [status]);

  // Gestion de la soumission via Ctrl+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center max-w-sm">
              <h3 className="text-lg font-medium mb-2">Bienvenue sur Knowledge Hub</h3>
              <p>Posez vos questions ou demandez de l'aide pour gérer vos connaissances.</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageComponent key={message.id} message={message} isLoading={status === 'streaming' && messages[messages.length - 1].id === message.id} />
          ))
        )}

        {/* Indicateur "Thinking..." quand en attente de réponse */}
        {status === 'submitted' && (
          <motion.div
            className="w-full max-w-3xl px-4"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
          >
            <Card className="p-4 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Réflexion en cours...</span>
            </Card>
          </motion.div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Formulaire d'entrée */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {attachments.length > 0 && (
            <div className="flex flex-row gap-2 mb-2 overflow-x-auto pb-2">
              {attachments.map((attachment) => (
                <div 
                  key={attachment.url} 
                  className="flex items-center gap-1 bg-muted p-1 rounded text-xs"
                >
                  <span>{attachment.name?.split('/').pop()}</span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4"
                    onClick={() => setAttachments(attachments.filter(a => a.url !== attachment.url))}
                  >
                    &times;
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                handleInputChange(e);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              className="resize-none min-h-[48px] max-h-[200px] pr-20 pl-10 py-3 rounded-xl"
              disabled={status === 'streaming' || status === 'submitted'}
            />

            {/* Bouton d'attachement */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-3"
              disabled={status !== 'ready'}
              onClick={() => {
                // TODO: Implémenter l'attachement de fichiers
                toast.info("La fonctionnalité d'attachement n'est pas encore implémentée");
              }}
            >
              <PaperclipIcon className="h-5 w-5 text-muted-foreground" />
            </Button>

            {/* Bouton d'envoi ou d'arrêt */}
            {status === 'submitted' || status === 'streaming' ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-3"
                onClick={() => stop()}
              >
                <Square className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Arrêter</span>
              </Button>
            ) : (
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-3"
                disabled={!input.trim()}
              >
                <Send className="h-5 w-5 text-primary" />
                <span className="sr-only">Envoyer</span>
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Appuyez sur <kbd className="px-1 py-0.5 rounded bg-muted">Ctrl</kbd>+<kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd> pour envoyer
          </div>
        </form>
      </div>
    </div>
  );
};

// Composant Message optimisé avec memo
interface MessageProps {
  message: UIMessage;
  isLoading: boolean;
}

const PureMessageComponent = ({ message, isLoading }: MessageProps) => {
  const isUser = message.role === 'user';

  return (
    <AnimatePresence>
      <motion.div
        className="w-full max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div 
          className={cn(
            "flex gap-3", 
            isUser && "flex-row-reverse"
          )}
        >
          {/* Avatar */}
          {!isUser && (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">IA</span>
            </div>
          )}
          
          {/* Contenu du message */}
          <div className={cn(
            "flex flex-col space-y-2 max-w-[80%]",
            isUser ? "items-end" : "items-start"
          )}>
            {message.parts?.map((part, index) => {
              if (part.type === 'text') {
                return (
                  <div 
                    key={`${message.id}-part-${index}`}
                    className={cn(
                      "px-4 py-2 rounded-xl",
                      isUser 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}
                  >
                    <MarkdownContent>
                      {part.text}
                    </MarkdownContent>
                  </div>
                );
              }
              
              if (part.type === 'tool-invocation') {
                const { toolInvocation } = part;
                
                return (
                  <div 
                    key={`${message.id}-tool-${index}`}
                    className="bg-muted/50 p-3 rounded-md border border-border"
                  >
                    <div className="text-xs font-medium mb-1 text-muted-foreground">
                      {toolInvocation.state === 'call' ? 'Utilisation de l\'outil:' : 'Résultat de l\'outil:'}
                      <span className="ml-1 font-mono">{toolInvocation.toolName}</span>
                    </div>
                    
                    <div className="text-sm bg-muted/70 p-2 rounded overflow-x-auto">
                      {toolInvocation.state === 'call' ? (
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(toolInvocation.args, null, 2)}
                        </pre>
                      ) : toolInvocation.state === 'result' ? (
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify((toolInvocation as any).result, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  </div>
                );
              }
              
              return null;
            })}
            
            {/* Indicateur de chargement */}
            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Génération en cours...</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Optimisation avec memo pour éviter les re-renders inutiles
const MessageComponent = memo(
  PureMessageComponent,
  (prevProps, nextProps) => {
    // Re-render uniquement si les données importantes changent
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (JSON.stringify(prevProps.message.parts) !== JSON.stringify(nextProps.message.parts)) return false;
    return true;
  }
);

// Composant pour le rendu Markdown optimisé
const MarkdownContent = memo(({ children }: { children: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Style pour les éléments de code
        code({node, className, children, ...props}) {
          return (
            <code
              className={cn(
                "font-mono text-sm p-2 rounded my-2 overflow-x-auto bg-muted"
              )}
              {...props}
            >
              {children}
            </code>
          );
        },
        // Styles pour les autres éléments
        p: ({children}) => <p className="mb-2">{children}</p>,
        ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
        ol: ({children}) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
        li: ({children}) => <li className="mb-1">{children}</li>,
        a: ({href, children}) => <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">{children}</a>,
        h1: ({children}) => <h1 className="text-xl font-bold my-2">{children}</h1>,
        h2: ({children}) => <h2 className="text-lg font-bold my-2">{children}</h2>,
        h3: ({children}) => <h3 className="text-base font-bold my-2">{children}</h3>,
        h4: ({children}) => <h4 className="text-sm font-bold my-2">{children}</h4>,
        blockquote: ({children}) => <blockquote className="border-l-2 pl-4 italic my-2 text-muted-foreground">{children}</blockquote>,
        hr: () => <hr className="my-4" />,
        table: ({children}) => <div className="overflow-x-auto my-4"><table className="border-collapse w-full">{children}</table></div>,
        thead: ({children}) => <thead className="bg-muted">{children}</thead>,
        tbody: ({children}) => <tbody>{children}</tbody>,
        tr: ({children}) => <tr>{children}</tr>,
        th: ({children}) => <th className="border border-border p-2 text-left">{children}</th>,
        td: ({children}) => <td className="border border-border p-2">{children}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}, (prevProps, nextProps) => prevProps.children === nextProps.children);

export default ChatInterface;
