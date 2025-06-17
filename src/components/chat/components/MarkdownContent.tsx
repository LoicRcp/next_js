'use client';

import { memo } from 'react';
import ReactMarkdown, { type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * Props pour le composant MarkdownContent
 */
interface MarkdownContentProps {
  children: string;
}

/**
 * Composant pour rendre le contenu Markdown avec un style personnalisé
 * 
 * Fournit un rendu Markdown optimisé pour l'interface de chat avec :
 * - Support des fonctionnalités GitHub Flavored Markdown (tables, etc.)
 * - Styles personnalisés pour code, liens, listes, etc.
 * - Thème sombre adapté
 * 
 * @param children - Le contenu Markdown à rendre
 */
export const MarkdownContent = memo(({ children }: MarkdownContentProps) => {
  /**
   * Composants personnalisés pour le rendu Markdown
   * Chaque élément HTML a son style adapté au thème de l'application
   */
  const components: Options['components'] = {
    // Rendu personnalisé pour les blocs de code et code inline
    code: ({ node, className, children, ...props }) => {
      // Vérifier si className existe et commence par 'language-' pour différencier block/inline
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
    
    // Liens avec style personnalisé
    a: ({ node, ...props }) => (
      <a 
        className="text-primary hover:underline" 
        target="_blank" 
        rel="noopener noreferrer" 
        {...props} 
      />
    ),
    
    // Éléments de structure avec espacement approprié
    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
    
    // Titres avec hiérarchie visuelle
    h1: ({ node, ...props }) => (
      <h1 className="text-xl font-semibold mt-4 mb-2 border-b pb-1" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-lg font-semibold mt-3 mb-1.5" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-base font-semibold mt-2 mb-1" {...props} />
    ),
    
    // Éléments spéciaux
    blockquote: ({ node, ...props }) => (
      <blockquote className="border-l-4 pl-4 italic my-2 text-muted-foreground" {...props} />
    ),
    hr: ({ node, ...props }) => <hr className="my-4 border-border" {...props} />,
    
    // Tableaux avec style responsive
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse border border-border" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => <thead className="bg-muted/50" {...props} />,
    tbody: ({ node, ...props }) => <tbody {...props} />,
    tr: ({ node, ...props }) => <tr className="border-b border-border" {...props} />,
    th: ({ node, ...props }) => (
      <th className="border border-border px-3 py-1.5 text-left font-medium" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="border border-border px-3 py-1.5" {...props} />
    ),
  };

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // Support des tables, strikethrough, etc.
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => prevProps.children === nextProps.children);

MarkdownContent.displayName = 'MarkdownContent';
