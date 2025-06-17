'use client';

import { memo } from 'react';
import { type ToolInvocation } from 'ai';
import { Terminal, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Props pour le composant ToolInvocationDisplay
 */
interface ToolInvocationDisplayProps {
  toolInvocation: ToolInvocation;
}

/**
 * Composant pour afficher les invocations d'outils de l'IA
 * 
 * Affiche les appels d'outils avec leur statut et résultat :
 * - Nom de l'outil appelé
 * - Arguments passés (formatés)
 * - Statut d'exécution (en cours, succès, erreur)
 * - Résultat ou message d'erreur
 * 
 * @param toolInvocation - L'invocation d'outil à afficher
 */
export const ToolInvocationDisplay = memo(({ toolInvocation }: ToolInvocationDisplayProps) => {
  /**
   * Détermine l'icône et le style basés sur l'état de l'invocation
   */
  const getStatusIcon = () => {
    if ('result' in toolInvocation) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if ('error' in toolInvocation) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />;
  };

  /**
   * Formate les arguments de l'outil pour un affichage lisible
   */
  const formatArguments = (args: any) => {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  };

  /**
   * Formate le résultat de l'outil
   */
  const formatResult = (result: any) => {
    if (typeof result === 'string') return result;
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  };

  return (
    <Card className="bg-slate-50 dark:bg-slate-900 border-l-4 border-l-blue-500 max-w-full">
      <CardContent className="p-3">
        {/* En-tête avec nom de l'outil et statut */}
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="h-4 w-4 text-blue-600" />
          <span className="font-mono text-sm font-medium">
            {toolInvocation.toolName}
          </span>
          {getStatusIcon()}
        </div>

        {/* Arguments de l'outil */}
        {toolInvocation.args && Object.keys(toolInvocation.args).length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-muted-foreground mb-1">Arguments :</div>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
              <code>{formatArguments(toolInvocation.args)}</code>
            </pre>
          </div>
        )}

        {/* Résultat ou erreur */}
        {'result' in toolInvocation && (
          <div>
            <div className="text-xs text-green-600 dark:text-green-400 mb-1">
              Résultat :
            </div>
            <pre className="bg-green-50 dark:bg-green-950 p-2 rounded text-xs overflow-x-auto border border-green-200 dark:border-green-800">
              <code className="text-green-800 dark:text-green-200">
                {formatResult(toolInvocation.result)}
              </code>
            </pre>
          </div>
        )}

        {'error' in toolInvocation && (
          <div>
            <div className="text-xs text-red-600 dark:text-red-400 mb-1">
              Erreur :
            </div>
            <pre className="bg-red-50 dark:bg-red-950 p-2 rounded text-xs overflow-x-auto border border-red-200 dark:border-red-800">
              <code className="text-red-800 dark:text-red-200">
                {toolInvocation.error}
              </code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ToolInvocationDisplay.displayName = 'ToolInvocationDisplay';
