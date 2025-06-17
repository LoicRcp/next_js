"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Info } from 'lucide-react';

/**
 * Interface pour l'état du système retourné par l'API
 */
interface SystemStatusData {
  loading?: boolean;
  error?: string;
  result?: {
    status?: {
      neo4j?: {
        connected: boolean;
      };
    };
    content?: Array<{
      text: string;
    }>;
  };
}

/**
 * Composant SystemStatus - Affiche l'état de santé du système Knowledge Hub
 * 
 * Ce composant vérifie et affiche en temps réel :
 * - L'état de la connexion à la base de données Neo4j
 * - L'état du serveur MCP (Model Context Protocol)
 * - Les détails techniques du système
 * 
 * Fonctionnalités :
 * - Vérification automatique au chargement
 * - Bouton de rafraîchissement manuel
 * - Affichage des détails techniques
 * - Interface adaptive selon l'état (succès/erreur/chargement)
 */
export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusData>({ loading: true });
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Vérifie l'état du système en appelant l'API de ping MCP
   */
  const checkStatus = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/mcp-ping?details=true');
      const data = await response.json();
      setStatus({ ...data, loading: false });
    } catch (error: any) {
      console.error('Erreur lors de la vérification du statut système:', error);
      setStatus({ error: error.message, loading: false });
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Affiche les détails techniques du système dans une alerte
   */
  const showDetails = () => {
    const detailText = status.result?.content?.[0]?.text || 'Aucun détail disponible';
    alert(detailText);
  };

  // Vérification automatique de l'état au montage du composant
  useEffect(() => {
    checkStatus();
  }, []);

  // État de chargement
  if (status.loading) {
    return (
      <div className="rounded-lg border p-4 flex items-center gap-2 bg-muted/50">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        <span>Vérification de l'état du système...</span>
      </div>
    );
  }

  // État d'erreur
  if (status.error) {
    return (
      <div className="rounded-lg border p-4 bg-destructive/10 text-destructive flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <p className="font-medium">Erreur de connexion</p>
          <p className="text-sm">Impossible de contacter le serveur MCP</p>
        </div>
        <button 
          onClick={checkStatus} 
          className="ml-auto bg-background hover:bg-muted p-1.5 rounded transition-colors"
          aria-label="Rafraîchir l'état du système"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  // Déterminer l'état de santé global
  const isSystemHealthy = status.result?.status?.neo4j?.connected;

  // État normal avec statut
  return (
    <div className={`rounded-lg border p-4 transition-colors ${
      isSystemHealthy 
        ? 'bg-green-100 dark:bg-green-900/20' 
        : 'bg-amber-100 dark:bg-amber-900/20'
    }`}>
      <div className="flex items-center justify-between">
        {/* Informations de statut */}
        <div className="flex items-center gap-2">
          {isSystemHealthy ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="font-medium">
              {isSystemHealthy ? 'Système opérationnel' : 'Système en mode limité'}
            </p>
            <p className="text-sm text-muted-foreground">
              Neo4j: {isSystemHealthy ? 'Connecté' : 'Non connecté'}
            </p>
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div className="flex gap-2">
          <button 
            onClick={showDetails}
            className="bg-background hover:bg-muted p-1.5 rounded transition-colors"
            aria-label="Afficher les détails techniques"
          >
            <Info className="h-4 w-4" />
          </button>
          <button 
            onClick={checkStatus} 
            className="bg-background hover:bg-muted p-1.5 rounded transition-colors"
            aria-label="Rafraîchir l'état du système"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
